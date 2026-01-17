/**
 * @mikesaintsg/adapters
 *
 * Tests for Voyage embedding adapter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createVoyageEmbeddingAdapter } from '@mikesaintsg/adapters'

describe('Voyage Embedding Adapter', () => {
	let originalFetch: typeof globalThis.fetch

	beforeEach(() => {
		originalFetch = globalThis.fetch
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		vi.restoreAllMocks()
	})

	describe('createVoyageEmbeddingAdapter', () => {
		it('implements EmbeddingAdapterInterface', () => {
			const adapter = createVoyageEmbeddingAdapter({
				apiKey: 'test-key',
			})

			expect(adapter.embed).toBeInstanceOf(Function)
			expect(adapter.getModelMetadata).toBeInstanceOf(Function)
		})

		it('returns correct model metadata with defaults', () => {
			const adapter = createVoyageEmbeddingAdapter({
				apiKey: 'test-key',
			})

			const metadata = adapter.getModelMetadata()
			expect(metadata.provider).toBe('voyage')
			expect(metadata.model).toBe('voyage-2')
			expect(metadata.dimensions).toBe(1024)
		})

		it('returns correct model metadata for voyage-3', () => {
			const adapter = createVoyageEmbeddingAdapter({
				apiKey: 'test-key',
				model: 'voyage-3',
			})

			const metadata = adapter.getModelMetadata()
			expect(metadata.model).toBe('voyage-3')
			expect(metadata.dimensions).toBe(1024)
		})

		it('returns correct model metadata for voyage-3-lite', () => {
			const adapter = createVoyageEmbeddingAdapter({
				apiKey: 'test-key',
				model: 'voyage-3-lite',
			})

			const metadata = adapter.getModelMetadata()
			expect(metadata.model).toBe('voyage-3-lite')
			expect(metadata.dimensions).toBe(512)
		})

		it('throws error when API key is missing', () => {
			expect(() =>
				createVoyageEmbeddingAdapter({
					apiKey: '',
				}),
			).toThrow('Voyage AI API key is required')
		})

		it('returns empty array for empty input', async() => {
			const adapter = createVoyageEmbeddingAdapter({
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
				model: 'voyage-3',
				usage: { total_tokens: 5 },
			}

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			})

			const adapter = createVoyageEmbeddingAdapter({
				apiKey: 'test-key',
				model: 'voyage-3',
			})

			await adapter.embed(['Hello'])

			expect(globalThis.fetch).toHaveBeenCalledWith(
				'https://api.voyageai.com/v1/embeddings',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Authorization': 'Bearer test-key',
						'Content-Type': 'application/json',
					}),
					body: expect.stringContaining('"model":"voyage-3"'),
				}),
			)
		})

		it('includes input_type when specified', async() => {
			const mockResponse = {
				object: 'list',
				data: [{ index: 0, embedding: [0.1], object: 'embedding' }],
				model: 'voyage-3',
				usage: { total_tokens: 5 },
			}

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			})

			const adapter = createVoyageEmbeddingAdapter({
				apiKey: 'test-key',
				model: 'voyage-3',
				inputType: 'query',
			})

			await adapter.embed(['Hello'])

			expect(globalThis.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					body: expect.stringContaining('"input_type":"query"'),
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
				model: 'voyage-3',
				usage: { total_tokens: 10 },
			}

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			})

			const adapter = createVoyageEmbeddingAdapter({
				apiKey: 'test-key',
			})

			const result = await adapter.embed(['Hello', 'World'])

			expect(result).toHaveLength(2)
			expect(result[0]).toBeInstanceOf(Float32Array)
			expect(result[1]).toBeInstanceOf(Float32Array)
		})

		it('throws AUTHENTICATION_ERROR on 401', async() => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
			})

			const adapter = createVoyageEmbeddingAdapter({
				apiKey: 'bad-key',
			})

			await expect(adapter.embed(['Hello'])).rejects.toThrow('Invalid API key')
		})

		it('throws RATE_LIMIT_ERROR on 429', async() => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 429,
				json: () => Promise.resolve({ error: { message: 'Rate limited' } }),
			})

			const adapter = createVoyageEmbeddingAdapter({
				apiKey: 'test-key',
			})

			await expect(adapter.embed(['Hello'])).rejects.toThrow('Rate limited')
		})

		it('uses custom base URL', async() => {
			const mockResponse = {
				object: 'list',
				data: [{ index: 0, embedding: [0.1], object: 'embedding' }],
				model: 'voyage-3',
				usage: { total_tokens: 5 },
			}

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			})

			const adapter = createVoyageEmbeddingAdapter({
				apiKey: 'test-key',
				baseURL: 'https://custom.voyage.com/v1',
			})

			await adapter.embed(['Hello'])

			expect(globalThis.fetch).toHaveBeenCalledWith(
				'https://custom.voyage.com/v1/embeddings',
				expect.any(Object),
			)
		})
	})
})
