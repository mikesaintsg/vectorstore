/**
 * @mikesaintsg/adapters
 *
 * In-memory embedding cache with LRU eviction and TTL support.
 */

import { estimateEmbeddingBytes } from '../helpers.js'
import { EMBEDDING_CACHE_DEFAULT_MAX_ENTRIES } from '../constants.js'
import {
	ContentHash,
	Embedding,
	EmbeddingCacheInterface,
	EmbeddingCacheOptions,
	EmbeddingCacheStats,
	LRUCacheEntry
} from "@mikesaintsg/core";

/**
 * Create an in-memory embedding cache with LRU eviction.
 *
 * @param options - Cache configuration options
 * @returns An embedding cache instance
 *
 * @example
 * ```ts
 * const cache = createEmbeddingCache({
 *   maxEntries: 1000,
 *   ttlMs: 60 * 60 * 1000, // 1 hour
 * })
 *
 * cache.set('hash123', embedding)
 * const cached = cache.get('hash123')
 * ```
 */
export function createEmbeddingCache(
	options: EmbeddingCacheOptions = {},
): EmbeddingCacheInterface {
	const {
		maxEntries = EMBEDDING_CACHE_DEFAULT_MAX_ENTRIES,
		maxBytes,
		ttlMs,
		onEvict,
	} = options

	const cache = new Map<ContentHash, LRUCacheEntry>()
	let hits = 0
	let misses = 0

	/** Get total estimated bytes */
	function getTotalBytes(): number {
		let total = 0
		for (const entry of cache.values()) {
			total += estimateEmbeddingBytes(entry.embedding)
		}
		return total
	}

	/** Check if entry is expired */
	function isExpired(entry: LRUCacheEntry): boolean {
		if (ttlMs === undefined) return false
		return Date.now() - entry.createdAt > ttlMs
	}

	/** Evict oldest entries until under limits */
	function evictIfNeeded(): void {
		// Evict by max entries
		while (cache.size > maxEntries) {
			evictLRU()
		}

		// Evict by max bytes
		if (maxBytes !== undefined) {
			while (getTotalBytes() > maxBytes && cache.size > 0) {
				evictLRU()
			}
		}
	}

	/** Evict least recently used entry */
	function evictLRU(): void {
		let oldestKey: ContentHash | undefined
		let oldestAccess = Infinity

		for (const [key, entry] of cache.entries()) {
			if (entry.lastAccess < oldestAccess) {
				oldestAccess = entry.lastAccess
				oldestKey = key
			}
		}

		if (oldestKey !== undefined) {
			const entry = cache.get(oldestKey)
			cache.delete(oldestKey)
			if (entry && onEvict) {
				onEvict(oldestKey, entry.embedding)
			}
		}
	}

	return {
		get(contentHash: ContentHash): Embedding | undefined {
			const entry = cache.get(contentHash)

			if (!entry) {
				misses++
				return undefined
			}

			if (isExpired(entry)) {
				cache.delete(contentHash)
				if (onEvict) {
					onEvict(contentHash, entry.embedding)
				}
				misses++
				return undefined
			}

			entry.hitCount++
			entry.lastAccess = Date.now()
			hits++
			return entry.embedding
		},

		set(contentHash: ContentHash, embedding: Embedding): void {
			const now = Date.now()

			cache.set(contentHash, {
				embedding,
				createdAt: now,
				hitCount: 0,
				lastAccess: now,
			})

			evictIfNeeded()
		},

		has(contentHash: ContentHash): boolean {
			const entry = cache.get(contentHash)
			if (!entry) return false
			if (isExpired(entry)) {
				cache.delete(contentHash)
				if (onEvict) {
					onEvict(contentHash, entry.embedding)
				}
				return false
			}
			return true
		},

		remove(contentHash: ContentHash): boolean {
			const entry = cache.get(contentHash)
			if (entry && onEvict) {
				onEvict(contentHash, entry.embedding)
			}
			return cache.delete(contentHash)
		},

		clear(): void {
			if (onEvict) {
				for (const [key, entry] of cache.entries()) {
					onEvict(key, entry.embedding)
				}
			}
			cache.clear()
			hits = 0
			misses = 0
		},

		getStats(): EmbeddingCacheStats {
			const entries = cache.size
			const total = hits + misses
			return {
				entries,
				hits,
				misses,
				hitRate: total > 0 ? hits / total : 0,
				estimatedBytes: getTotalBytes(),
			}
		},
	}
}
