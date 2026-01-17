/**
 * @mikesaintsg/adapters
 *
 * Anthropic embedding adapter for generating text embeddings.
 * Note: Anthropic does not currently offer a public embedding API.
 * This adapter uses Voyage AI (recommended by Anthropic) as the backend.
 */

import { CoreError } from '../errors.js'
import {
	VOYAGE_DEFAULT_EMBEDDING_MODEL,
	VOYAGE_DEFAULT_EMBEDDING_DIMENSIONS,
	VOYAGE_API_BASE_URL,
} from '../constants.js'
import {
	AbortableOptions,
	AnthropicEmbeddingAdapterOptions, Embedding,
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata, VoyageEmbeddingResponse
} from "@mikesaintsg/core";

/**
 * Create an Anthropic-compatible embedding adapter.
 *
 * Note: Anthropic recommends Voyage AI for embeddings, so this adapter
 * uses the Voyage AI API. The apiKey should be a Voyage AI API key.
 *
 * @param options - Adapter configuration
 * @returns An embedding adapter for Anthropic/Voyage
 *
 * @example
 * ```ts
 * const adapter = createAnthropicEmbeddingAdapter({
 *   apiKey: process.env.VOYAGE_API_KEY,
 *   model: 'voyage-2',
 * })
 *
 * const embeddings = await adapter.embed(['Hello, world!'])
 * ```
 */
export function createAnthropicEmbeddingAdapter(
	options: AnthropicEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	const {
		apiKey,
		model = VOYAGE_DEFAULT_EMBEDDING_MODEL,
		baseURL = VOYAGE_API_BASE_URL,
	} = options

	if (!apiKey) {
		throw new CoreError('ADAPTER_ERROR', 'Voyage AI API key is required')
	}

	const metadata: EmbeddingModelMetadata = {
		provider: 'anthropic',
		model,
		dimensions: VOYAGE_DEFAULT_EMBEDDING_DIMENSIONS,
	}

	return {
		async embed(texts: readonly string[], options?: AbortableOptions): Promise<readonly Embedding[]> {
			if (texts.length === 0) {
				return []
			}

			const url = `${baseURL}/embeddings`

			const fetchOptions: RequestInit = {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					input: texts,
					model,
				}),
			}

			if (options?.signal) {
				fetchOptions.signal = options.signal
			}

			const response = await fetch(url, fetchOptions)

			if (!response.ok) {
				const errorText = await response.text().catch(() => 'Unknown error')
				throw new CoreError(
					'ADAPTER_ERROR',
					`Voyage AI API error (${response.status}): ${errorText}`,
				)
			}

			const data = await response.json() as VoyageEmbeddingResponse

			// Sort by index to ensure correct order
			const sortedData = [...data.data].sort((a, b) => a.index - b.index)

			// Convert to Float32Array
			return sortedData.map(item => new Float32Array(item.embedding))
		},

		getModelMetadata(): EmbeddingModelMetadata {
			return metadata
		},
	}
}
