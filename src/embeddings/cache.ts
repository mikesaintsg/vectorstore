/**
 * @mikesaintsg/adapters
 *
 * Cached embedding adapter that wraps any embedding adapter with
 * caching support to avoid redundant API calls.
 *
 * TODO: [Phase 3] Full implementation with TTL support
 */

import { computeContentHash } from '../helpers.js'
import type {
	AbortableOptions,
	Embedding,
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
} from '@mikesaintsg/core'
import type { CachedEmbeddingAdapterOptions, CachedEmbedding } from '../types.js'

/**
 * Create a cached embedding adapter that wraps any embedding adapter.
 *
 * @param options - Cache configuration options
 * @returns An embedding adapter with caching support
 *
 * @example
 * ```ts
 * const baseAdapter = createOpenAIEmbeddingAdapter({ apiKey: '...' })
 *
 * const cached = createCachedEmbeddingAdapter({
 *   adapter: baseAdapter,
 *   cache: new Map(),
 *   ttlMs: 60 * 60 * 1000, // 1 hour
 * })
 *
 * // Subsequent calls for the same text will use cache
 * const e1 = await cached.embed(['Hello'])
 * const e2 = await cached.embed(['Hello']) // Uses cache
 * ```
 */
export function createCachedEmbeddingAdapter(
	options: CachedEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	const {
		adapter,
		cache,
		ttlMs,
	} = options

	/**
	 * Check if a cached entry is still valid based on TTL.
	 */
	function isValid(entry: CachedEmbedding): boolean {
		if (ttlMs === undefined) return true
		return Date.now() - entry.cachedAt < ttlMs
	}

	return {
		async embed(texts: readonly string[], abortOptions?: AbortableOptions): Promise<readonly Embedding[]> {
			const results: Embedding[] = []
			const uncachedTexts: string[] = []
			const uncachedIndices: number[] = []

			// Check cache for each text
			for (let i = 0; i < texts.length; i++) {
				const text = texts[i]
				if (text === undefined) continue

				const hash = await computeContentHash(text)
				const cached = cache.get(hash)

				if (cached && isValid(cached)) {
					results[i] = cached.embedding
				} else {
					uncachedTexts.push(text)
					uncachedIndices.push(i)
				}
			}

			// Fetch uncached embeddings
			if (uncachedTexts.length > 0) {
				const embeddings = await adapter.embed(uncachedTexts, abortOptions)

				// Store in cache and results
				for (let j = 0; j < embeddings.length; j++) {
					const embedding = embeddings[j]
					const text = uncachedTexts[j]
					const index = uncachedIndices[j]

					if (embedding !== undefined && text !== undefined && index !== undefined) {
						const hash = await computeContentHash(text)
						cache.set(hash, { embedding, cachedAt: Date.now() })
						results[index] = embedding
					}
				}
			}

			return results
		},

		getModelMetadata(): EmbeddingModelMetadata {
			return adapter.getModelMetadata()
		},
	}
}
