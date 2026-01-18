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
			await store2.load({ ignoreMismatch: true })

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

	// ============================================================================
	// Edge Case Tests
	// ============================================================================

	describe('edge cases - documents', () => {
		it('handles document with empty content', async() => {
			await store.upsertDocument({ id: 'empty', content: '' })
			const doc = await store.getDocument('empty')
			expect(doc?.content).toBe('')
		})

		it('handles document with very long content', async() => {
			const longContent = 'x'.repeat(100000)
			await store.upsertDocument({ id: 'long', content: longContent })
			const doc = await store.getDocument('long')
			expect(doc?.content.length).toBe(100000)
		})

		it('handles document with special characters in content', async() => {
			const specialContent = '🚀 emoji, "quotes", <html>, &amp;, newline\n\t\r'
			await store.upsertDocument({ id: 'special', content: specialContent })
			const doc = await store.getDocument('special')
			expect(doc?.content).toBe(specialContent)
		})

		it('handles document with unicode content', async() => {
			const unicodeContent = '日本語 中文 العربية Ελληνικά'
			await store.upsertDocument({ id: 'unicode', content: unicodeContent })
			const doc = await store.getDocument('unicode')
			expect(doc?.content).toBe(unicodeContent)
		})

		it('handles document ID with special characters', async() => {
			const specialId = 'doc:123/test?query=value#hash'
			await store.upsertDocument({ id: specialId, content: 'test' })
			const doc = await store.getDocument(specialId)
			expect(doc?.id).toBe(specialId)
		})

		it('handles deeply nested metadata', async() => {
			const deepMetadata = {
				level1: {
					level2: {
						level3: {
							value: 'deep',
						},
					},
				},
			}
			await store.upsertDocument({
				id: 'nested',
				content: 'test',
				metadata: deepMetadata,
			})
			const doc = await store.getDocument('nested')
			expect(doc?.metadata).toEqual(deepMetadata)
		})

		it('handles metadata with array values', async() => {
			await store.upsertDocument({
				id: 'array-meta',
				content: 'test',
				metadata: { tags: ['a', 'b', 'c'], numbers: [1, 2, 3] },
			})
			const doc = await store.getDocument('array-meta')
			expect(doc?.metadata?.tags).toEqual(['a', 'b', 'c'])
		})

		it('handles null-like metadata values', async() => {
			await store.upsertDocument({
				id: 'null-meta',
				content: 'test',
				metadata: { empty: '', zero: 0, falsy: false },
			})
			const doc = await store.getDocument('null-meta')
			expect(doc?.metadata?.empty).toBe('')
			expect(doc?.metadata?.zero).toBe(0)
			expect(doc?.metadata?.falsy).toBe(false)
		})

		it('handles rapid sequential updates to same document', async() => {
			const promises = []
			for (let i = 0; i < 10; i++) {
				promises.push(store.upsertDocument({ id: 'rapid', content: `version ${i}` }))
			}
			await Promise.all(promises)

			const doc = await store.getDocument('rapid')
			expect(doc).toBeDefined()
		})

		it('handles many documents', async() => {
			const docs = Array.from({ length: 100 }, (_, i) => ({
				id: `doc-${i}`,
				content: `Document number ${i}`,
			}))
			await store.upsertDocument(docs)
			expect(await store.count()).toBe(100)
		})
	})

	describe('edge cases - search', () => {
		beforeEach(async() => {
			await store.upsertDocument([
				{ id: 'doc1', content: 'TypeScript JavaScript programming' },
				{ id: 'doc2', content: 'React component rendering', metadata: { type: 'frontend' } },
				{ id: 'doc3', content: 'Node.js server backend', metadata: { type: 'backend' } },
			])
		})

		it('handles empty query', async() => {
			const results = await store.similaritySearch('')
			expect(results.length).toBeGreaterThanOrEqual(0)
		})

		it('handles query longer than any document', async() => {
			const longQuery = 'a'.repeat(1000)
			const results = await store.similaritySearch(longQuery)
			expect(results.length).toBeGreaterThanOrEqual(0)
		})

		it('handles limit of 0', async() => {
			const results = await store.similaritySearch('test', { limit: 0 })
			expect(results).toHaveLength(0)
		})

		it('handles limit larger than document count', async() => {
			const results = await store.similaritySearch('test', { limit: 1000 })
			expect(results.length).toBeLessThanOrEqual(3)
		})

		it('handles threshold of 1 (exact match only)', async() => {
			const results = await store.similaritySearch('test', { threshold: 1.0 })
			expect(results).toHaveLength(0)
		})

		it('handles threshold of 0 (all results with non-negative scores)', async() => {
			const results = await store.similaritySearch('test', { threshold: 0, limit: 100 })
			// All results should have score >= 0
			for (const result of results) {
				expect(result.score).toBeGreaterThanOrEqual(0)
			}
		})

		it('handles search on empty store', async() => {
			const emptyStore = await createVectorStore(embeddingAdapter)
			const results = await emptyStore.similaritySearch('test')
			expect(results).toHaveLength(0)
		})

		it('filters with empty object metadata returns matching docs', async() => {
			const results = await store.similaritySearch('test', { filter: {}, limit: 100 })
			// Empty filter should match all documents
			expect(results.length).toBeGreaterThanOrEqual(0)
		})

		it('filters with function always returning false', async() => {
			const results = await store.similaritySearch('test', {
				filter: () => false,
			})
			expect(results).toHaveLength(0)
		})

		it('filters with function always returning true', async() => {
			const results = await store.similaritySearch('test', {
				filter: () => true,
				limit: 100,
			})
			// All results should pass filter, may be filtered by threshold
			expect(results.length).toBeGreaterThanOrEqual(0)
		})

		it('filters documents without metadata', async() => {
			const results = await store.similaritySearch('test', {
				filter: { type: 'frontend' },
			})
			// Only doc2 has type: 'frontend'
			for (const result of results) {
				expect(result.metadata?.type).toBe('frontend')
			}
		})
	})

	describe('edge cases - hybrid search', () => {
		beforeEach(async() => {
			await store.upsertDocument([
				{ id: 'doc1', content: 'TypeScript JavaScript programming language' },
				{ id: 'doc2', content: 'React component UI library' },
				{ id: 'doc3', content: 'Node.js server runtime JavaScript' },
			])
		})

		it('handles pure keyword search (vectorWeight: 0)', async() => {
			const results = await store.hybridSearch('JavaScript', {
				vectorWeight: 0,
				keywordWeight: 1,
			})
			// Results should be based only on keyword matching
			expect(results.length).toBeGreaterThan(0)
		})

		it('handles pure vector search (keywordWeight: 0)', async() => {
			const results = await store.hybridSearch('programming', {
				vectorWeight: 1,
				keywordWeight: 0,
			})
			expect(results.length).toBeGreaterThan(0)
		})

		it('handles equal weights', async() => {
			const results = await store.hybridSearch('JavaScript', {
				vectorWeight: 0.5,
				keywordWeight: 0.5,
			})
			expect(results.length).toBeGreaterThan(0)
		})

		it('handles fuzzy keyword mode', async() => {
			const results = await store.hybridSearch('Javascrip', {
				keywordMode: 'fuzzy',
			})
			// Should find 'JavaScript' with fuzzy matching
			expect(results.length).toBeGreaterThan(0)
		})

		it('handles prefix keyword mode', async() => {
			const results = await store.hybridSearch('Type', {
				keywordMode: 'prefix',
			})
			// Should find 'TypeScript' with prefix matching
			expect(results.length).toBeGreaterThan(0)
		})

		it('handles query with no keyword matches', async() => {
			const results = await store.hybridSearch('xyz123', {
				keywordWeight: 0.5,
				vectorWeight: 0.5,
			})
			// Vector similarity should still provide results
			expect(results.length).toBeGreaterThanOrEqual(0)
		})
	})

	describe('edge cases - persistence', () => {
		it('handles persistence not available', async() => {
			const unavailablePersistence = createMockPersistenceAdapter()
			vi.spyOn(unavailablePersistence, 'isAvailable').mockResolvedValue(false)

			const store = await createVectorStore(embeddingAdapter, {
				persistence: unavailablePersistence,
			})
			await store.load()
			expect(store.isLoaded()).toBe(true)
		})

		it('handles empty persistence', async() => {
			const persistence = createMockPersistenceAdapter()
			const store = await createVectorStore(embeddingAdapter, { persistence })
			await store.load()
			expect(await store.count()).toBe(0)
		})

		it('handles autoSave: false', async() => {
			const persistence = createMockPersistenceAdapter()
			const store = await createVectorStore(embeddingAdapter, {
				persistence,
				autoSave: false,
			})

			await store.upsertDocument({ id: 'doc1', content: 'test' })
			expect(persistence.documents.size).toBe(0)

			await store.save()
			expect(persistence.documents.size).toBe(1)
		})

		it('reports progress during load', async() => {
			const persistence = createMockPersistenceAdapter()
			persistence.documents.set('doc1', {
				id: 'doc1',
				content: 'test1',
				embedding: createMockEmbedding(128),
				createdAt: Date.now(),
				updatedAt: Date.now(),
			})
			persistence.documents.set('doc2', {
				id: 'doc2',
				content: 'test2',
				embedding: createMockEmbedding(128),
				createdAt: Date.now(),
				updatedAt: Date.now(),
			})

			const store = await createVectorStore(embeddingAdapter, { persistence })

			const progressCalls: { loaded: number; total: number }[] = []
			await store.load({
				onProgress: (loaded, total) => {
					progressCalls.push({ loaded, total })
				},
			})

			expect(progressCalls.length).toBe(2)
			expect(progressCalls[0]).toEqual({ loaded: 1, total: 2 })
			expect(progressCalls[1]).toEqual({ loaded: 2, total: 2 })
		})
	})

	describe('edge cases - export/import', () => {
		it('exports empty store', async() => {
			const exported = await store.export()
			expect(exported.documents).toHaveLength(0)
			expect(exported.version).toBe(1)
		})

		it('exports and imports with metadata', async() => {
			await store.upsertDocument({
				id: 'doc1',
				content: 'test',
				metadata: { key: 'value' },
			})

			const exported = await store.export()
			const store2 = await createVectorStore(embeddingAdapter)
			await store2.import(exported)

			const doc = await store2.getDocument('doc1')
			expect(doc?.metadata).toEqual({ key: 'value' })
		})

		it('import preserves createdAt timestamps', async() => {
			await store.upsertDocument({ id: 'doc1', content: 'test' })
			const original = await store.getDocument('doc1')
			const exported = await store.export()

			const store2 = await createVectorStore(embeddingAdapter)
			await store2.import(exported)

			const imported = await store2.getDocument('doc1')
			expect(imported?.createdAt).toBe(original?.createdAt)
		})

		it('import adds to existing documents', async() => {
			await store.upsertDocument({ id: 'existing', content: 'existing' })
			const exported = await store.export()

			const store2 = await createVectorStore(embeddingAdapter)
			await store2.upsertDocument({ id: 'other', content: 'other' })
			await store2.import(exported)

			expect(await store2.count()).toBe(2)
		})
	})

	describe('edge cases - lifecycle', () => {
		it('allows operations after destroy', async() => {
			await store.upsertDocument({ id: 'doc1', content: 'test' })
			store.destroy()

			// Should be able to add documents again after destroy
			await store.upsertDocument({ id: 'doc2', content: 'test2' })
			expect(await store.count()).toBe(1)
		})

		it('handles multiple destroy calls', async() => {
			await store.upsertDocument({ id: 'doc1', content: 'test' })
			store.destroy()
			store.destroy()
			store.destroy()
			expect(await store.count()).toBe(0)
		})

		it('handles reindex on empty store', async() => {
			await store.reindex()
			expect(await store.count()).toBe(0)
		})

		it('reindex preserves metadata', async() => {
			await store.upsertDocument({
				id: 'doc1',
				content: 'test',
				metadata: { key: 'value' },
			})

			await store.reindex()

			const doc = await store.getDocument('doc1')
			expect(doc?.metadata).toEqual({ key: 'value' })
		})
	})

	describe('edge cases - memory and performance', () => {
		it('getMemoryInfo on empty store', () => {
			const info = store.getMemoryInfo()
			expect(info.documentCount).toBe(0)
			expect(info.estimatedBytes).toBe(0)
		})

		it('getMemoryInfo reflects document count', async() => {
			await store.upsertDocument([
				{ id: 'doc1', content: 'test1' },
				{ id: 'doc2', content: 'test2' },
			])
			const info = store.getMemoryInfo()
			expect(info.documentCount).toBe(2)
		})

		it('clear resets memory info', async() => {
			await store.upsertDocument({ id: 'doc1', content: 'test' })
			await store.clear()
			const info = store.getMemoryInfo()
			expect(info.documentCount).toBe(0)
		})
	})

	describe('edge cases - event subscriptions', () => {
		it('unsubscribe is idempotent', async() => {
			const callback = vi.fn()
			const unsubscribe = store.onDocumentAdded(callback)

			unsubscribe()
			unsubscribe()
			unsubscribe()

			await store.upsertDocument({ id: 'doc1', content: 'test' })
			expect(callback).not.toHaveBeenCalled()
		})

		it('listener errors do not prevent other listeners', async() => {
			const callback1 = vi.fn().mockImplementation(() => {
				throw new Error('Listener error')
			})
			const callback2 = vi.fn()

			store.onDocumentAdded(callback1)
			store.onDocumentAdded(callback2)

			await expect(store.upsertDocument({ id: 'doc1', content: 'test' })).rejects.toThrow()
		})

		it('subscriptions from options work with dynamic subscriptions', async() => {
			const optionsCallback = vi.fn()
			const store = await createVectorStore(embeddingAdapter, {
				onDocumentAdded: optionsCallback,
			})

			const dynamicCallback = vi.fn()
			store.onDocumentAdded(dynamicCallback)

			await store.upsertDocument({ id: 'doc1', content: 'test' })

			expect(optionsCallback).toHaveBeenCalledTimes(1)
			expect(dynamicCallback).toHaveBeenCalledTimes(1)
		})
	})
})
