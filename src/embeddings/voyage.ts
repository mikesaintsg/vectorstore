/**
 * @mikesaintsg/adapters
 *
 * Voyage AI embedding adapter for generating text embeddings.
 * Voyage AI is the recommended embedding provider for Anthropic users.
 */

import { AdapterError } from '../errors.js'
import { mapNetworkError } from '../helpers/error-mapping.js'
import {
	VOYAGE_DEFAULT_EMBEDDING_MODEL,
	VOYAGE_DEFAULT_EMBEDDING_DIMENSIONS,
	VOYAGE_API_BASE_URL,
} from '../constants.js'
import type {
	AbortableOptions,
	Embedding,
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
} from '@mikesaintsg/core'
import type { VoyageEmbeddingAdapterOptions, VoyageEmbeddingResponse } from '../types.js'

/**
 * Voyage model dimension mapping.
 */
const VOYAGE_MODEL_DIMENSIONS: Readonly<Record<string, number>> = {
	'voyage-3': 1024,
	'voyage-3-lite': 512,
	'voyage-code-3': 1024,
	'voyage-finance-2': 1024,
	'voyage-law-2': 1024,
	'voyage-multilingual-2': 1024,
	'voyage-2': VOYAGE_DEFAULT_EMBEDDING_DIMENSIONS,
	'voyage-code-2': 1536,
}

/**
 * Create a Voyage AI embedding adapter.
 *
 * Voyage AI provides state-of-the-art embeddings and is recommended by
 * Anthropic as the embedding solution for Claude users.
 *
 * @param options - Voyage adapter configuration
 * @returns An embedding adapter for Voyage AI
 *
 * @example
 * ```ts
 * const adapter = createVoyageEmbeddingAdapter({
 *   apiKey: process.env.VOYAGE_API_KEY,
 *   model: 'voyage-3',
 *   inputType: 'document', // or 'query' for search queries
 * })
 *
 * const embeddings = await adapter.embed(['Hello, world!'])
 * ```
 */
export function createVoyageEmbeddingAdapter(
	options: VoyageEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	const {
		apiKey,
		model = VOYAGE_DEFAULT_EMBEDDING_MODEL,
		baseURL = VOYAGE_API_BASE_URL,
		inputType,
	} = options

	if (!apiKey) {
		throw new AdapterError('AUTHENTICATION_ERROR', 'Voyage AI API key is required')
	}

	const dimensions = VOYAGE_MODEL_DIMENSIONS[model] ?? VOYAGE_DEFAULT_EMBEDDING_DIMENSIONS

	const metadata: EmbeddingModelMetadata = {
		provider: 'voyage',
		model,
		dimensions,
	}

	return {
		async embed(texts: readonly string[], abortOptions?: AbortableOptions): Promise<readonly Embedding[]> {
			if (texts.length === 0) {
				return []
			}

			const url = `${baseURL}/embeddings`

			const requestBody: Record<string, unknown> = {
				input: texts,
				model,
			}

			// Add input_type if specified (for retrieval optimization)
			if (inputType) {
				requestBody.input_type = inputType
			}

			const fetchOptions: RequestInit = {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
				},
				body: JSON.stringify(requestBody),
			}

			if (abortOptions?.signal) {
				fetchOptions.signal = abortOptions.signal
			}

			try {
				const response = await fetch(url, fetchOptions)

				if (!response.ok) {
					let errorBody: unknown = {}
					try {
						errorBody = await response.json()
					} catch {
						// Ignore JSON parse errors
					}

					// Extract error message from response
					const errorMessage = typeof errorBody === 'object' && errorBody !== null
						? (errorBody as { error?: { message?: string } }).error?.message
						: undefined

					// Map HTTP status to error code
					let errorCode: 'AUTHENTICATION_ERROR' | 'RATE_LIMIT_ERROR' | 'INVALID_REQUEST_ERROR' | 'SERVICE_ERROR' | 'UNKNOWN_ERROR'
					switch (response.status) {
						case 401:
						case 403:
							errorCode = 'AUTHENTICATION_ERROR'
							break
						case 429:
							errorCode = 'RATE_LIMIT_ERROR'
							break
						case 400:
							errorCode = 'INVALID_REQUEST_ERROR'
							break
						case 500:
						case 502:
						case 503:
							errorCode = 'SERVICE_ERROR'
							break
						default:
							errorCode = 'UNKNOWN_ERROR'
					}

					throw new AdapterError(
						errorCode,
						errorMessage ?? `Voyage API error: ${response.status}`,
						{
							context: { status: response.status },
						},
					)
				}

				const data = await response.json() as VoyageEmbeddingResponse

				// Sort by index to ensure correct order
				const sortedData = [...data.data].sort((a, b) => a.index - b.index)

				// Convert to Float32Array
				return sortedData.map(item => new Float32Array(item.embedding))
			} catch (error) {
				// Handle AbortError
				if (error instanceof Error && error.name === 'AbortError') {
					throw new AdapterError('TIMEOUT_ERROR', 'Request was aborted')
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
