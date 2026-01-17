/**
 * @mikesaintsg/adapters
 *
 * Tests for Ollama embedding adapter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createOllamaEmbeddingAdapter } from '@mikesaintsg/adapters'

describe('Ollama Embedding Adapter', () => {
	let originalFetch: typeof globalThis.fetch

	beforeEach(() => {
		originalFetch = globalThis.fetch
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		vi.restoreAllMocks()
	})

	describe('createOllamaEmbeddingAdapter', () => {
		it('implements EmbeddingAdapterInterface', () => {
			const adapter = createOllamaEmbeddingAdapter({
				model: 'nomic-embed-text',
			})

			expect(adapter.embed).toBeInstanceOf(Function)
			expect(adapter.getModelMetadata).toBeInstanceOf(Function)
		})

		it('returns correct model metadata', () => {
			const adapter = createOllamaEmbeddingAdapter({
				model: 'nomic-embed-text',
			})

			const metadata = adapter.getModelMetadata()
			expect(metadata.provider).toBe('ollama')
			expect(metadata.model).toBe('nomic-embed-text')
			expect(metadata.dimensions).toBe(768)
		})

		it('returns empty array for empty input', async() => {
			const adapter = createOllamaEmbeddingAdapter({
				model: 'nomic-embed-text',
			})

			const result = await adapter.embed([])
			expect(result).toEqual([])
		})

		it('makes correct API request', async() => {
			const mockResponse = {
				model: 'nomic-embed-text',
				embeddings: [[0.1, 0.2, 0.3]],
			}

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			})

			const adapter = createOllamaEmbeddingAdapter({
				model: 'nomic-embed-text',
			})

			await adapter.embed(['Hello'])

			expect(globalThis.fetch).toHaveBeenCalledWith(
				'http://localhost:11434/api/embed',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
					}),
					body: expect.stringContaining('"model":"nomic-embed-text"'),
				}),
			)
		})

		it('parses successful response correctly', async() => {
			const mockResponse = {
				model: 'nomic-embed-text',
				embeddings: [
					[0.1, 0.2, 0.3],
					[0.4, 0.5, 0.6],
				],
			}

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			})

			const adapter = createOllamaEmbeddingAdapter({
				model: 'nomic-embed-text',
			})

			const result = await adapter.embed(['Hello', 'World'])

			expect(result).toHaveLength(2)
			expect(result[0]).toBeInstanceOf(Float32Array)
			expect(result[1]).toBeInstanceOf(Float32Array)
			// Float32Array has precision differences, check length and approximate values
			expect(result[0]?.length).toBe(3)
			expect(result[1]?.length).toBe(3)
			expect(result[0]?.[0]).toBeCloseTo(0.1, 5)
			expect(result[1]?.[0]).toBeCloseTo(0.4, 5)
		})

		it('uses custom base URL', async() => {
			const mockResponse = {
				model: 'nomic-embed-text',
				embeddings: [[0.1, 0.2, 0.3]],
			}

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			})

			const adapter = createOllamaEmbeddingAdapter({
				model: 'nomic-embed-text',
				baseURL: 'http://192.168.1.100:11434',
			})

			await adapter.embed(['Hello'])

			expect(globalThis.fetch).toHaveBeenCalledWith(
				'http://192.168.1.100:11434/api/embed',
				expect.any(Object),
			)
		})

		it('handles model not found error', async() => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				json: () => Promise.resolve({ error: 'model "nonexistent" not found' }),
			})

			const adapter = createOllamaEmbeddingAdapter({
				model: 'nonexistent',
			})

			await expect(adapter.embed(['Hello'])).rejects.toThrow()
		})

		it('handles connection error', async() => {
			globalThis.fetch = vi.fn().mockRejectedValue(
				new TypeError('Failed to fetch'),
			)

			const adapter = createOllamaEmbeddingAdapter({
				model: 'nomic-embed-text',
			})

			// Network error gets mapped to AdapterError with NETWORK_ERROR code
			await expect(adapter.embed(['Hello'])).rejects.toThrow()
		})

		it('handles abort signal', async() => {
			const mockResponse = {
				model: 'nomic-embed-text',
				embeddings: [[0.1, 0.2, 0.3]],
			}

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			})

			const adapter = createOllamaEmbeddingAdapter({
				model: 'nomic-embed-text',
			})

			const abortController = new AbortController()
			await adapter.embed(['Hello'], { signal: abortController.signal })

			// Verify fetch was called
			expect(globalThis.fetch).toHaveBeenCalled()
		})

		it('handles single text embedding', async() => {
			const mockResponse = {
				model: 'nomic-embed-text',
				embeddings: [[0.1, 0.2, 0.3]],
			}

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			})

			const adapter = createOllamaEmbeddingAdapter({
				model: 'nomic-embed-text',
			})

			const result = await adapter.embed(['Single text'])

			expect(result).toHaveLength(1)
			expect(result[0]).toBeInstanceOf(Float32Array)
		})
	})
})
