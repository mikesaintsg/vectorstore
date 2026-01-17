/**
 * @mikesaintsg/adapters
 *
 * OpenAI tool format adapter.
 * Converts between internal tool representations and OpenAI's format.
 */

import {
	OpenAITool,
	OpenAIToolCall,
	OpenAIToolFormatAdapterOptions, ToolCall,
	ToolFormatAdapterInterface, ToolResult,
	ToolSchema
} from "@mikesaintsg/core";

/**
 * Create an OpenAI tool format adapter.
 *
 * @param options - Adapter options
 * @returns A tool format adapter for OpenAI
 *
 * @example
 * ```ts
 * const adapter = createOpenAIToolFormatAdapter({
 *   toolChoice: 'auto',
 * })
 *
 * const formatted = adapter.formatSchemas(schemas)
 * const calls = adapter.parseToolCalls(response)
 * ```
 */
export function createOpenAIToolFormatAdapter(
	_options: OpenAIToolFormatAdapterOptions = {},
): ToolFormatAdapterInterface {
	return {
		formatSchemas(schemas: readonly ToolSchema[]): readonly OpenAITool[] {
			return schemas.map(schema => ({
				type: 'function' as const,
				function: {
					name: schema.name,
					description: schema.description,
					parameters: schema.parameters,
				},
			}))
		},

		parseToolCalls(response: unknown): readonly ToolCall[] {
			if (!response || typeof response !== 'object') {
				return []
			}

			// Handle OpenAI response format
			const resp = response as {
				choices?: readonly {
					message?: {
						tool_calls?: readonly OpenAIToolCall[]
					}
				}[]
			}

			const toolCalls = resp.choices?.[0]?.message?.tool_calls
			if (!toolCalls || !Array.isArray(toolCalls)) {
				return []
			}

			const result: ToolCall[] = []

			for (const call of toolCalls as readonly OpenAIToolCall[]) {
				if (!call || typeof call !== 'object') continue
				if (!('id' in call) || !('function' in call)) continue

				const fn = call.function
				if (!fn || typeof fn !== 'object') continue
				if (!('name' in fn) || !('arguments' in fn)) continue

				let args: Record<string, unknown> = {}
				try {
					const parsed = JSON.parse(String(fn.arguments)) as unknown
					if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
						args = parsed as Record<string, unknown>
					}
				} catch {
					// Keep empty args on parse failure
				}

				result.push({
					id: String(call.id),
					name: String(fn.name),
					arguments: args,
				})
			}

			return result
		},

		formatResult(result: ToolResult): unknown {
			return {
				tool_call_id: result.callId,
				role: 'tool',
				content: result.success
					? JSON.stringify(result.value)
					: JSON.stringify({ error: result.error }),
			}
		},
	}
}
