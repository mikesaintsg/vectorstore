/**
 * @mikesaintsg/adapters
 *
 * SSE (Server-Sent Events) parser for streaming LLM responses.
 * Shared across OpenAI, Anthropic, and Ollama providers.
 */

import type { SSEEvent, SSEParserInterface, SSEParserOptions } from '../types.js'

/**
 * Creates an SSE parser for processing Server-Sent Events streams.
 *
 * The parser is stateful and handles chunked data, maintaining a buffer
 * between `feed()` calls for events split across chunks.
 *
 * @param options - Parser configuration options
 * @returns An SSE parser interface
 * @remarks
 * Properties on `options`:
 * - `onEvent` — callback invoked for each parsed SSE event
 * - `onError` — optional callback for parse errors
 * - `onEnd` — optional callback when stream ends
 * @example
 * ```ts
 * const events: SSEEvent[] = []
 * const parser = createSSEParser({
 *   onEvent: (event) => events.push(event),
 *   onEnd: () => console.log('Stream ended'),
 * })
 *
 * parser.feed('data: {"text": "hello"}\n\n')
 * parser.end()
 * ```
 */
export function createSSEParser(options: SSEParserOptions): SSEParserInterface {
	const { onEvent, onError, onEnd } = options

	// Buffer for incomplete lines
	let buffer = ''

	// Current event being built
	let currentEvent: string | undefined = undefined
	let currentData: string[] = []
	let currentId: string | undefined = undefined
	let currentRetry: number | undefined = undefined

	/**
	 * Dispatch the current event if it has data.
	 */
	function dispatchEvent(): void {
		if (currentData.length === 0) {
			// No data, reset and skip
			resetCurrentEvent()
			return
		}

		const data = currentData.join('\n')

		// Skip [DONE] sentinel (OpenAI uses this to signal end of stream)
		if (data === '[DONE]') {
			resetCurrentEvent()
			return
		}

		// Build the event object, only including optional fields if they have values
		const event: SSEEvent = {
			data,
			...(currentEvent !== undefined ? { event: currentEvent } : {}),
			...(currentId !== undefined ? { id: currentId } : {}),
			...(currentRetry !== undefined ? { retry: currentRetry } : {}),
		}

		onEvent(event)
		resetCurrentEvent()
	}

	/**
	 * Reset current event state for building next event.
	 */
	function resetCurrentEvent(): void {
		currentEvent = undefined
		currentData = []
		currentId = undefined
		currentRetry = undefined
	}

	/**
	 * Process a single line from the SSE stream.
	 */
	function processLine(line: string): void {
		// Empty line signals end of event
		if (line === '') {
			dispatchEvent()
			return
		}

		// Comment lines start with colon
		if (line.startsWith(':')) {
			return
		}

		// Find the field name and value
		const colonIndex = line.indexOf(':')

		if (colonIndex === -1) {
			// No colon, treat entire line as field name with empty value
			// Per SSE spec: "If the line is not empty but does not contain a U+003A COLON character"
			return
		}

		const fieldName = line.slice(0, colonIndex)
		// Value is everything after the colon, with optional leading space removed
		let value = line.slice(colonIndex + 1)
		if (value.startsWith(' ')) {
			value = value.slice(1)
		}

		switch (fieldName) {
			case 'event':
				currentEvent = value
				break
			case 'data':
				currentData.push(value)
				break
			case 'id':
				// ID must not contain null character
				if (!value.includes('\0')) {
					currentId = value
				}
				break
			case 'retry': {
				const retryValue = parseInt(value, 10)
				if (!isNaN(retryValue) && retryValue >= 0) {
					currentRetry = retryValue
				}
				break
			}
			// Unknown fields are ignored per SSE spec
		}
	}

	/**
	 * Feed a chunk of data to the parser.
	 */
	function feed(chunk: string): void {
		try {
			buffer += chunk

			// Process complete lines
			while (true) {
				// Handle both \n and \r\n line endings
				const newlineIndex = buffer.indexOf('\n')
				if (newlineIndex === -1) {
					break
				}

				let line = buffer.slice(0, newlineIndex)
				buffer = buffer.slice(newlineIndex + 1)

				// Remove trailing \r if present (for \r\n line endings)
				if (line.endsWith('\r')) {
					line = line.slice(0, -1)
				}

				processLine(line)
			}
		} catch (error) {
			if (onError && error instanceof Error) {
				onError(error)
			}
		}
	}

	/**
	 * Signal end of stream.
	 */
	function end(): void {
		try {
			// Process any remaining data in buffer as final line
			if (buffer.length > 0) {
				const line = buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer
				buffer = ''
				processLine(line)
			}

			// Dispatch any pending event
			if (currentData.length > 0) {
				dispatchEvent()
			}

			onEnd?.()
		} catch (error) {
			if (onError && error instanceof Error) {
				onError(error)
			}
		}
	}

	/**
	 * Reset parser state for reuse.
	 */
	function reset(): void {
		buffer = ''
		resetCurrentEvent()
	}

	return {
		feed,
		end,
		reset,
	}
}
