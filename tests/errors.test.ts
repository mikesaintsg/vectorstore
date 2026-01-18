/**
 * @mikesaintsg/vectorstore
 *
 * Error utilities tests.
 */

import { describe, it, expect } from 'vitest'
import {
	VectorStoreError,
	ModelMismatchError,
	isVectorStoreError,
	isModelMismatchError,
	isEmbeddingError,
	isPersistenceError,
	isDocumentError,
	isSearchError,
	isDimensionMismatchError,
} from '@mikesaintsg/vectorstore'

describe('VectorStoreError', () => {
	it('creates error with code and message', () => {
		const error = new VectorStoreError('MODEL_MISMATCH', 'Test message')
		expect(error.code).toBe('MODEL_MISMATCH')
		expect(error.message).toBe('Test message')
		expect(error.name).toBe('VectorStoreError')
	})

	it('creates error with cause', () => {
		const cause = new Error('Original error')
		const error = new VectorStoreError('EMBEDDING_FAILED', 'Test message', cause)
		expect(error.cause).toBe(cause)
	})

	it('extends Error', () => {
		const error = new VectorStoreError('UNKNOWN_ERROR', 'Test')
		expect(error).toBeInstanceOf(Error)
	})
})

describe('ModelMismatchError', () => {
	it('creates error with model IDs', () => {
		const error = new ModelMismatchError('openai:old', 'openai:new')
		expect(error.storedModelId).toBe('openai:old')
		expect(error.currentModelId).toBe('openai:new')
		expect(error.code).toBe('MODEL_MISMATCH')
		expect(error.name).toBe('ModelMismatchError')
	})

	it('includes model IDs in message', () => {
		const error = new ModelMismatchError('model1', 'model2')
		expect(error.message).toContain('model1')
		expect(error.message).toContain('model2')
	})

	it('extends VectorStoreError', () => {
		const error = new ModelMismatchError('a', 'b')
		expect(error).toBeInstanceOf(VectorStoreError)
	})
})

describe('isVectorStoreError', () => {
	it('returns true for VectorStoreError', () => {
		const error = new VectorStoreError('NOT_LOADED', 'Test')
		expect(isVectorStoreError(error)).toBe(true)
	})

	it('returns true for ModelMismatchError', () => {
		const error = new ModelMismatchError('a', 'b')
		expect(isVectorStoreError(error)).toBe(true)
	})

	it('returns false for regular Error', () => {
		const error = new Error('Test')
		expect(isVectorStoreError(error)).toBe(false)
	})

	it('returns false for non-error', () => {
		expect(isVectorStoreError(null)).toBe(false)
		expect(isVectorStoreError(undefined)).toBe(false)
		expect(isVectorStoreError('error')).toBe(false)
		expect(isVectorStoreError({ code: 'MODEL_MISMATCH' })).toBe(false)
	})
})

describe('isModelMismatchError', () => {
	it('returns true for ModelMismatchError', () => {
		const error = new ModelMismatchError('a', 'b')
		expect(isModelMismatchError(error)).toBe(true)
	})

	it('returns true for VectorStoreError with MODEL_MISMATCH code', () => {
		const error = new VectorStoreError('MODEL_MISMATCH', 'Test')
		expect(isModelMismatchError(error)).toBe(true)
	})

	it('returns false for other errors', () => {
		const error = new VectorStoreError('NOT_LOADED', 'Test')
		expect(isModelMismatchError(error)).toBe(false)
	})
})

describe('isEmbeddingError', () => {
	it('returns true for EMBEDDING_FAILED', () => {
		const error = new VectorStoreError('EMBEDDING_FAILED', 'Test')
		expect(isEmbeddingError(error)).toBe(true)
	})

	it('returns false for other codes', () => {
		const error = new VectorStoreError('MODEL_MISMATCH', 'Test')
		expect(isEmbeddingError(error)).toBe(false)
	})
})

describe('isPersistenceError', () => {
	it('returns true for PERSISTENCE_FAILED', () => {
		const error = new VectorStoreError('PERSISTENCE_FAILED', 'Test')
		expect(isPersistenceError(error)).toBe(true)
	})

	it('returns true for LOAD_FAILED', () => {
		const error = new VectorStoreError('LOAD_FAILED', 'Test')
		expect(isPersistenceError(error)).toBe(true)
	})

	it('returns true for SAVE_FAILED', () => {
		const error = new VectorStoreError('SAVE_FAILED', 'Test')
		expect(isPersistenceError(error)).toBe(true)
	})

	it('returns false for other codes', () => {
		const error = new VectorStoreError('MODEL_MISMATCH', 'Test')
		expect(isPersistenceError(error)).toBe(false)
	})
})

describe('isDocumentError', () => {
	it('returns true for DOCUMENT_NOT_FOUND', () => {
		const error = new VectorStoreError('DOCUMENT_NOT_FOUND', 'Test')
		expect(isDocumentError(error)).toBe(true)
	})

	it('returns true for INVALID_DOCUMENT', () => {
		const error = new VectorStoreError('INVALID_DOCUMENT', 'Test')
		expect(isDocumentError(error)).toBe(true)
	})

	it('returns true for DUPLICATE_DOCUMENT', () => {
		const error = new VectorStoreError('DUPLICATE_DOCUMENT', 'Test')
		expect(isDocumentError(error)).toBe(true)
	})

	it('returns false for other codes', () => {
		const error = new VectorStoreError('MODEL_MISMATCH', 'Test')
		expect(isDocumentError(error)).toBe(false)
	})
})

describe('isSearchError', () => {
	it('returns true for SEARCH_FAILED', () => {
		const error = new VectorStoreError('SEARCH_FAILED', 'Test')
		expect(isSearchError(error)).toBe(true)
	})

	it('returns true for INVALID_QUERY', () => {
		const error = new VectorStoreError('INVALID_QUERY', 'Test')
		expect(isSearchError(error)).toBe(true)
	})

	it('returns false for other codes', () => {
		const error = new VectorStoreError('MODEL_MISMATCH', 'Test')
		expect(isSearchError(error)).toBe(false)
	})
})

describe('isDimensionMismatchError', () => {
	it('returns true for DIMENSION_MISMATCH', () => {
		const error = new VectorStoreError('DIMENSION_MISMATCH', 'Test')
		expect(isDimensionMismatchError(error)).toBe(true)
	})

	it('returns false for other codes', () => {
		const error = new VectorStoreError('MODEL_MISMATCH', 'Test')
		expect(isDimensionMismatchError(error)).toBe(false)
	})
})

describe('error code coverage', () => {
	const allCodes = [
		'EMBEDDING_FAILED',
		'MODEL_MISMATCH',
		'DIMENSION_MISMATCH',
		'PERSISTENCE_FAILED',
		'LOAD_FAILED',
		'SAVE_FAILED',
		'DOCUMENT_NOT_FOUND',
		'INVALID_DOCUMENT',
		'DUPLICATE_DOCUMENT',
		'SEARCH_FAILED',
		'INVALID_QUERY',
		'NOT_LOADED',
		'UNKNOWN_ERROR',
	] as const

	it.each(allCodes)('can create VectorStoreError with code: %s', (code) => {
		const error = new VectorStoreError(code, `Error with code ${code}`)
		expect(error.code).toBe(code)
		expect(isVectorStoreError(error)).toBe(true)
	})
})
