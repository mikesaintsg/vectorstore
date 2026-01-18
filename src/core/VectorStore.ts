/**
 * @mikesaintsg/vectorstore
 *
 * VectorStore implementation - document storage, similarity search, and persistence.
 */

import type {
	Unsubscribe,
	Embedding,
	EmbeddingAdapterInterface,
	ScoredResult,
	StoredDocument,
	VectorStoreMetadata,
	VectorStorePersistenceAdapterInterface,
	SimilarityAdapterInterface,
	EmbeddingCacheAdapterInterface,
	BatchAdapterInterface,
	RerankerAdapterInterface,
} from '@mikesaintsg/core'

import type {
	Document,
	DocumentMetadata,
	VectorStoreInterface,
	VectorStoreOptions,
	SimilaritySearchOptions,
	HybridSearchOptions,
	MemoryInfo,
	ExportedVectorStore,
	LoadOptions,
} from '../types.js'

import {
	cosineSimilarity,
	computeKeywordScore,
	estimateDocumentBytes,
} from '../helpers.js'

import {
	DEFAULT_SEARCH_LIMIT,
	DEFAULT_VECTOR_WEIGHT,
	DEFAULT_KEYWORD_WEIGHT,
	EXPORT_VERSION,
} from '../constants.js'

/**
 * VectorStore implementation.
 *
 * Stores documents with embeddings and provides similarity search.
 */
export class VectorStore implements VectorStoreInterface {
	readonly #embedding: EmbeddingAdapterInterface
	readonly #persistence: VectorStorePersistenceAdapterInterface | undefined
	readonly #similarity: SimilarityAdapterInterface | undefined
	readonly #cache: EmbeddingCacheAdapterInterface | undefined
	readonly #batch: BatchAdapterInterface | undefined
	readonly #reranker: RerankerAdapterInterface | undefined
	readonly #autoSave: boolean

	#documents = new Map<string, StoredDocument>()
	#loaded = false
	#modelId: string
	#dimension: number | undefined

	readonly #onDocumentAddedListeners = new Set<(doc: StoredDocument) => void>()
	readonly #onDocumentUpdatedListeners = new Set<(doc: StoredDocument) => void>()
	readonly #onDocumentRemovedListeners = new Set<(id: string) => void>()

	constructor(
		embedding: EmbeddingAdapterInterface,
		options?: VectorStoreOptions,
	) {
		this.#embedding = embedding
		this.#persistence = options?.persistence
		this.#similarity = options?.similarity
		this.#cache = options?.cache
		this.#batch = options?.batch
		this.#reranker = options?.reranker
		this.#autoSave = options?.autoSave ?? true

		const metadata = embedding.getModelMetadata()
		this.#modelId = `${metadata.provider}:${metadata.model}`
		this.#dimension = metadata.dimensions

		// Wire up hooks from options
		if (options?.onDocumentAdded) {
			this.#onDocumentAddedListeners.add(options.onDocumentAdded)
		}
		if (options?.onDocumentUpdated) {
			this.#onDocumentUpdatedListeners.add(options.onDocumentUpdated)
		}
		if (options?.onDocumentRemoved) {
			this.#onDocumentRemovedListeners.add(options.onDocumentRemoved)
		}
	}

	// ---- Document Operations ----

	async upsertDocument(doc: Document | readonly Document[]): Promise<void> {
		const docArray: readonly Document[] = Array.isArray(doc) ? doc : [doc]
		if (docArray.length === 0) return

		const textsToEmbed: string[] = []
		const docsNeedingEmbedding: Document[] = []

		for (const d of docArray) {
			const cached = this.#cache?.get(d.content)
			if (cached) {
				const existing = this.#documents.get(d.id)
				const now = Date.now()
				const storedDoc: StoredDocument = {
					id: d.id,
					content: d.content,
					embedding: cached,
					...(d.metadata ? { metadata: d.metadata } : {}),
					createdAt: existing?.createdAt ?? now,
					updatedAt: now,
				}
				this.#documents.set(d.id, storedDoc)
				this.#emitDocumentEvent(storedDoc, existing !== undefined)
			} else {
				textsToEmbed.push(d.content)
				docsNeedingEmbedding.push(d)
			}
		}

		if (docsNeedingEmbedding.length > 0) {
			const embeddings = await this.#embedTexts(textsToEmbed)

			for (let i = 0; i < docsNeedingEmbedding.length; i++) {
				const d = docsNeedingEmbedding[i]
				const embedding = embeddings[i]

				if (d && embedding) {
					this.#cache?.set(d.content, embedding)

					const existing = this.#documents.get(d.id)
					const now = Date.now()
					const storedDoc: StoredDocument = {
						id: d.id,
						content: d.content,
						embedding,
						...(d.metadata ? { metadata: d.metadata } : {}),
						createdAt: existing?.createdAt ?? now,
						updatedAt: now,
					}
					this.#documents.set(d.id, storedDoc)
					this.#emitDocumentEvent(storedDoc, existing !== undefined)
				}
			}
		}

		if (this.#autoSave && this.#persistence) {
			await this.save()
		}
	}

	getDocument(id: string): Promise<StoredDocument | undefined>
	getDocument(ids: readonly string[]): Promise<readonly (StoredDocument | undefined)[]>
	getDocument(
		idOrIds: string | readonly string[],
	): Promise<StoredDocument | undefined | readonly (StoredDocument | undefined)[]> {
		if (typeof idOrIds === 'string') {
			return Promise.resolve(this.#documents.get(idOrIds))
		}
		return Promise.resolve(idOrIds.map((id) => this.#documents.get(id)))
	}

	async removeDocument(id: string | readonly string[]): Promise<void> {
		const idArray: readonly string[] = Array.isArray(id) ? id : [id]

		for (const docId of idArray) {
			if (this.#documents.delete(docId)) {
				this.#emitDocumentRemoved(docId)
			}
		}

		if (this.#autoSave && this.#persistence && idArray.length > 0) {
			await this.#persistence.remove(idArray)
		}
	}

	hasDocument(id: string): Promise<boolean> {
		return Promise.resolve(this.#documents.has(id))
	}

	all(): Promise<readonly StoredDocument[]> {
		return Promise.resolve([...this.#documents.values()])
	}

	count(): Promise<number> {
		return Promise.resolve(this.#documents.size)
	}

	async clear(): Promise<void> {
		const ids = [...this.#documents.keys()]
		this.#documents.clear()

		for (const id of ids) {
			this.#emitDocumentRemoved(id)
		}

		if (this.#persistence) {
			await this.#persistence.clear()
		}
	}

	// ---- Search Operations ----

	async similaritySearch(
		query: string,
		options?: SimilaritySearchOptions,
	): Promise<readonly ScoredResult[]> {
		const limit = options?.limit ?? DEFAULT_SEARCH_LIMIT
		const threshold = options?.threshold ?? 0
		const filter = options?.filter
		const includeEmbeddings = options?.includeEmbeddings ?? false

		const embeddings = await this.#embedding.embed([query])
		const queryEmbedding = embeddings[0]
		if (!queryEmbedding) return []

		const results: ScoredResult[] = []

		for (const doc of this.#documents.values()) {
			if (!this.#matchesFilter(doc.metadata, filter)) continue

			const score = this.#computeSimilarity(queryEmbedding, doc.embedding)
			if (score < threshold) continue

			const result: ScoredResult = {
				id: doc.id,
				content: doc.content,
				score,
				...(doc.metadata ? { metadata: doc.metadata } : {}),
				...(includeEmbeddings ? { embedding: doc.embedding } : {}),
			}
			results.push(result)
		}

		results.sort((a, b) => b.score - a.score)
		let topResults = results.slice(0, options?.rerankTopK ?? limit)

		if (options?.rerank && this.#reranker && topResults.length > 0) {
			topResults = [...await this.#reranker.rerank(query, topResults)]
			topResults = topResults.slice(0, limit)
		} else {
			topResults = topResults.slice(0, limit)
		}

		return topResults
	}

	async hybridSearch(
		query: string,
		options?: HybridSearchOptions,
	): Promise<readonly ScoredResult[]> {
		const vectorWeight = options?.vectorWeight ?? DEFAULT_VECTOR_WEIGHT
		const keywordWeight = options?.keywordWeight ?? DEFAULT_KEYWORD_WEIGHT
		const limit = options?.limit ?? DEFAULT_SEARCH_LIMIT
		const threshold = options?.threshold ?? 0
		const filter = options?.filter
		const includeEmbeddings = options?.includeEmbeddings ?? false
		const keywordMode = options?.keywordMode ?? 'exact'

		const embeddings = await this.#embedding.embed([query])
		const queryEmbedding = embeddings[0]
		if (!queryEmbedding) return []

		const results: ScoredResult[] = []

		for (const doc of this.#documents.values()) {
			if (!this.#matchesFilter(doc.metadata, filter)) continue

			const vectorScore = this.#computeSimilarity(queryEmbedding, doc.embedding)
			const keywordScore = computeKeywordScore(query, doc.content, keywordMode)
			const combinedScore = vectorWeight * vectorScore + keywordWeight * keywordScore

			if (combinedScore < threshold) continue

			const result: ScoredResult = {
				id: doc.id,
				content: doc.content,
				score: combinedScore,
				...(doc.metadata ? { metadata: doc.metadata } : {}),
				...(includeEmbeddings ? { embedding: doc.embedding } : {}),
			}
			results.push(result)
		}

		results.sort((a, b) => b.score - a.score)
		let topResults = results.slice(0, options?.rerankTopK ?? limit)

		if (options?.rerank && this.#reranker && topResults.length > 0) {
			topResults = [...await this.#reranker.rerank(query, topResults)]
			topResults = topResults.slice(0, limit)
		} else {
			topResults = topResults.slice(0, limit)
		}

		return topResults
	}

	// ---- Metadata Operations ----

	async updateMetadata(id: string, metadata: DocumentMetadata): Promise<void> {
		const doc = this.#documents.get(id)
		if (!doc) return

		const updated: StoredDocument = {
			...doc,
			metadata,
			updatedAt: Date.now(),
		}
		this.#documents.set(id, updated)
		this.#emitDocumentEvent(updated, true)

		if (this.#autoSave && this.#persistence) {
			await this.#persistence.save(updated)
		}
	}

	// ---- Persistence Operations ----

	async load(options?: LoadOptions): Promise<void> {
		if (!this.#persistence) {
			this.#loaded = true
			return
		}

		const isAvailable = await this.#persistence.isAvailable()
		if (!isAvailable) {
			this.#loaded = true
			return
		}

		const storedMetadata = await this.#persistence.loadMetadata()

		if (storedMetadata && !options?.force) {
			const storedModelId = `${storedMetadata.provider}:${storedMetadata.model}`
			if (storedModelId !== this.#modelId) {
				throw new Error(
					`Model mismatch: stored embeddings use '${storedModelId}' but current adapter uses '${this.#modelId}'`,
				)
			}
		}

		const docs = await this.#persistence.load()
		this.#documents.clear()

		for (const doc of docs) {
			this.#documents.set(doc.id, doc)
		}

		this.#loaded = true
	}

	async save(): Promise<void> {
		if (!this.#persistence) return

		const docs = [...this.#documents.values()]
		await this.#persistence.save(docs)

		const metadata: VectorStoreMetadata = {
			dimensions: this.#dimension ?? 0,
			model: this.#embedding.getModelMetadata().model,
			provider: this.#embedding.getModelMetadata().provider,
			documentCount: this.#documents.size,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		}
		await this.#persistence.saveMetadata(metadata)
	}

	async reload(): Promise<void> {
		await this.load({ force: true })
	}

	async reindex(): Promise<void> {
		const docs: Document[] = [...this.#documents.values()].map((d) => {
			const doc: Document = {
				id: d.id,
				content: d.content,
				...(d.metadata ? { metadata: d.metadata } : {}),
			}
			return doc
		})

		this.#cache?.clear()
		this.#documents.clear()

		if (docs.length > 0) {
			await this.upsertDocument(docs)
		}
	}

	isLoaded(): boolean {
		return this.#loaded
	}

	// ---- Info Methods ----

	getModelId(): string {
		return this.#modelId
	}

	getMemoryInfo(): MemoryInfo {
		let estimatedBytes = 0
		for (const doc of this.#documents.values()) {
			estimatedBytes += estimateDocumentBytes(doc)
		}

		return {
			documentCount: this.#documents.size,
			estimatedBytes,
			dimensionCount: this.#dimension ?? 0,
		}
	}

	// ---- Export/Import ----

	export(): Promise<ExportedVectorStore> {
		return Promise.resolve({
			version: EXPORT_VERSION,
			exportedAt: Date.now(),
			modelId: this.#modelId,
			dimension: this.#dimension ?? 0,
			documents: [...this.#documents.values()],
		})
	}

	async import(data: ExportedVectorStore): Promise<void> {
		if (data.modelId !== this.#modelId) {
			throw new Error(
				`Model mismatch: imported data uses '${data.modelId}' but current adapter uses '${this.#modelId}'`,
			)
		}

		for (const doc of data.documents) {
			this.#documents.set(doc.id, doc)
			this.#emitDocumentEvent(doc, false)
		}

		if (this.#autoSave && this.#persistence) {
			await this.save()
		}
	}

	// ---- Event Subscriptions ----

	onDocumentAdded(callback: (doc: StoredDocument) => void): Unsubscribe {
		this.#onDocumentAddedListeners.add(callback)
		return () => this.#onDocumentAddedListeners.delete(callback)
	}

	onDocumentUpdated(callback: (doc: StoredDocument) => void): Unsubscribe {
		this.#onDocumentUpdatedListeners.add(callback)
		return () => this.#onDocumentUpdatedListeners.delete(callback)
	}

	onDocumentRemoved(callback: (id: string) => void): Unsubscribe {
		this.#onDocumentRemovedListeners.add(callback)
		return () => this.#onDocumentRemovedListeners.delete(callback)
	}

	// ---- Lifecycle ----

	destroy(): void {
		this.#documents.clear()
		this.#onDocumentAddedListeners.clear()
		this.#onDocumentUpdatedListeners.clear()
		this.#onDocumentRemovedListeners.clear()
		this.#loaded = false
	}

	// ---- Private Methods ----

	async #embedTexts(texts: readonly string[]): Promise<readonly Embedding[]> {
		if (texts.length === 0) return []

		const batchSize = this.#batch?.getBatchSize() ?? texts.length
		const delayMs = this.#batch?.getDelayMs() ?? 0

		const allEmbeddings: Embedding[] = []

		for (let i = 0; i < texts.length; i += batchSize) {
			const batch = texts.slice(i, i + batchSize)
			const embeddings = await this.#embedding.embed(batch)
			allEmbeddings.push(...embeddings)

			if (i + batchSize < texts.length && delayMs > 0) {
				await this.#sleep(delayMs)
			}
		}

		return allEmbeddings
	}

	#computeSimilarity(a: Embedding, b: Embedding): number {
		if (this.#similarity) {
			return this.#similarity.compute(a, b)
		}
		return cosineSimilarity(a, b)
	}

	#matchesFilter(
		metadata: Readonly<Record<string, unknown>> | undefined,
		filter: SimilaritySearchOptions['filter'],
	): boolean {
		if (!filter) return true

		if (typeof filter === 'function') {
			return filter(metadata)
		}

		if (!metadata) return false

		for (const [key, value] of Object.entries(filter)) {
			if (metadata[key] !== value) return false
		}

		return true
	}

	#emitDocumentEvent(doc: StoredDocument, isUpdate: boolean): void {
		if (isUpdate) {
			for (const listener of this.#onDocumentUpdatedListeners) {
				listener(doc)
			}
		} else {
			for (const listener of this.#onDocumentAddedListeners) {
				listener(doc)
			}
		}
	}

	#emitDocumentRemoved(id: string): void {
		for (const listener of this.#onDocumentRemovedListeners) {
			listener(id)
		}
	}

	#sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}
}
