/**
 * @mikesaintsg/adapters
 *
 * Tests for cached embedding adapter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCachedEmbeddingAdapter } from '@mikesaintsg/adapters'
import type { EmbeddingAdapterInterface, EmbeddingModelMetadata, Embedding } from '@mikesaintsg/core'
import type { CachedEmbedding } from '@mikesaintsg/adapters'

/**
 * Create a mock embedding adapter for testing.
 */
function createMockAdapter(embedFn?: (texts: readonly string[]) => Promise<readonly Embedding[]>): EmbeddingAdapterInterface {
	const metadata: EmbeddingModelMetadata = {
		provider: 'mock',
		model: 'mock-model',
		dimensions: 3,
	}

	return {
		async embed(texts: readonly string[]): Promise<readonly Embedding[]> {
			if (embedFn) {
				return embedFn(texts)
			}
			return texts.map((_, i) => new Float32Array([i * 0.1, i * 0.2, i * 0.3]))
		},
		getModelMetadata(): EmbeddingModelMetadata {
			return metadata
		},
	}
}

describe('Cached Embedding Adapter', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	describe('createCachedEmbeddingAdapter', () => {
		it('implements EmbeddingAdapterInterface', () => {
			const mockAdapter = createMockAdapter()
			const adapter = createCachedEmbeddingAdapter({
				adapter: mockAdapter,
				cache: new Map(),
			})

			expect(adapter.embed).toBeInstanceOf(Function)
			expect(adapter.getModelMetadata).toBeInstanceOf(Function)
		})

		it('passes through getModelMetadata', () => {
			const mockAdapter = createMockAdapter()
			const adapter = createCachedEmbeddingAdapter({
				adapter: mockAdapter,
				cache: new Map(),
			})

			const metadata = adapter.getModelMetadata()
			expect(metadata.provider).toBe('mock')
			expect(metadata.model).toBe('mock-model')
		})

		it('returns empty array for empty input', async() => {
			const mockAdapter = createMockAdapter()
			const adapter = createCachedEmbeddingAdapter({
				adapter: mockAdapter,
				cache: new Map(),
			})

			const result = await adapter.embed([])
			expect(result).toEqual([])
		})

		it('caches embeddings on first call', async() => {
			const embedSpy = vi.fn().mockResolvedValue([new Float32Array([0.1, 0.2, 0.3])])
			const mockAdapter = createMockAdapter(embedSpy)
			const cache = new Map<string, CachedEmbedding>()

			const adapter = createCachedEmbeddingAdapter({
				adapter: mockAdapter,
				cache,
			})

			await adapter.embed(['Hello'])

			expect(embedSpy).toHaveBeenCalledTimes(1)
			expect(cache.size).toBe(1)
		})

		it('returns cached embeddings on subsequent calls', async() => {
			const embedSpy = vi.fn().mockResolvedValue([new Float32Array([0.1, 0.2, 0.3])])
			const mockAdapter = createMockAdapter(embedSpy)
			const cache = new Map<string, CachedEmbedding>()

			const adapter = createCachedEmbeddingAdapter({
				adapter: mockAdapter,
				cache,
			})

			// First call
			await adapter.embed(['Hello'])
			expect(embedSpy).toHaveBeenCalledTimes(1)

			// Second call - should use cache
			await adapter.embed(['Hello'])
			expect(embedSpy).toHaveBeenCalledTimes(1)
		})

		it('handles cache miss correctly', async() => {
			const embedSpy = vi.fn()
				.mockResolvedValueOnce([new Float32Array([0.1, 0.2, 0.3])])
				.mockResolvedValueOnce([new Float32Array([0.4, 0.5, 0.6])])
			const mockAdapter = createMockAdapter(embedSpy)
			const cache = new Map<string, CachedEmbedding>()

			const adapter = createCachedEmbeddingAdapter({
				adapter: mockAdapter,
				cache,
			})

			await adapter.embed(['Hello'])
			await adapter.embed(['World'])

			expect(embedSpy).toHaveBeenCalledTimes(2)
			expect(cache.size).toBe(2)
		})

		it('handles partial cache hits', async() => {
			const embedSpy = vi.fn()
				.mockResolvedValueOnce([new Float32Array([0.1])])
				.mockResolvedValueOnce([new Float32Array([0.2])])
			const mockAdapter = createMockAdapter(embedSpy)
			const cache = new Map<string, CachedEmbedding>()

			const adapter = createCachedEmbeddingAdapter({
				adapter: mockAdapter,
				cache,
			})

			// Cache "Hello"
			await adapter.embed(['Hello'])
			expect(embedSpy).toHaveBeenCalledTimes(1)

			// Request both "Hello" (cached) and "World" (not cached)
			const result = await adapter.embed(['Hello', 'World'])

			expect(result).toHaveLength(2)
			// Should only call API for "World"
			expect(embedSpy).toHaveBeenCalledTimes(2)
			expect(embedSpy).toHaveBeenLastCalledWith(['World'])
		})

		it('respects TTL for cache expiration', async() => {
			const embedSpy = vi.fn().mockResolvedValue([new Float32Array([0.1, 0.2, 0.3])])
			const mockAdapter = createMockAdapter(embedSpy)
			const cache = new Map<string, CachedEmbedding>()

			const adapter = createCachedEmbeddingAdapter({
				adapter: mockAdapter,
				cache,
				ttlMs: 1000, // 1 second TTL
			})

			// First call
			await adapter.embed(['Hello'])
			expect(embedSpy).toHaveBeenCalledTimes(1)

			// Second call within TTL - should use cache
			vi.advanceTimersByTime(500)
			await adapter.embed(['Hello'])
			expect(embedSpy).toHaveBeenCalledTimes(1)

			// Third call after TTL - should call API again
			vi.advanceTimersByTime(600)
			await adapter.embed(['Hello'])
			expect(embedSpy).toHaveBeenCalledTimes(2)
		})

		it('caches without TTL when not specified', async() => {
			const embedSpy = vi.fn().mockResolvedValue([new Float32Array([0.1, 0.2, 0.3])])
			const mockAdapter = createMockAdapter(embedSpy)
			const cache = new Map<string, CachedEmbedding>()

			const adapter = createCachedEmbeddingAdapter({
				adapter: mockAdapter,
				cache,
				// No TTL specified
			})

			await adapter.embed(['Hello'])
			expect(embedSpy).toHaveBeenCalledTimes(1)

			// Even after a long time, cache should still be valid
			vi.advanceTimersByTime(365 * 24 * 60 * 60 * 1000) // 1 year
			await adapter.embed(['Hello'])
			expect(embedSpy).toHaveBeenCalledTimes(1)
		})

		it('maintains correct order of results', async() => {
			const embedSpy = vi.fn()
				.mockResolvedValueOnce([new Float32Array([0.1])])
				.mockResolvedValueOnce([new Float32Array([0.3])])
			const mockAdapter = createMockAdapter(embedSpy)
			const cache = new Map<string, CachedEmbedding>()

			const adapter = createCachedEmbeddingAdapter({
				adapter: mockAdapter,
				cache,
			})

			// Cache first text
			await adapter.embed(['Text1'])

			// Request in different order: cached, uncached
			const result = await adapter.embed(['Text1', 'Text2'])

			expect(result).toHaveLength(2)
			// First result should be cached, second should be new
			expect(result[0]?.[0]).toBeCloseTo(0.1, 5)
			expect(result[1]?.[0]).toBeCloseTo(0.3, 5)
		})

		it('uses external cache interface', async() => {
			const embedSpy = vi.fn().mockResolvedValue([new Float32Array([0.1, 0.2, 0.3])])
			const mockAdapter = createMockAdapter(embedSpy)

			// Custom cache with get/set/has
			const customCache = {
				store: new Map<string, CachedEmbedding>(),
				get(key: string) { return this.store.get(key) },
				set(key: string, value: CachedEmbedding) { this.store.set(key, value) },
				has(key: string) { return this.store.has(key) },
			}

			const adapter = createCachedEmbeddingAdapter({
				adapter: mockAdapter,
				cache: customCache.store,
			})

			await adapter.embed(['Hello'])
			expect(customCache.store.size).toBe(1)

			await adapter.embed(['Hello'])
			expect(embedSpy).toHaveBeenCalledTimes(1)
		})

		it('handles multiple texts in single call', async() => {
			const embedSpy = vi.fn().mockResolvedValue([
				new Float32Array([0.1]),
				new Float32Array([0.2]),
				new Float32Array([0.3]),
			])
			const mockAdapter = createMockAdapter(embedSpy)
			const cache = new Map<string, CachedEmbedding>()

			const adapter = createCachedEmbeddingAdapter({
				adapter: mockAdapter,
				cache,
			})

			const result = await adapter.embed(['A', 'B', 'C'])

			expect(result).toHaveLength(3)
			expect(cache.size).toBe(3)
			expect(embedSpy).toHaveBeenCalledTimes(1)
		})
	})
})
