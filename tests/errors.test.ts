/**
 * @mikesaintsg/adapters
 *
 * Tests for error utilities.
 */

import { describe, it, expect } from 'vitest'
import {
	CoreError,
	isCoreError,
	AdapterError,
	isAdapterError,
	hasAdapterErrorCode,
	extractRetryAfter,
	createAdapterErrorFromResponse,
} from '@mikesaintsg/adapters'

describe('errors', () => {
	describe('CoreError', () => {
		it('creates error with code and message', () => {
			const error = new CoreError('ADAPTER_ERROR', 'Test error')

			expect(error.code).toBe('ADAPTER_ERROR')
			expect(error.message).toBe('Test error')
			expect(error.name).toBe('CoreError')
		})

		it('includes cause when provided', () => {
			const cause = new Error('Original error')
			const error = new CoreError('TIMEOUT', 'Wrapped error', cause)

			expect(error.cause).toBe(cause)
		})
	})

	describe('isCoreError', () => {
		it('returns true for CoreError instances', () => {
			const error = new CoreError('NOT_FOUND', 'Not found')
			expect(isCoreError(error)).toBe(true)
		})

		it('returns false for regular Error', () => {
			const error = new Error('Regular error')
			expect(isCoreError(error)).toBe(false)
		})

		it('returns false for non-errors', () => {
			expect(isCoreError('string')).toBe(false)
			expect(isCoreError(null)).toBe(false)
			expect(isCoreError(undefined)).toBe(false)
		})
	})

	describe('AdapterError', () => {
		it('creates error with code and message', () => {
			const error = new AdapterError('RATE_LIMIT_ERROR', 'Rate limited')

			expect(error.code).toBe('RATE_LIMIT_ERROR')
			expect(error.message).toBe('Rate limited')
			expect(error.name).toBe('AdapterError')
		})

		it('includes optional data properties', () => {
			const error = new AdapterError('RATE_LIMIT_ERROR', 'Rate limited', {
				providerCode: 'rate_limit_exceeded',
				retryAfter: 60000,
				context: { requestId: 'req_123' },
			})

			expect(error.providerCode).toBe('rate_limit_exceeded')
			expect(error.retryAfter).toBe(60000)
			expect(error.context).toEqual({ requestId: 'req_123' })
		})

		it('includes cause when provided', () => {
			const cause = new Error('Original')
			const error = new AdapterError('NETWORK_ERROR', 'Network failed', undefined, cause)

			expect(error.cause).toBe(cause)
		})

		it('toData returns error data object', () => {
			const error = new AdapterError('AUTHENTICATION_ERROR', 'Auth failed', {
				providerCode: 'invalid_api_key',
			})

			const data = error.toData()

			expect(data.code).toBe('AUTHENTICATION_ERROR')
			expect(data.providerCode).toBe('invalid_api_key')
		})

		it('isRetryable returns true for retryable codes', () => {
			expect(new AdapterError('RATE_LIMIT_ERROR', 'x').isRetryable()).toBe(true)
			expect(new AdapterError('NETWORK_ERROR', 'x').isRetryable()).toBe(true)
			expect(new AdapterError('TIMEOUT_ERROR', 'x').isRetryable()).toBe(true)
			expect(new AdapterError('SERVICE_ERROR', 'x').isRetryable()).toBe(true)
		})

		it('isRetryable returns false for non-retryable codes', () => {
			expect(new AdapterError('AUTHENTICATION_ERROR', 'x').isRetryable()).toBe(false)
			expect(new AdapterError('INVALID_REQUEST_ERROR', 'x').isRetryable()).toBe(false)
			expect(new AdapterError('MODEL_NOT_FOUND_ERROR', 'x').isRetryable()).toBe(false)
		})
	})

	describe('isAdapterError', () => {
		it('returns true for AdapterError instances', () => {
			const error = new AdapterError('UNKNOWN_ERROR', 'Unknown')
			expect(isAdapterError(error)).toBe(true)
		})

		it('returns false for regular Error', () => {
			const error = new Error('Regular')
			expect(isAdapterError(error)).toBe(false)
		})

		it('returns false for CoreError', () => {
			const error = new CoreError('ADAPTER_ERROR', 'Core error')
			expect(isAdapterError(error)).toBe(false)
		})
	})

	describe('hasAdapterErrorCode', () => {
		it('returns true when code matches', () => {
			const error = new AdapterError('RATE_LIMIT_ERROR', 'Limited')
			expect(hasAdapterErrorCode(error, 'RATE_LIMIT_ERROR')).toBe(true)
		})

		it('returns false when code differs', () => {
			const error = new AdapterError('RATE_LIMIT_ERROR', 'Limited')
			expect(hasAdapterErrorCode(error, 'NETWORK_ERROR')).toBe(false)
		})

		it('returns false for non-AdapterError', () => {
			const error = new Error('Regular')
			expect(hasAdapterErrorCode(error, 'RATE_LIMIT_ERROR')).toBe(false)
		})
	})

	describe('extractRetryAfter', () => {
		it('extracts seconds value', () => {
			const headers = new Headers({ 'Retry-After': '60' })
			const response = new Response(null, { status: 429, headers })

			expect(extractRetryAfter(response)).toBe(60000)
		})

		it('returns undefined when header missing', () => {
			const response = new Response(null, { status: 429 })
			expect(extractRetryAfter(response)).toBeUndefined()
		})
	})

	describe('createAdapterErrorFromResponse', () => {
		it('maps 401 to AUTHENTICATION_ERROR', () => {
			const response = new Response(null, { status: 401 })
			const error = createAdapterErrorFromResponse(response, 'Auth failed')

			expect(error.code).toBe('AUTHENTICATION_ERROR')
		})

		it('maps 429 to RATE_LIMIT_ERROR', () => {
			const response = new Response(null, { status: 429 })
			const error = createAdapterErrorFromResponse(response, 'Rate limited')

			expect(error.code).toBe('RATE_LIMIT_ERROR')
		})

		it('maps 500 to SERVICE_ERROR', () => {
			const response = new Response(null, { status: 500 })
			const error = createAdapterErrorFromResponse(response, 'Server error')

			expect(error.code).toBe('SERVICE_ERROR')
		})

		it('includes context with status info', () => {
			const response = new Response(null, { status: 404, statusText: 'Not Found' })
			const error = createAdapterErrorFromResponse(response, 'Not found')

			expect(error.context?.status).toBe(404)
			expect(error.context?.statusText).toBe('Not Found')
		})

		it('includes provider code when provided', () => {
			const response = new Response(null, { status: 400 })
			const error = createAdapterErrorFromResponse(response, 'Bad request', 'invalid_model')

			expect(error.providerCode).toBe('invalid_model')
		})
	})
})
