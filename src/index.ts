/**
 * @mikesaintsg/vectorstore
 *
 * Type-safe vector storage and semantic search library.
 * Zero runtime dependencies.
 */

// Factory functions
export { createVectorStore } from './factories.js'

// Error classes
export {
	VectorStoreError,
	isVectorStoreError,
	isModelMismatchError,
	isEmbeddingError,
	isPersistenceError,
} from './errors.js'

// Helper functions
export {
	cosineSimilarity,
	dotProductSimilarity,
	euclideanSimilarity,
	normalizeVector,
	computeKeywordScore,
	tokenize,
	estimateDocumentBytes,
	isDocument,
	dimensionsMatch,
} from './helpers.js'

// Constants
export {
	DEFAULT_SEARCH_LIMIT,
	DEFAULT_VECTOR_WEIGHT,
	DEFAULT_KEYWORD_WEIGHT,
	EXPORT_VERSION,
	BYTES_PER_DIMENSION,
	BYTES_PER_CHAR,
	DEFAULT_OBJECT_OVERHEAD,
} from './constants.js'

// Types (export all types from this package only - NO re-exports from core)
export type {
	Document,
	DocumentMetadata,
	MetadataFilter,
	SimilaritySearchOptions,
	HybridSearchOptions,
	MemoryInfo,
	ExportedVectorStore,
	LoadOptions,
	VectorStoreSubscriptions,
	VectorStoreOptions,
	VectorStoreErrorCode,
	VectorStoreInterface,
	CreateVectorStore,
} from './types.js'
