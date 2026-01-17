/**
 * @mikesaintsg/adapters
 *
 * Batched embedding adapter that wraps any embedding adapter with
 * automatic batching for improved throughput.
 */

import {
	EMBEDDING_BATCH_DEFAULT_MAX_SIZE,
	EMBEDDING_BATCH_DEFAULT_FLUSH_DELAY_MS,
} from '../constants.js'
import { computeContentHash } from '../helpers.js'
import type {
	AbortableOptions,
	Embedding,
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
} from '@mikesaintsg/core'
import type { BatchedEmbeddingAdapterOptions } from '../types.js'

/**
 * Pending embedding request in the queue.
 */
interface PendingRequest {
	readonly text: string
	readonly hash: string
	readonly resolve: (embedding: Embedding) => void
	readonly reject: (error: Error) => void
}

/**
 * Create a batched embedding adapter that wraps any embedding adapter.
 *
 * This adapter queues embedding requests and batches them together for
 * more efficient API usage. Duplicate texts within a batch are deduplicated.
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
 * // Multiple concurrent calls will be batched together
 * const [e1, e2] = await Promise.all([
 *   batched.embed(['Hello']),
 *   batched.embed(['World']),
 * ])
 * ```
 */
export function createBatchedEmbeddingAdapter(
	options: BatchedEmbeddingAdapterOptions,
): EmbeddingAdapterInterface {
	const {
		adapter,
		batchSize = EMBEDDING_BATCH_DEFAULT_MAX_SIZE,
		delayMs = EMBEDDING_BATCH_DEFAULT_FLUSH_DELAY_MS,
		deduplicate = true,
	} = options

	// Queue of pending requests
	const pendingQueue: PendingRequest[] = []

	// Flush timer
	let flushTimer: ReturnType<typeof setTimeout> | undefined

	/**
	 * Flush the pending queue and process all batched requests.
	 */
	async function flush(): Promise<void> {
		if (pendingQueue.length === 0) return

		// Clear timer
		if (flushTimer !== undefined) {
			clearTimeout(flushTimer)
			flushTimer = undefined
		}

		// Take all pending requests
		const requests = pendingQueue.splice(0, pendingQueue.length)

		// Build unique texts to embed (deduplicate)
		const uniqueTexts: string[] = []
		const hashToIndex = new Map<string, number>()

		if (deduplicate) {
			for (const request of requests) {
				if (!hashToIndex.has(request.hash)) {
					hashToIndex.set(request.hash, uniqueTexts.length)
					uniqueTexts.push(request.text)
				}
			}
		} else {
			for (const request of requests) {
				hashToIndex.set(`${uniqueTexts.length}-${request.hash}`, uniqueTexts.length)
				uniqueTexts.push(request.text)
			}
		}

		try {
			// Call underlying adapter with all unique texts
			const embeddings = await adapter.embed(uniqueTexts)

			// Resolve each pending request with its embedding
			for (const request of requests) {
				const key = deduplicate ? request.hash : `${requests.indexOf(request)}-${request.hash}`
				const index = hashToIndex.get(deduplicate ? request.hash : key)
				if (index !== undefined) {
					const embedding = embeddings[index]
					if (embedding !== undefined) {
						request.resolve(embedding)
					} else {
						request.reject(new Error('Embedding not found in response'))
					}
				}
			}
		} catch (error) {
			// Reject all pending requests with the error
			for (const request of requests) {
				request.reject(error instanceof Error ? error : new Error('Unknown error'))
			}
		}
	}

	/**
	 * Schedule a flush after the delay.
	 */
	function scheduleFlush(): void {
		flushTimer ??= setTimeout(() => {
			void flush()
		}, delayMs)
	}

	/**
	 * Queue a single text for embedding.
	 */
	async function queueSingle(text: string): Promise<Embedding> {
		const hash = await computeContentHash(text)

		return new Promise<Embedding>((resolve, reject) => {
			pendingQueue.push({ text, hash, resolve, reject })

			// Flush immediately if batch is full
			if (pendingQueue.length >= batchSize) {
				void flush()
			} else {
				scheduleFlush()
			}
		})
	}

	return {
		async embed(texts: readonly string[], _abortOptions?: AbortableOptions): Promise<readonly Embedding[]> {
			if (texts.length === 0) {
				return []
			}

			// Queue all texts and wait for their embeddings
			const promises = texts.map(text => queueSingle(text))
			return Promise.all(promises)
		},

		getModelMetadata(): EmbeddingModelMetadata {
			return adapter.getModelMetadata()
		},
	}
}
