/**
 * @mikesaintsg/vectorstore
 *
 * Factory functions for creating vectorstore instances.
 */

import type { EmbeddingAdapterInterface } from '@mikesaintsg/core'

import type {
	VectorStoreOptions,
	VectorStoreInterface,
} from './types.js'

import { VectorStore } from './core/VectorStore.js'

/**
 * Create a new VectorStore instance.
 *
 * @param embedding - Required embedding adapter (first parameter)
 * @param options - Optional adapters and configuration (all opt-in)
 * @returns A VectorStore instance
 *
 * @example
 * ```ts
 * import { createVectorStore } from '@mikesaintsg/vectorstore'
 * import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'
 *
 * const embedding = createOpenAIEmbeddingAdapter({
 *   apiKey: process.env.OPENAI_API_KEY,
 *   model: 'text-embedding-3-small',
 * })
 *
 * // Minimal: just the required adapter
 * const store = await createVectorStore(embedding)
 *
 * // With persistence (opt-in)
 * const store = await createVectorStore(embedding, {
 *   persistence: createIndexedDBVectorPersistenceAdapter({ database }),
 * })
 * ```
 */
export function createVectorStore(
	embedding: EmbeddingAdapterInterface,
	options?: VectorStoreOptions,
): Promise<VectorStoreInterface> {
	return Promise.resolve(new VectorStore(embedding, options))
}
