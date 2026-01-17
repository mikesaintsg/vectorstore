/**
 * @mikesaintsg/adapters
 *
 * Tests for OpenAI embedding adapter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'

describe('OpenAI Embedding Adapter', () => {
	let originalFetch: typeof globalThis.fetch

	beforeEach(() => {
		originalFetch = globalThis.fetch
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		vi.restoreAllMocks()
	})

	describe('createOpenAIEmbeddingAdapter', () => {
		it('implements EmbeddingAdapterInterface', () => {
			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
			})

			expect(adapter.embed).toBeInstanceOf(Function)
			expect(adapter.getModelMetadata).toBeInstanceOf(Function)
		})

		it('returns correct model metadata with defaults', () => {
			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
			})

			const metadata = adapter.getModelMetadata()
			expect(metadata.provider).toBe('openai')
			expect(metadata.model).toBe('text-embedding-3-small')
			expect(metadata.dimensions).toBe(1536)
		})

		it('returns correct model metadata with custom model', () => {
			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
				model: 'text-embedding-3-large',
				dimensions: 3072,
			})

			const metadata = adapter.getModelMetadata()
			expect(metadata.model).toBe('text-embedding-3-large')
			expect(metadata.dimensions).toBe(3072)
		})

		it('throws error when API key is missing', () => {
			expect(() =>
				createOpenAIEmbeddingAdapter({
					apiKey: '',
				}),
			).toThrow('OpenAI API key is required')
		})

		it('returns empty array for empty input', async() => {
			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
			})

			const result = await adapter.embed([])
			expect(result).toEqual([])
		})

		it('makes correct API request', async() => {
			const mockResponse = {
				object: 'list',
				data: [
					{ index: 0, embedding: [0.1, 0.2, 0.3], object: 'embedding' },
				],
				model: 'text-embedding-3-small',
				usage: { prompt_tokens: 5, total_tokens: 5 },
			}

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			})

			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
				model: 'text-embedding-3-small',
				dimensions: 1536,
			})

			await adapter.embed(['Hello'])

			expect(globalThis.fetch).toHaveBeenCalledWith(
				'https://api.openai.com/v1/embeddings',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Authorization': 'Bearer test-key',
						'Content-Type': 'application/json',
					}),
					body: expect.stringContaining('"model":"text-embedding-3-small"'),
				}),
			)
		})

		it('parses successful response correctly', async() => {
			const mockResponse = {
				object: 'list',
				data: [
					{ index: 0, embedding: [0.1, 0.2, 0.3], object: 'embedding' },
					{ index: 1, embedding: [0.4, 0.5, 0.6], object: 'embedding' },
				],
				model: 'text-embedding-3-small',
				usage: { prompt_tokens: 10, total_tokens: 10 },
			}

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			})

			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
			})

			const result = await adapter.embed(['Hello', 'World'])

			expect(result).toHaveLength(2)
			expect(result[0]).toBeInstanceOf(Float32Array)
			expect(result[1]).toBeInstanceOf(Float32Array)
			// Float32Array has precision differences, check length instead
			expect(result[0]?.length).toBe(3)
			expect(result[1]?.length).toBe(3)
		})

		it('sorts embeddings by index', async() => {
			const mockResponse = {
				object: 'list',
				data: [
					{ index: 1, embedding: [0.4, 0.5, 0.6], object: 'embedding' },
					{ index: 0, embedding: [0.1, 0.2, 0.3], object: 'embedding' },
				],
				model: 'text-embedding-3-small',
				usage: { prompt_tokens: 10, total_tokens: 10 },
			}

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			})

			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
			})

			const result = await adapter.embed(['Hello', 'World'])

			// Should be sorted by index - check first value is from index 0
			expect(result[0]?.[0]).toBeCloseTo(0.1, 5)
			expect(result[1]?.[0]).toBeCloseTo(0.4, 5)
		})

		it('throws error on API error response', async() => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				text: () => Promise.resolve('Unauthorized'),
			})

			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'bad-key',
			})

			await expect(adapter.embed(['Hello'])).rejects.toThrow('OpenAI API error')
		})

		it('uses custom base URL', async() => {
			const mockResponse = {
				object: 'list',
				data: [{ index: 0, embedding: [0.1], object: 'embedding' }],
				model: 'text-embedding-3-small',
				usage: { prompt_tokens: 5, total_tokens: 5 },
			}

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			})

			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
				baseURL: 'https://custom.openai.com/v1',
			})

			await adapter.embed(['Hello'])

			expect(globalThis.fetch).toHaveBeenCalledWith(
				'https://custom.openai.com/v1/embeddings',
				expect.any(Object),
			)
		})

		it('passes abort signal to fetch', async() => {
			const mockResponse = {
				object: 'list',
				data: [{ index: 0, embedding: [0.1], object: 'embedding' }],
				model: 'text-embedding-3-small',
				usage: { prompt_tokens: 5, total_tokens: 5 },
			}

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			})

			const adapter = createOpenAIEmbeddingAdapter({
				apiKey: 'test-key',
			})

			const abortController = new AbortController()
			await adapter.embed(['Hello'], { signal: abortController.signal })

			expect(globalThis.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					signal: abortController.signal,
				}),
			)
		})
	})
})
