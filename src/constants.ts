/**
 * @mikesaintsg/vectorstore
 *
 * Shared constants for the vectorstore library.
 */

/** Default search limit */
export const DEFAULT_SEARCH_LIMIT = 10

/** Default vector weight for hybrid search */
export const DEFAULT_VECTOR_WEIGHT = 0.7

/** Default keyword weight for hybrid search */
export const DEFAULT_KEYWORD_WEIGHT = 0.3

/** Export data version */
export const EXPORT_VERSION = 1

/** Bytes per embedding dimension (Float32) */
export const BYTES_PER_DIMENSION = 4

/** Approximate bytes per character in strings */
export const BYTES_PER_CHAR = 2

/** Default object overhead for memory estimation */
export const DEFAULT_OBJECT_OVERHEAD = 64
