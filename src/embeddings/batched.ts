/**
 * @mikesaintsg/adapters
 *
 * Batched embedding adapter that wraps any embedding adapter with
 * automatic batching for improved throughput.
 *
 * TODO: [Phase 3] Full implementation of batching logic
 */

import {
	EMBEDDING_BATCH_DEFAULT_MAX_SIZE,
	EMBEDDING_BATCH_DEFAULT_FLUSH_DELAY_MS,
} from '../constants.js'
import type {
	AbortableOptions,
	Embedding,
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
} from '@mikesaintsg/core'
import type { BatchedEmbeddingAdapterOptions } from '../types.js'

/**
 * Create a batched embedding adapter that wraps any embedding adapter.
 *
 * @param options - Batching configuration options
 * @returns An embedding adapter with batching support
 *
 * @example
 * ```ts
 * const baseAdapter = createOpenAIEmbeddingAdapter({ apiKey: '...' })
 *
 * const batched = createBatchedEmbeddingAdapter({
 *   adapter: baseAdapter,
 *   batchSize: 100,
 *   delayMs: 50,
 *   deduplicate: true,
 * })
 *
 * // Regular embed calls are passed through
 * const embeddings = await batched.embed(['text1', 'text2'])
 * ```
 */
export function createBatchedEmbeddingAdapter(
	options: BatchedEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	const {
		adapter,
		batchSize: _maxBatchSize = EMBEDDING_BATCH_DEFAULT_MAX_SIZE,
		delayMs: _flushDelayMs = EMBEDDING_BATCH_DEFAULT_FLUSH_DELAY_MS,
		deduplicate: _deduplicate = true,
	} = options

	// TODO: [Phase 3] Implement actual batching logic
	// For now, this is a passthrough wrapper

	return {
		async embed(texts: readonly string[], abortOptions?: AbortableOptions): Promise<readonly Embedding[]> {
			// TODO: [Phase 3] Implement batching with deduplication
			return adapter.embed(texts, abortOptions)
		},

		getModelMetadata(): EmbeddingModelMetadata {
			return adapter.getModelMetadata()
		},
	}
}
