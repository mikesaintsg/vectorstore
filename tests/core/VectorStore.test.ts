/**
 * @mikesaintsg/vectorstore
 *
 * VectorStore tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type {
	Embedding,
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
	StoredDocument,
	VectorStoreMetadata,
	VectorStorePersistenceAdapterInterface,
} from '@mikesaintsg/core'
import { createVectorStore } from '@mikesaintsg/vectorstore'
import type {
	VectorStoreInterface,
} from '@mikesaintsg/vectorstore'

// ============================================================================
// Test Utilities
// ============================================================================

function createMockEmbedding(dimension: number, seed = 0): Embedding {
	const embedding = new Float32Array(dimension)
	for (let i = 0; i < dimension; i++) {
		embedding[i] = Math.sin(seed + i * 0.1)
	}
	return embedding
}

function createMockEmbeddingAdapter(dimension = 128): EmbeddingAdapterInterface {
	return {
		embed(texts: readonly string[]): Promise<readonly Embedding[]> {
			return Promise.resolve(texts.map((text) => {
				const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
				return createMockEmbedding(dimension, seed)
			}))
		},
		getModelMetadata(): EmbeddingModelMetadata {
			return {
				provider: 'test',
				model: 'test-model',
				dimensions: dimension,
			}
		},
	}
}

function createMockPersistenceAdapter(): VectorStorePersistenceAdapterInterface & {
	documents: Map<string, StoredDocument>
	metadata: VectorStoreMetadata | undefined
	} {
	const documents = new Map<string, StoredDocument>()
	let metadata: VectorStoreMetadata | undefined

	return {
		documents,
		metadata,
		load(): Promise<readonly StoredDocument[]> {
			return Promise.resolve([...documents.values()])
		},
		loadMetadata(): Promise<VectorStoreMetadata | undefined> {
			return Promise.resolve(metadata)
		},
		save(docs: StoredDocument | readonly StoredDocument[]): Promise<void> {
			const docsArray: readonly StoredDocument[] = Array.isArray(docs) ? docs : [docs]
			for (const doc of docsArray) {
				documents.set(doc.id, doc)
			}
			return Promise.resolve()
		},
		saveMetadata(meta: VectorStoreMetadata): Promise<void> {
			metadata = meta
			return Promise.resolve()
		},
		remove(ids: string | readonly string[]): Promise<void> {
			const idsArray: readonly string[] = Array.isArray(ids) ? ids : [ids]
			for (const id of idsArray) {
				documents.delete(id)
			}
			return Promise.resolve()
		},
		clear(): Promise<void> {
			documents.clear()
			metadata = undefined
			return Promise.resolve()
		},
		isAvailable(): Promise<boolean> {
			return Promise.resolve(true)
		},
	}
}

// ============================================================================
// Tests
// ============================================================================

describe('VectorStore', () => {
	let store: VectorStoreInterface
	let embeddingAdapter: EmbeddingAdapterInterface

	beforeEach(async() => {
		embeddingAdapter = createMockEmbeddingAdapter()
		store = await createVectorStore(embeddingAdapter)
	})

	describe('createVectorStore', () => {
		it('creates a vector store with required embedding adapter', async() => {
			const store = await createVectorStore(embeddingAdapter)
			expect(store).toBeDefined()
			expect(store.getModelId()).toBe('test:test-model')
		})

		it('creates a vector store with optional persistence adapter', async() => {
			const persistence = createMockPersistenceAdapter()
			const store = await createVectorStore(embeddingAdapter, { persistence })
			expect(store).toBeDefined()
		})

		it('creates a vector store with event hooks', async() => {
			const onDocumentAdded = vi.fn()
			const store = await createVectorStore(embeddingAdapter, { onDocumentAdded })

			await store.upsertDocument({ id: 'doc1', content: 'test' })

			expect(onDocumentAdded).toHaveBeenCalledTimes(1)
		})
	})

	describe('upsertDocument', () => {
		it('adds a single document', async() => {
			await store.upsertDocument({ id: 'doc1', content: 'Hello world' })

			const doc = await store.getDocument('doc1')
			expect(doc).toBeDefined()
			expect(doc?.id).toBe('doc1')
			expect(doc?.content).toBe('Hello world')
			expect(doc?.embedding).toBeInstanceOf(Float32Array)
		})

		it('adds multiple documents', async() => {
			await store.upsertDocument([
				{ id: 'doc1', content: 'First' },
				{ id: 'doc2', content: 'Second' },
				{ id: 'doc3', content: 'Third' },
			])

			expect(await store.count()).toBe(3)
		})

		it('updates existing documents', async() => {
			await store.upsertDocument({ id: 'doc1', content: 'Original' })
			await store.upsertDocument({ id: 'doc1', content: 'Updated' })

			const doc = await store.getDocument('doc1')
			expect(doc?.content).toBe('Updated')
		})

		it('preserves createdAt on update', async() => {
			await store.upsertDocument({ id: 'doc1', content: 'Original' })
			const original = await store.getDocument('doc1')

			await new Promise((resolve) => setTimeout(resolve, 10))
			await store.upsertDocument({ id: 'doc1', content: 'Updated' })
			const updated = await store.getDocument('doc1')

			expect(updated?.createdAt).toBe(original?.createdAt)
			expect(updated?.updatedAt).toBeGreaterThan(original?.updatedAt ?? 0)
		})

		it('stores metadata', async() => {
			await store.upsertDocument({
				id: 'doc1',
				content: 'Hello',
				metadata: { category: 'test', score: 0.9 },
			})

			const doc = await store.getDocument('doc1')
			expect(doc?.metadata).toEqual({ category: 'test', score: 0.9 })
		})

		it('emits onDocumentAdded event', async() => {
			const onDocumentAdded = vi.fn()
			store.onDocumentAdded(onDocumentAdded)

			await store.upsertDocument({ id: 'doc1', content: 'test' })

			expect(onDocumentAdded).toHaveBeenCalledTimes(1)
			expect(onDocumentAdded).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'doc1', content: 'test' }),
			)
		})

		it('emits onDocumentUpdated event on update', async() => {
			await store.upsertDocument({ id: 'doc1', content: 'Original' })

			const onDocumentUpdated = vi.fn()
			store.onDocumentUpdated(onDocumentUpdated)

			await store.upsertDocument({ id: 'doc1', content: 'Updated' })

			expect(onDocumentUpdated).toHaveBeenCalledTimes(1)
		})

		it('handles empty array', async() => {
			await store.upsertDocument([])
			expect(await store.count()).toBe(0)
		})
	})

	describe('getDocument', () => {
		beforeEach(async() => {
			await store.upsertDocument([
				{ id: 'doc1', content: 'First' },
				{ id: 'doc2', content: 'Second' },
			])
		})

		it('gets a single document by ID', async() => {
			const doc = await store.getDocument('doc1')
			expect(doc?.id).toBe('doc1')
		})

		it('returns undefined for non-existent document', async() => {
			const doc = await store.getDocument('non-existent')
			expect(doc).toBeUndefined()
		})

		it('gets multiple documents by IDs', async() => {
			const docs = await store.getDocument(['doc1', 'doc2', 'doc3'])
			expect(docs).toHaveLength(3)
			expect(docs[0]?.id).toBe('doc1')
			expect(docs[1]?.id).toBe('doc2')
			expect(docs[2]).toBeUndefined()
		})
	})

	describe('removeDocument', () => {
		beforeEach(async() => {
			await store.upsertDocument([
				{ id: 'doc1', content: 'First' },
				{ id: 'doc2', content: 'Second' },
				{ id: 'doc3', content: 'Third' },
			])
		})

		it('removes a single document', async() => {
			await store.removeDocument('doc1')
			expect(await store.hasDocument('doc1')).toBe(false)
			expect(await store.count()).toBe(2)
		})

		it('removes multiple documents', async() => {
			await store.removeDocument(['doc1', 'doc2'])
			expect(await store.count()).toBe(1)
		})

		it('emits onDocumentRemoved event', async() => {
			const onDocumentRemoved = vi.fn()
			store.onDocumentRemoved(onDocumentRemoved)

			await store.removeDocument('doc1')

			expect(onDocumentRemoved).toHaveBeenCalledWith('doc1')
		})

		it('ignores non-existent documents', async() => {
			await store.removeDocument('non-existent')
			expect(await store.count()).toBe(3)
		})
	})

	describe('hasDocument', () => {
		it('returns true for existing document', async() => {
			await store.upsertDocument({ id: 'doc1', content: 'test' })
			expect(await store.hasDocument('doc1')).toBe(true)
		})

		it('returns false for non-existent document', async() => {
			expect(await store.hasDocument('non-existent')).toBe(false)
		})
	})

	describe('all', () => {
		it('returns all documents', async() => {
			await store.upsertDocument([
				{ id: 'doc1', content: 'First' },
				{ id: 'doc2', content: 'Second' },
			])

			const docs = await store.all()
			expect(docs).toHaveLength(2)
		})

		it('returns empty array when no documents', async() => {
			const docs = await store.all()
			expect(docs).toHaveLength(0)
		})
	})

	describe('count', () => {
		it('returns correct count', async() => {
			expect(await store.count()).toBe(0)

			await store.upsertDocument({ id: 'doc1', content: 'First' })
			expect(await store.count()).toBe(1)

			await store.upsertDocument({ id: 'doc2', content: 'Second' })
			expect(await store.count()).toBe(2)
		})
	})

	describe('clear', () => {
		it('removes all documents', async() => {
			await store.upsertDocument([
				{ id: 'doc1', content: 'First' },
				{ id: 'doc2', content: 'Second' },
			])

			await store.clear()
			expect(await store.count()).toBe(0)
		})

		it('emits onDocumentRemoved for each document', async() => {
			await store.upsertDocument([
				{ id: 'doc1', content: 'First' },
				{ id: 'doc2', content: 'Second' },
			])

			const onDocumentRemoved = vi.fn()
			store.onDocumentRemoved(onDocumentRemoved)

			await store.clear()

			expect(onDocumentRemoved).toHaveBeenCalledTimes(2)
		})
	})

	describe('similaritySearch', () => {
		beforeEach(async() => {
			await store.upsertDocument([
				{ id: 'doc1', content: 'TypeScript is a typed superset of JavaScript' },
				{ id: 'doc2', content: 'React is a library for building user interfaces' },
				{ id: 'doc3', content: 'Node.js is a JavaScript runtime' },
			])
		})

		it('returns similar documents', async() => {
			const results = await store.similaritySearch('TypeScript programming')
			expect(results.length).toBeGreaterThan(0)
		})

		it('respects limit option', async() => {
			const results = await store.similaritySearch('test', { limit: 2 })
			expect(results.length).toBeLessThanOrEqual(2)
		})

		it('respects threshold option', async() => {
			const results = await store.similaritySearch('test', { threshold: 0.99 })
			for (const result of results) {
				expect(result.score).toBeGreaterThanOrEqual(0.99)
			}
		})

		it('filters by object metadata', async() => {
			await store.upsertDocument({
				id: 'doc4',
				content: 'Python programming',
				metadata: { category: 'python' },
			})

			const results = await store.similaritySearch('programming', {
				filter: { category: 'python' },
			})

			for (const result of results) {
				expect(result.metadata?.category).toBe('python')
			}
		})

		it('filters by function metadata', async() => {
			await store.upsertDocument({
				id: 'doc4',
				content: 'High score document',
				metadata: { score: 100 },
			})
			await store.upsertDocument({
				id: 'doc5',
				content: 'Low score document',
				metadata: { score: 10 },
			})

			const results = await store.similaritySearch('document', {
				filter: (metadata) =>
					typeof metadata?.score === 'number' && metadata.score > 50,
			})

			for (const result of results) {
				expect(result.metadata?.score).toBeGreaterThan(50)
			}
		})

		it('includes embeddings when requested', async() => {
			const results = await store.similaritySearch('test', { includeEmbeddings: true })

			for (const result of results) {
				expect(result.embedding).toBeDefined()
				expect(result.embedding).toBeInstanceOf(Float32Array)
			}
		})

		it('returns results sorted by score descending', async() => {
			const results = await store.similaritySearch('test')

			for (let i = 1; i < results.length; i++) {
				const prevScore = results[i - 1]?.score ?? 0
				const currScore = results[i]?.score ?? 0
				expect(prevScore).toBeGreaterThanOrEqual(currScore)
			}
		})
	})

	describe('hybridSearch', () => {
		beforeEach(async() => {
			await store.upsertDocument([
				{ id: 'doc1', content: 'TypeScript is a typed superset of JavaScript' },
				{ id: 'doc2', content: 'React is a library for building user interfaces' },
				{ id: 'doc3', content: 'Node.js is a JavaScript runtime' },
			])
		})

		it('combines vector and keyword search', async() => {
			const results = await store.hybridSearch('JavaScript runtime')
			expect(results.length).toBeGreaterThan(0)
		})

		it('respects vectorWeight and keywordWeight', async() => {
			const vectorOnly = await store.hybridSearch('test', {
				vectorWeight: 1.0,
				keywordWeight: 0.0,
			})

			const keywordOnly = await store.hybridSearch('TypeScript', {
				vectorWeight: 0.0,
				keywordWeight: 1.0,
			})

			expect(vectorOnly.length).toBeGreaterThan(0)
			expect(keywordOnly.length).toBeGreaterThan(0)
		})

		it('supports different keyword modes', async() => {
			const exact = await store.hybridSearch('Type', { keywordMode: 'exact' })
			const prefix = await store.hybridSearch('Type', { keywordMode: 'prefix' })

			expect(exact.length).toBeGreaterThanOrEqual(0)
			expect(prefix.length).toBeGreaterThanOrEqual(0)
		})
	})

	describe('updateMetadata', () => {
		it('updates metadata without re-embedding', async() => {
			await store.upsertDocument({ id: 'doc1', content: 'test' })
			const originalDoc = await store.getDocument('doc1')

			await store.updateMetadata('doc1', { category: 'updated' })

			const updatedDoc = await store.getDocument('doc1')
			expect(updatedDoc?.metadata).toEqual({ category: 'updated' })
			expect(updatedDoc?.embedding).toEqual(originalDoc?.embedding)
		})

		it('ignores non-existent documents', async() => {
			await store.updateMetadata('non-existent', { test: true })
		})

		it('emits onDocumentUpdated event', async() => {
			await store.upsertDocument({ id: 'doc1', content: 'test' })

			const onDocumentUpdated = vi.fn()
			store.onDocumentUpdated(onDocumentUpdated)

			await store.updateMetadata('doc1', { updated: true })

			expect(onDocumentUpdated).toHaveBeenCalledTimes(1)
		})
	})

	describe('persistence', () => {
		it('saves and loads documents', async() => {
			const persistence = createMockPersistenceAdapter()
			const store = await createVectorStore(embeddingAdapter, { persistence })

			await store.upsertDocument({ id: 'doc1', content: 'test' })
			await store.save()

			expect(persistence.documents.size).toBe(1)

			const store2 = await createVectorStore(embeddingAdapter, { persistence })
			await store2.load()

			const doc = await store2.getDocument('doc1')
			expect(doc?.content).toBe('test')
		})

		it('auto-saves when enabled', async() => {
			const persistence = createMockPersistenceAdapter()
			const store = await createVectorStore(embeddingAdapter, {
				persistence,
				autoSave: true,
			})

			await store.upsertDocument({ id: 'doc1', content: 'test' })

			expect(persistence.documents.size).toBe(1)
		})

		it('throws on model mismatch during load', async() => {
			const persistence = createMockPersistenceAdapter()

			const store1 = await createVectorStore(embeddingAdapter, { persistence })
			await store1.upsertDocument({ id: 'doc1', content: 'test' })
			await store1.save()

			const differentAdapter = createMockEmbeddingAdapter()
			vi.spyOn(differentAdapter, 'getModelMetadata').mockReturnValue({
				provider: 'different',
				model: 'different-model',
				dimensions: 128,
			})

			const store2 = await createVectorStore(differentAdapter, { persistence })

			await expect(store2.load()).rejects.toThrow('Model mismatch')
		})

		it('force loads despite model mismatch', async() => {
			const persistence = createMockPersistenceAdapter()

			const store1 = await createVectorStore(embeddingAdapter, { persistence })
			await store1.upsertDocument({ id: 'doc1', content: 'test' })
			await store1.save()

			const differentAdapter = createMockEmbeddingAdapter()
			vi.spyOn(differentAdapter, 'getModelMetadata').mockReturnValue({
				provider: 'different',
				model: 'different-model',
				dimensions: 128,
			})

			const store2 = await createVectorStore(differentAdapter, { persistence })
			await store2.load({ force: true })

			expect(await store2.count()).toBe(1)
		})

		it('reloads from persistence', async() => {
			const persistence = createMockPersistenceAdapter()
			const store = await createVectorStore(embeddingAdapter, { persistence })

			await store.upsertDocument({ id: 'doc1', content: 'test' })
			await store.save()

			persistence.documents.set('doc2', {
				id: 'doc2',
				content: 'external',
				embedding: createMockEmbedding(128),
				createdAt: Date.now(),
				updatedAt: Date.now(),
			})

			await store.reload()
			expect(await store.count()).toBe(2)
		})
	})

	describe('reindex', () => {
		it('re-embeds all documents', async() => {
			await store.upsertDocument([
				{ id: 'doc1', content: 'First' },
				{ id: 'doc2', content: 'Second' },
			])

			const embedSpy = vi.spyOn(embeddingAdapter, 'embed')
			await store.reindex()

			expect(embedSpy).toHaveBeenCalled()
		})

		it('preserves document IDs', async() => {
			await store.upsertDocument([
				{ id: 'doc1', content: 'First' },
				{ id: 'doc2', content: 'Second' },
			])

			await store.reindex()

			expect(await store.hasDocument('doc1')).toBe(true)
			expect(await store.hasDocument('doc2')).toBe(true)
		})
	})

	describe('isLoaded', () => {
		it('returns false before load', async() => {
			const persistence = createMockPersistenceAdapter()
			const store = await createVectorStore(embeddingAdapter, { persistence })

			expect(store.isLoaded()).toBe(false)
		})

		it('returns true after load', async() => {
			const persistence = createMockPersistenceAdapter()
			const store = await createVectorStore(embeddingAdapter, { persistence })

			await store.load()
			expect(store.isLoaded()).toBe(true)
		})
	})

	describe('getModelId', () => {
		it('returns the model ID', () => {
			expect(store.getModelId()).toBe('test:test-model')
		})
	})

	describe('getMemoryInfo', () => {
		it('returns memory information', async() => {
			await store.upsertDocument({ id: 'doc1', content: 'test content' })

			const info = store.getMemoryInfo()
			expect(info.documentCount).toBe(1)
			expect(info.estimatedBytes).toBeGreaterThan(0)
			expect(info.dimensionCount).toBe(128)
		})
	})

	describe('export/import', () => {
		it('exports store data', async() => {
			await store.upsertDocument([
				{ id: 'doc1', content: 'First' },
				{ id: 'doc2', content: 'Second' },
			])

			const exported = await store.export()

			expect(exported.version).toBe(1)
			expect(exported.modelId).toBe('test:test-model')
			expect(exported.documents).toHaveLength(2)
		})

		it('imports store data', async() => {
			await store.upsertDocument({ id: 'doc1', content: 'First' })
			const exported = await store.export()

			const store2 = await createVectorStore(embeddingAdapter)
			await store2.import(exported)

			expect(await store2.count()).toBe(1)
		})

		it('throws on model mismatch during import', async() => {
			await store.upsertDocument({ id: 'doc1', content: 'First' })
			const exported = await store.export()

			const differentAdapter = createMockEmbeddingAdapter()
			vi.spyOn(differentAdapter, 'getModelMetadata').mockReturnValue({
				provider: 'different',
				model: 'different-model',
				dimensions: 128,
			})

			const store2 = await createVectorStore(differentAdapter)
			await expect(store2.import(exported)).rejects.toThrow('Model mismatch')
		})
	})

	describe('destroy', () => {
		it('clears all data and listeners', async() => {
			await store.upsertDocument({ id: 'doc1', content: 'test' })
			const onAdded = vi.fn()
			store.onDocumentAdded(onAdded)

			store.destroy()

			expect(await store.count()).toBe(0)
			expect(store.isLoaded()).toBe(false)
		})
	})

	describe('event subscriptions', () => {
		it('returns unsubscribe function', async() => {
			const callback = vi.fn()
			const unsubscribe = store.onDocumentAdded(callback)

			await store.upsertDocument({ id: 'doc1', content: 'test1' })
			expect(callback).toHaveBeenCalledTimes(1)

			unsubscribe()

			await store.upsertDocument({ id: 'doc2', content: 'test2' })
			expect(callback).toHaveBeenCalledTimes(1)
		})

		it('supports multiple listeners', async() => {
			const callback1 = vi.fn()
			const callback2 = vi.fn()

			store.onDocumentAdded(callback1)
			store.onDocumentAdded(callback2)

			await store.upsertDocument({ id: 'doc1', content: 'test' })

			expect(callback1).toHaveBeenCalledTimes(1)
			expect(callback2).toHaveBeenCalledTimes(1)
		})
	})
})
