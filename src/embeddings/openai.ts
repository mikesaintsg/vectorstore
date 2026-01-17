/**
 * @mikesaintsg/adapters
 *
 * OpenAI embedding adapter for generating text embeddings.
 */

import { CoreError } from '../errors.js'
import {
	OPENAI_DEFAULT_EMBEDDING_MODEL,
	OPENAI_DEFAULT_EMBEDDING_DIMENSIONS,
	OPENAI_API_BASE_URL,
} from '../constants.js'
import {
	AbortableOptions,
	Embedding,
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
	OpenAIEmbeddingAdapterOptions,
	OpenAIEmbeddingResponse
} from "@mikesaintsg/core";

/**
 * Create an OpenAI embedding adapter.
 *
 * @param options - OpenAI adapter configuration
 * @returns An embedding adapter for OpenAI
 *
 * @example
 * ```ts
 * const adapter = createOpenAIEmbeddingAdapter({
 *   apiKey: process.env.OPENAI_API_KEY,
 *   model: 'text-embedding-3-small',
 * })
 *
 * const embeddings = await adapter.embed(['Hello, world!'])
 * ```
 */
export function createOpenAIEmbeddingAdapter(
	options: OpenAIEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	const {
		apiKey,
		model = OPENAI_DEFAULT_EMBEDDING_MODEL,
		baseURL = OPENAI_API_BASE_URL,
		dimensions = OPENAI_DEFAULT_EMBEDDING_DIMENSIONS,
	} = options

	if (!apiKey) {
		throw new CoreError('ADAPTER_ERROR', 'OpenAI API key is required')
	}

	const metadata: EmbeddingModelMetadata = {
		provider: 'openai',
		model,
		dimensions,
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
					dimensions,
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
					`OpenAI API error (${response.status}): ${errorText}`,
				)
			}

			const data = await response.json() as OpenAIEmbeddingResponse

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
