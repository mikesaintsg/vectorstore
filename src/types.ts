/**
 * @mikesaintsg/vectorstore
 *
 * Type definitions for the vectorstore library.
 * All public types and interfaces are defined here as the SOURCE OF TRUTH.
 */

import type {
	Unsubscribe,
	SubscriptionToHook,
	Embedding,
	EmbeddingAdapterInterface,
	PackageErrorData,
	ScoredResult,
	MinimalDatabaseAccess,
	MinimalDirectoryAccess,
	VectorStorePersistenceAdapterInterface,
	SimilarityAdapterInterface,
	RetryAdapterInterface,
	RateLimitAdapterInterface,
	EmbeddingCacheAdapterInterface,
	BatchAdapterInterface,
	RerankerAdapterInterface,
} from '@mikesaintsg/core'

// ============================================================================
// Document Types
// ============================================================================

/** Document metadata */
export type DocumentMetadata = Readonly<Record<string, unknown>>;

/** Input document */
export interface Document {
	readonly id: string
	readonly content: string
	readonly metadata?: DocumentMetadata
}

/** Stored document with embedding */
export interface StoredDocument {
	readonly id: string
	readonly content: string
	readonly embedding: Embedding
	readonly metadata?: DocumentMetadata
	readonly createdAt: number
	readonly updatedAt: number
}

// ============================================================================
// Search Types
// ============================================================================

/** Metadata filter */
export type MetadataFilter =
	| Record<string, unknown>
	| ((metadata: DocumentMetadata | undefined) => boolean)

/** Similarity function */
export type SimilarityFunction =
	| 'cosine'
	| 'dot'
	| 'euclidean'
	| ((a: Embedding, b: Embedding) => number)

/** Similarity search options */
export interface SimilaritySearchOptions {
	readonly limit?: number
	readonly threshold?: number
	readonly filter?: MetadataFilter
	readonly includeEmbeddings?: boolean
	readonly rerank?: boolean
	readonly rerankTopK?: number
}

/** Hybrid search options */
export interface HybridSearchOptions extends SimilaritySearchOptions {
	readonly vectorWeight?: number
	readonly keywordWeight?: number
	readonly keywordMode?: 'exact' | 'fuzzy' | 'prefix'
}

// ============================================================================
// Persistence Types
// ============================================================================

/** Vector store metadata */
export interface VectorStoreMetadata {
	readonly modelId: string
	readonly dimension: number
	readonly documentCount: number
	readonly createdAt: number
	readonly updatedAt: number
}

/** Memory info */
export interface MemoryInfo {
	readonly documentCount: number
	readonly estimatedBytes: number
	readonly dimensionCount: number
}

/** Exported vector store */
export interface ExportedVectorStore {
	readonly version: number
	readonly exportedAt: number
	readonly metadata: VectorStoreMetadata
	readonly documents: readonly StoredDocument[]
}

/** Load options */
export interface LoadOptions {
	readonly force?: boolean
}

// ============================================================================
// Subscription Interfaces
// ============================================================================

/** VectorStore subscription methods */
export interface VectorStoreSubscriptions {
	onDocumentAdded(callback: (doc: StoredDocument) => void): Unsubscribe
	onDocumentUpdated(callback: (doc: StoredDocument) => void): Unsubscribe
	onDocumentRemoved(callback: (id: string) => void): Unsubscribe
}

// ============================================================================
// Options Interfaces
// ============================================================================

/**
 * VectorStore creation options.
 *
 * All adapters are opt-in. Nothing is enabled by default.
 * The embedding adapter is the required first parameter to createVectorStore().
 */
export interface VectorStoreOptions extends SubscriptionToHook<VectorStoreSubscriptions> {
	// Persistence (opt-in - stores in memory if not provided)
	readonly persistence?: VectorStorePersistenceAdapterInterface

	// Transform (opt-in)
	readonly similarity?: SimilarityAdapterInterface

	// Policy (opt-in)
	readonly retry?: RetryAdapterInterface
	readonly rateLimit?: RateLimitAdapterInterface

	// Enhancement (opt-in)
	readonly cache?: EmbeddingCacheAdapterInterface
	readonly batch?: BatchAdapterInterface
	readonly reranker?: RerankerAdapterInterface

	// Configuration
	readonly autoSave?: boolean
}

// ============================================================================
// Error Types
// ============================================================================

/** VectorStore error codes */
export type VectorStoreErrorCode =
	| 'NOT_FOUND'
	| 'MODEL_MISMATCH'
	| 'DIMENSION_MISMATCH'
	| 'PERSISTENCE_ERROR'
	| 'EMBEDDING_ERROR'
	| 'NOT_LOADED'
	| 'UNKNOWN'

/** VectorStore error data interface */
export interface VectorStoreErrorData extends PackageErrorData<VectorStoreErrorCode> {
	readonly documentId?: string
}

// ============================================================================
// Behavioral Interfaces
// ============================================================================

/**
 * VectorStore interface - main entry point.
 *
 * Provides document storage, similarity search, and persistence.
 */
export interface VectorStoreInterface extends VectorStoreSubscriptions {
	// ---- Document Operations ----

	/**
	 * Add or update document(s).
	 * @param doc - Single document or array
	 */
	upsertDocument(doc: Document | readonly Document[]): Promise<void>

	/**
	 * Get document by ID.
	 * @param id - Document ID
	 */
	getDocument(id: string): Promise<StoredDocument | undefined>

	/**
	 * Get documents by IDs.
	 * @param ids - Document IDs
	 */
	getDocument(ids: readonly string[]): Promise<readonly (StoredDocument | undefined)[]>

	/**
	 * Remove document(s).
	 * @param id - Single ID or array
	 */
	removeDocument(id: string | readonly string[]): Promise<void>

	/**
	 * Check if document exists.
	 * @param id - Document ID
	 */
	hasDocument(id: string): Promise<boolean>

	/** Get all documents */
	all(): Promise<readonly StoredDocument[]>

	/** Get document count */
	count(): Promise<number>

	/** Clear all documents */
	clear(): Promise<void>

	// ---- Search Operations ----

	/**
	 * Similarity search.
	 * @param query - Query text
	 * @param options - Search options
	 */
	similaritySearch(query: string, options?: SimilaritySearchOptions): Promise<readonly ScoredResult[]>

	/**
	 * Hybrid search (vector + keyword).
	 * @param query - Query text
	 * @param options - Search options
	 */
	hybridSearch(query: string, options?: HybridSearchOptions): Promise<readonly ScoredResult[]>

	// ---- Metadata Operations ----

	/**
	 * Update document metadata only.
	 * @param id - Document ID
	 * @param metadata - New metadata
	 */
	updateMetadata(id: string, metadata: DocumentMetadata): Promise<void>

	// ---- Persistence Operations ----

	/**
	 * Load from persistence.
	 * @param options - Load options
	 */
	load(options?: LoadOptions): Promise<void>

	/** Save to persistence */
	save(): Promise<void>

	/** Reload from persistence */
	reload(): Promise<void>

	/** Re-embed all documents */
	reindex(): Promise<void>

	/** Check if loaded */
	isLoaded(): boolean

	// ---- Info Methods ----

	/** Get embedding model ID */
	getModelId(): string

	/** Get memory usage info */
	getMemoryInfo(): MemoryInfo

	// ---- Export/Import ----

	/** Export data */
	export(): Promise<ExportedVectorStore>

	/**
	 * Import data.
	 * @param data - Data to import
	 */
	import(data: ExportedVectorStore): Promise<void>

	// ---- Lifecycle ----

	/** Cleanup resources */
	destroy(): void
}

// ============================================================================
// Factory Function Types
// ============================================================================

/**
 * Factory function for creating vector store.
 *
 * @param embedding - Required embedding adapter
 * @param options - Optional adapters and configuration (all opt-in)
 */
export type CreateVectorStore = (
	embedding: EmbeddingAdapterInterface,
	options?: VectorStoreOptions
) => Promise<VectorStoreInterface>

/** Factory function for in-memory persistence adapter */
export type CreateInMemoryPersistenceAdapter = () => VectorStorePersistenceAdapterInterface

/** Factory function for IndexedDB persistence adapter */
export interface IndexedDBPersistenceAdapterOptions {
	readonly database: MinimalDatabaseAccess<StoredDocument>
	readonly documentsStore?: string
	readonly metadataStore?: string
}

export type CreateIndexedDBPersistenceAdapter = (
	options: IndexedDBPersistenceAdapterOptions
) => VectorStorePersistenceAdapterInterface

/** Factory function for OPFS persistence adapter */
export interface OPFSPersistenceAdapterOptions {
	readonly directory: MinimalDirectoryAccess
	readonly chunkSize?: number
}

export type CreateOPFSPersistenceAdapter = (
	options: OPFSPersistenceAdapterOptions
) => VectorStorePersistenceAdapterInterface

/** Factory function for HTTP persistence adapter */
export interface HTTPPersistenceAdapterOptions {
	readonly baseURL: string
	readonly headers?: Readonly<Record<string, string>>
}

export type CreateHTTPPersistenceAdapter = (
	options: HTTPPersistenceAdapterOptions
) => VectorStorePersistenceAdapterInterface
