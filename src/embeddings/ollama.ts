/**
 * @mikesaintsg/adapters
 *
 * Ollama embedding adapter for local development and testing.
 * Uses the Ollama API at localhost:11434 by default.
 */

import { AdapterError } from '../errors.js'
import { mapOllamaError, mapNetworkError } from '../helpers/error-mapping.js'
import {
	OLLAMA_API_BASE_URL,
	OLLAMA_DEFAULT_EMBEDDING_MODEL,
	OLLAMA_DEFAULT_TIMEOUT,
	OLLAMA_DEFAULT_EMBEDDING_DIMENSIONS,
} from '../constants.js'
import type {
	AbortableOptions,
	Embedding,
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
} from '@mikesaintsg/core'
import type { OllamaEmbeddingAdapterOptions, OllamaEmbeddingResponse } from '../types.js'

/**
 * Create an Ollama embedding adapter for local development.
 *
 * Ollama must be running locally (or at the specified baseURL) for this
 * adapter to work. Uses the `/api/embed` endpoint.
 *
 * @param options - Ollama adapter configuration
 * @returns An embedding adapter for Ollama
 *
 * @example
 * ```ts
 * const adapter = createOllamaEmbeddingAdapter({
 *   model: 'nomic-embed-text',
 * })
 *
 * const embeddings = await adapter.embed(['Hello, world!'])
 * ```
 */
export function createOllamaEmbeddingAdapter(
	options: OllamaEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	const {
		model = OLLAMA_DEFAULT_EMBEDDING_MODEL,
		baseURL = OLLAMA_API_BASE_URL,
		timeout = OLLAMA_DEFAULT_TIMEOUT,
	} = options

	const metadata: EmbeddingModelMetadata = {
		provider: 'ollama',
		model,
		dimensions: OLLAMA_DEFAULT_EMBEDDING_DIMENSIONS,
	}

	return {
		async embed(texts: readonly string[], abortOptions?: AbortableOptions): Promise<readonly Embedding[]> {
			if (texts.length === 0) {
				return []
			}

			const url = `${baseURL}/api/embed`

			// Create abort controller for timeout
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), timeout)

			// Merge external signal with timeout
			if (abortOptions?.signal) {
				abortOptions.signal.addEventListener('abort', () => controller.abort())
			}

			try {
				const response = await fetch(url, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						model,
						input: texts,
					}),
					signal: controller.signal,
				})

				clearTimeout(timeoutId)

				if (!response.ok) {
					let body: unknown = {}
					try {
						body = await response.json()
					} catch {
						// Ignore JSON parse errors
					}
					throw mapOllamaError(response, body)
				}

				const data = await response.json() as OllamaEmbeddingResponse

				// Convert to Float32Array
				return data.embeddings.map(embedding => new Float32Array(embedding))
			} catch (error) {
				clearTimeout(timeoutId)

				// Handle AbortError (timeout or user abort)
				if (error instanceof Error && error.name === 'AbortError') {
					throw new AdapterError('TIMEOUT_ERROR', 'Request timed out or was aborted')
				}

				// Handle network errors
				if (error instanceof TypeError) {
					throw mapNetworkError(error)
				}

				// Re-throw AdapterErrors
				if (error instanceof AdapterError) {
					throw error
				}

				// Wrap unknown errors
				throw new AdapterError(
					'UNKNOWN_ERROR',
					error instanceof Error ? error.message : 'Unknown error',
					undefined,
					error instanceof Error ? error : undefined,
				)
			}
		},

		getModelMetadata(): EmbeddingModelMetadata {
			return metadata
		},
	}
}
