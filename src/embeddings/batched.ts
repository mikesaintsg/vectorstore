/**
 * @mikesaintsg/adapters
 *
 * Batched embedding adapter that wraps any embedding adapter with
 * automatic batching, deduplication, and caching.
 */

import { computeContentHash } from '../helpers.js'
import {
	EMBEDDING_BATCH_DEFAULT_MAX_SIZE,
	EMBEDDING_BATCH_DEFAULT_FLUSH_DELAY_MS,
} from '../constants.js'
import {
	AbortableOptions,
	BatchedEmbeddingAdapterInterface, ContentHash, Embedding,
	EmbeddingAdapterInterface,
	EmbeddingBatchOptions, EmbeddingCacheInterface, EmbeddingModelMetadata,
	PendingEmbeddingRequest
} from "@mikesaintsg/core";

/**
 * Create a batched embedding adapter that wraps any embedding adapter.
 *
 * @param adapter - The base embedding adapter to wrap
 * @param options - Batching configuration options
 * @returns A batched embedding adapter instance
 *
 * @example
 * ```ts
 * const baseAdapter = createOpenAIEmbeddingAdapter({ apiKey: '...' })
 * const cache = createEmbeddingCache({ maxEntries: 1000 })
 *
 * const batched = createBatchedEmbeddingAdapter(baseAdapter, {
 *   maxBatchSize: 100,
 *   flushDelayMs: 50,
 *   deduplicate: true,
 *   cache,
 * })
 *
 * // These will be batched together
 * const [e1, e2] = await Promise.all([
 *   batched.queue('text 1'),
 *   batched.queue('text 2'),
 * ])
 * ```
 */
export function createBatchedEmbeddingAdapter(
	adapter: EmbeddingAdapterInterface,
	options: EmbeddingBatchOptions = {},
): BatchedEmbeddingAdapterInterface {
	const {
		maxBatchSize = EMBEDDING_BATCH_DEFAULT_MAX_SIZE,
		flushDelayMs = EMBEDDING_BATCH_DEFAULT_FLUSH_DELAY_MS,
		deduplicate = true,
		cache,
	} = options

	const pendingRequests: PendingEmbeddingRequest[] = []
	let flushTimeout: ReturnType<typeof setTimeout> | undefined

	/** Schedule a flush after the delay */
	function scheduleFlush(): void {
		if (flushTimeout !== undefined) return

		flushTimeout = setTimeout(() => {
			flushTimeout = undefined
			void flushInternal()
		}, flushDelayMs)
	}

	/** Internal flush implementation */
	async function flushInternal(): Promise<void> {
		if (pendingRequests.length === 0) return

		// Take all current requests
		const requests = pendingRequests.splice(0, pendingRequests.length)

		// Group by unique content hash for deduplication
		const uniqueTexts: string[] = []
		const hashToRequests = new Map<ContentHash, PendingEmbeddingRequest[]>()

		for (const request of requests) {
			const existing = hashToRequests.get(request.contentHash)
			if (existing) {
				if (deduplicate) {
					existing.push(request)
				} else {
					uniqueTexts.push(request.text)
					hashToRequests.set(request.contentHash + '_' + uniqueTexts.length, [request])
				}
			} else {
				uniqueTexts.push(request.text)
				hashToRequests.set(request.contentHash, [request])
			}
		}

		// Check cache for already computed embeddings
		const textsToEmbed: string[] = []
		const hashesForEmbedding: ContentHash[] = []
		const cachedResults = new Map<ContentHash, Embedding>()

		for (const request of requests) {
			if (cachedResults.has(request.contentHash)) continue

			const cached = cache?.get(request.contentHash)
			if (cached) {
				cachedResults.set(request.contentHash, cached)
			} else if (!hashesForEmbedding.includes(request.contentHash)) {
				textsToEmbed.push(request.text)
				hashesForEmbedding.push(request.contentHash)
			}
		}

		try {
			// Call the base adapter for uncached texts
			let embeddings: readonly Embedding[] = []
			if (textsToEmbed.length > 0) {
				embeddings = await adapter.embed(textsToEmbed)

				// Cache the results
				for (let i = 0; i < embeddings.length; i++) {
					const hash = hashesForEmbedding[i]
					const embedding = embeddings[i]
					if (hash !== undefined && embedding !== undefined) {
						cache?.set(hash, embedding)
						cachedResults.set(hash, embedding)
					}
				}
			}

			// Resolve all pending requests
			for (const request of requests) {
				const embedding = cachedResults.get(request.contentHash)
				if (embedding) {
					request.resolve(embedding)
				} else {
					request.reject(new Error(`No embedding found for content hash: ${request.contentHash}`))
				}
			}
		} catch (error) {
			// Reject all pending requests on error
			for (const request of requests) {
				request.reject(error)
			}
		}
	}

	return {
		// Passthrough methods from base adapter
		async embed(texts: readonly string[], options?: AbortableOptions): Promise<readonly Embedding[]> {
			return adapter.embed(texts, options)
		},

		getModelMetadata(): EmbeddingModelMetadata {
			return adapter.getModelMetadata()
		},

		// Batched methods
		async queue(text: string, _options?: AbortableOptions): Promise<Embedding> {
			const contentHash = await computeContentHash(text)

			// Check cache first
			const cached = cache?.get(contentHash)
			if (cached) {
				return cached
			}

			return new Promise<Embedding>((resolve, reject) => {
				pendingRequests.push({
					text,
					contentHash,
					resolve,
					reject,
				})

				// Flush immediately if we hit max batch size
				if (pendingRequests.length >= maxBatchSize) {
					if (flushTimeout !== undefined) {
						clearTimeout(flushTimeout)
						flushTimeout = undefined
					}
					void flushInternal()
				} else {
					scheduleFlush()
				}
			})
		},

		async queueBatch(texts: readonly string[], options?: AbortableOptions): Promise<readonly Embedding[]> {
			const promises = texts.map(text => this.queue(text, options))
			return Promise.all(promises)
		},

		async flush(): Promise<void> {
			if (flushTimeout !== undefined) {
				clearTimeout(flushTimeout)
				flushTimeout = undefined
			}
			await flushInternal()
		},

		getPendingCount(): number {
			return pendingRequests.length
		},

		getCache(): EmbeddingCacheInterface | undefined {
			return cache
		},
	}
}
