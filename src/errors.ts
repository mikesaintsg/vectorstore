/**
 * @mikesaintsg/vectorstore
 *
 * Error utilities for vectorstore operations.
 */

import { EcosystemError } from '@mikesaintsg/core'
import type { VectorStoreErrorCode } from './types.js'

/**
 * VectorStore error class.
 */
export class VectorStoreError extends EcosystemError {
	readonly code: VectorStoreErrorCode

	constructor(code: VectorStoreErrorCode, message: string, cause?: Error) {
		super(message, cause)
		this.name = 'VectorStoreError'
		this.code = code
	}
}

/**
 * Type guard for VectorStore errors.
 *
 * @param error - Value to check
 * @returns True if error is a VectorStoreError
 */
export function isVectorStoreError(error: unknown): error is VectorStoreError {
	return error instanceof VectorStoreError
}

/**
 * Type guard for model mismatch errors.
 *
 * @param error - Value to check
 * @returns True if error is a model mismatch error
 */
export function isModelMismatchError(error: unknown): boolean {
	return isVectorStoreError(error) && error.code === 'MODEL_MISMATCH'
}

/**
 * Type guard for embedding errors.
 *
 * @param error - Value to check
 * @returns True if error is an embedding error
 */
export function isEmbeddingError(error: unknown): boolean {
	return isVectorStoreError(error) && error.code === 'EMBEDDING_ERROR'
}

/**
 * Type guard for persistence errors.
 *
 * @param error - Value to check
 * @returns True if error is a persistence error
 */
export function isPersistenceError(error: unknown): boolean {
	return isVectorStoreError(error) && error.code === 'PERSISTENCE_ERROR'
}
