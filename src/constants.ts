/**
 * @mikesaintsg/adapters
 *
 * Shared constants for the core library.
 */

// ============================================================================
// OpenAI Constants
// ============================================================================

/** Default OpenAI embedding model */
export const OPENAI_DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small'

/** Default dimensions for OpenAI text-embedding-3-small */
export const OPENAI_DEFAULT_EMBEDDING_DIMENSIONS = 1536

/** OpenAI API base URL */
export const OPENAI_API_BASE_URL = 'https://api.openai.com/v1'

// ============================================================================
// Voyage AI (Anthropic) Constants
// ============================================================================

/** Default Voyage AI embedding model (recommended by Anthropic) */
export const VOYAGE_DEFAULT_EMBEDDING_MODEL = 'voyage-2'

/** Default dimensions for Voyage AI voyage-2 */
export const VOYAGE_DEFAULT_EMBEDDING_DIMENSIONS = 1024

/** Voyage AI API base URL */
export const VOYAGE_API_BASE_URL = 'https://api.voyageai.com/v1'

// ============================================================================
// Embedding Cache Constants
// ============================================================================

/** Default maximum entries for embedding cache */
export const EMBEDDING_CACHE_DEFAULT_MAX_ENTRIES = 1000

// ============================================================================
// Batching Constants
// ============================================================================

/** Default maximum batch size for embedding requests */
export const EMBEDDING_BATCH_DEFAULT_MAX_SIZE = 100

/** Default flush delay in milliseconds for batched embeddings */
export const EMBEDDING_BATCH_DEFAULT_FLUSH_DELAY_MS = 50

// ============================================================================
// Persistence Constants
// ============================================================================

/** Default documents store name for IndexedDB persistence */
export const INDEXEDDB_DEFAULT_DOCUMENTS_STORE = 'documents'

/** Default metadata store name for IndexedDB persistence */
export const INDEXEDDB_DEFAULT_METADATA_STORE = 'metadata'

/** Metadata key for VectorStore in persistence */
export const VECTORSTORE_METADATA_KEY = 'vectorstore_metadata'

/** Default chunk size for OPFS persistence */
export const OPFS_DEFAULT_CHUNK_SIZE = 100

/** Metadata file name for OPFS persistence */
export const OPFS_METADATA_FILE = '_metadata.json'

/** Documents file name prefix for OPFS persistence */
export const OPFS_DOCUMENTS_PREFIX = 'chunk_'

/** Default timeout for HTTP persistence requests in milliseconds */
export const HTTP_DEFAULT_TIMEOUT = 30000
