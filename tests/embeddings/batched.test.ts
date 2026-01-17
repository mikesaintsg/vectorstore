/**
 * @mikesaintsg/adapters
 *
 * Tests for batched embedding adapter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createBatchedEmbeddingAdapter } from '@mikesaintsg/adapters'
import type { EmbeddingAdapterInterface, EmbeddingModelMetadata, Embedding } from '@mikesaintsg/core'

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
			// Return mock embeddings
			return texts.map((_, i) => new Float32Array([i * 0.1, i * 0.2, i * 0.3]))
		},
		getModelMetadata(): EmbeddingModelMetadata {
			return metadata
		},
	}
}

describe('Batched Embedding Adapter', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	describe('createBatchedEmbeddingAdapter', () => {
		it('implements EmbeddingAdapterInterface', () => {
			const mockAdapter = createMockAdapter()
			const adapter = createBatchedEmbeddingAdapter({
				adapter: mockAdapter,
			})

			expect(adapter.embed).toBeInstanceOf(Function)
			expect(adapter.getModelMetadata).toBeInstanceOf(Function)
		})

		it('passes through getModelMetadata', () => {
			const mockAdapter = createMockAdapter()
			const adapter = createBatchedEmbeddingAdapter({
				adapter: mockAdapter,
			})

			const metadata = adapter.getModelMetadata()
			expect(metadata.provider).toBe('mock')
			expect(metadata.model).toBe('mock-model')
		})

		it('returns empty array for empty input', async() => {
			const mockAdapter = createMockAdapter()
			const adapter = createBatchedEmbeddingAdapter({
				adapter: mockAdapter,
			})

			const result = await adapter.embed([])
			expect(result).toEqual([])
		})

		it('embeds single text', async() => {
			const embedSpy = vi.fn().mockResolvedValue([new Float32Array([0.1, 0.2, 0.3])])
			const mockAdapter = createMockAdapter(embedSpy)
			const adapter = createBatchedEmbeddingAdapter({
				adapter: mockAdapter,
				delayMs: 10,
			})

			const resultPromise = adapter.embed(['Hello'])

			// Advance timer to trigger flush
			await vi.advanceTimersByTimeAsync(20)

			const result = await resultPromise

			expect(result).toHaveLength(1)
			expect(result[0]).toBeInstanceOf(Float32Array)
			expect(embedSpy).toHaveBeenCalledTimes(1)
		})

		it('embeds multiple texts', async() => {
			const embedSpy = vi.fn().mockResolvedValue([
				new Float32Array([0.1, 0.2, 0.3]),
				new Float32Array([0.4, 0.5, 0.6]),
			])
			const mockAdapter = createMockAdapter(embedSpy)
			const adapter = createBatchedEmbeddingAdapter({
				adapter: mockAdapter,
				delayMs: 10,
			})

			const resultPromise = adapter.embed(['Hello', 'World'])

			await vi.advanceTimersByTimeAsync(20)

			const result = await resultPromise

			expect(result).toHaveLength(2)
		})

		it('batches concurrent calls together', async() => {
			const embedSpy = vi.fn().mockImplementation((texts: readonly string[]) =>
				Promise.resolve(texts.map((_, i) => new Float32Array([i * 0.1]))),
			)
			const mockAdapter = createMockAdapter(embedSpy)
			const adapter = createBatchedEmbeddingAdapter({
				adapter: mockAdapter,
				delayMs: 50,
			})

			// Make two concurrent calls
			const promise1 = adapter.embed(['Text1'])
			const promise2 = adapter.embed(['Text2'])

			// Advance timer to trigger flush
			await vi.advanceTimersByTimeAsync(60)

			const [result1, result2] = await Promise.all([promise1, promise2])

			expect(result1).toHaveLength(1)
			expect(result2).toHaveLength(1)
			// Should have been called only once with both texts
			expect(embedSpy).toHaveBeenCalledTimes(1)
			expect(embedSpy).toHaveBeenCalledWith(expect.arrayContaining(['Text1', 'Text2']))
		})

		it('deduplicates identical texts', async() => {
			const embedSpy = vi.fn().mockImplementation((texts: readonly string[]) =>
				Promise.resolve(texts.map(() => new Float32Array([0.1]))),
			)
			const mockAdapter = createMockAdapter(embedSpy)
			const adapter = createBatchedEmbeddingAdapter({
				adapter: mockAdapter,
				delayMs: 50,
				deduplicate: true,
			})

			// Request same text multiple times
			const promise1 = adapter.embed(['Same text'])
			const promise2 = adapter.embed(['Same text'])
			const promise3 = adapter.embed(['Same text'])

			await vi.advanceTimersByTimeAsync(60)

			const results = await Promise.all([promise1, promise2, promise3])

			// All should get embeddings
			expect(results[0]).toHaveLength(1)
			expect(results[1]).toHaveLength(1)
			expect(results[2]).toHaveLength(1)

			// Only one API call with one text
			expect(embedSpy).toHaveBeenCalledTimes(1)
			expect(embedSpy).toHaveBeenCalledWith(['Same text'])
		})

		it('flushes immediately when batch size is reached', async() => {
			const embedSpy = vi.fn().mockImplementation((texts: readonly string[]) =>
				Promise.resolve(texts.map(() => new Float32Array([0.1]))),
			)
			const mockAdapter = createMockAdapter(embedSpy)
			const adapter = createBatchedEmbeddingAdapter({
				adapter: mockAdapter,
				batchSize: 2,
				delayMs: 1000, // Long delay
			})

			// Request 2 texts (batch size)
			const promise1 = adapter.embed(['Text1'])
			const promise2 = adapter.embed(['Text2'])

			// Should flush immediately due to batch size
			await vi.advanceTimersByTimeAsync(10)

			const results = await Promise.all([promise1, promise2])

			expect(results[0]).toHaveLength(1)
			expect(results[1]).toHaveLength(1)
			expect(embedSpy).toHaveBeenCalledTimes(1)
		})

		it('propagates errors to all callers', async() => {
			const embedSpy = vi.fn().mockRejectedValue(new Error('API Error'))
			const mockAdapter = createMockAdapter(embedSpy)
			const adapter = createBatchedEmbeddingAdapter({
				adapter: mockAdapter,
				delayMs: 10,
			})

			// Capture the promises and add catch handlers to prevent unhandled rejections
			const promise1 = adapter.embed(['Text1']).catch((e: Error) => e)
			const promise2 = adapter.embed(['Text2']).catch((e: Error) => e)

			await vi.advanceTimersByTimeAsync(20)

			const [result1, result2] = await Promise.all([promise1, promise2])

			expect(result1).toBeInstanceOf(Error)
			expect((result1 as Error).message).toBe('API Error')
			expect(result2).toBeInstanceOf(Error)
			expect((result2 as Error).message).toBe('API Error')
		})

		it('handles mixed batches with unique and duplicate texts', async() => {
			const embedSpy = vi.fn().mockImplementation((texts: readonly string[]) =>
				Promise.resolve(texts.map((_, i) => new Float32Array([i * 0.1]))),
			)
			const mockAdapter = createMockAdapter(embedSpy)
			const adapter = createBatchedEmbeddingAdapter({
				adapter: mockAdapter,
				delayMs: 50,
				deduplicate: true,
			})

			// Mix of unique and duplicate
			const promise1 = adapter.embed(['Unique1'])
			const promise2 = adapter.embed(['Duplicate'])
			const promise3 = adapter.embed(['Unique2'])
			const promise4 = adapter.embed(['Duplicate'])

			await vi.advanceTimersByTimeAsync(60)

			const results = await Promise.all([promise1, promise2, promise3, promise4])

			// All should get embeddings
			expect(results.every(r => r.length === 1)).toBe(true)

			// Should only call with 3 unique texts
			expect(embedSpy).toHaveBeenCalledTimes(1)
			const calledTexts = embedSpy.mock.calls[0]?.[0] as string[]
			expect(new Set(calledTexts).size).toBe(3)
		})

		it('uses default batch size and delay', () => {
			const mockAdapter = createMockAdapter()
			const adapter = createBatchedEmbeddingAdapter({
				adapter: mockAdapter,
			})

			// Should create without error using defaults
			expect(adapter).toBeDefined()
		})
	})
})
