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
 * Model mismatch error with additional context.
 */
export class ModelMismatchError extends VectorStoreError {
	readonly storedModelId: string
	readonly currentModelId: string

	constructor(storedModelId: string, currentModelId: string) {
		super(
			'MODEL_MISMATCH',
			`Model mismatch: stored embeddings use '${storedModelId}' but current adapter uses '${currentModelId}'`,
		)
		this.name = 'ModelMismatchError'
		this.storedModelId = storedModelId
		this.currentModelId = currentModelId
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
 * @returns True if error is a ModelMismatchError
 */
export function isModelMismatchError(error: unknown): error is ModelMismatchError {
	return error instanceof ModelMismatchError ||
		(isVectorStoreError(error) && error.code === 'MODEL_MISMATCH')
}

/**
 * Type guard for embedding errors.
 *
 * @param error - Value to check
 * @returns True if error is an embedding error
 */
export function isEmbeddingError(error: unknown): boolean {
	return isVectorStoreError(error) && error.code === 'EMBEDDING_FAILED'
}

/**
 * Type guard for persistence errors.
 *
 * @param error - Value to check
 * @returns True if error is a persistence error
 */
export function isPersistenceError(error: unknown): boolean {
	return isVectorStoreError(error) && (
		error.code === 'PERSISTENCE_FAILED' ||
		error.code === 'LOAD_FAILED' ||
		error.code === 'SAVE_FAILED'
	)
}

/**
 * Type guard for document errors.
 *
 * @param error - Value to check
 * @returns True if error is a document error
 */
export function isDocumentError(error: unknown): boolean {
	return isVectorStoreError(error) && (
		error.code === 'DOCUMENT_NOT_FOUND' ||
		error.code === 'INVALID_DOCUMENT' ||
		error.code === 'DUPLICATE_DOCUMENT'
	)
}

/**
 * Type guard for search errors.
 *
 * @param error - Value to check
 * @returns True if error is a search error
 */
export function isSearchError(error: unknown): boolean {
	return isVectorStoreError(error) && (
		error.code === 'SEARCH_FAILED' ||
		error.code === 'INVALID_QUERY'
	)
}

/**
 * Type guard for dimension mismatch errors.
 *
 * @param error - Value to check
 * @returns True if error is a dimension mismatch error
 */
export function isDimensionMismatchError(error: unknown): boolean {
	return isVectorStoreError(error) && error.code === 'DIMENSION_MISMATCH'
}
