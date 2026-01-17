/**
 * @mikesaintsg/adapters
 *
 * Tests for provider error mapping.
 */

import { describe, it, expect } from 'vitest'
import {
	mapOpenAIError,
	mapAnthropicError,
	mapOllamaError,
	mapNetworkError,
	isRetryableError,
} from '@mikesaintsg/adapters'
import { AdapterError } from '@mikesaintsg/adapters'

/**
 * Create a mock Response object for testing.
 */
function createMockResponse(
	status: number,
	headers: Record<string, string> = {},
): Response {
	return {
		status,
		statusText: getStatusText(status),
		headers: new Headers(headers),
	} as Response
}

function getStatusText(status: number): string {
	const statusTexts: Record<number, string> = {
		200: 'OK',
		400: 'Bad Request',
		401: 'Unauthorized',
		403: 'Forbidden',
		404: 'Not Found',
		429: 'Too Many Requests',
		500: 'Internal Server Error',
		502: 'Bad Gateway',
		503: 'Service Unavailable',
		504: 'Gateway Timeout',
	}
	return statusTexts[status] ?? 'Unknown'
}

describe('Error Mapping', () => {
	describe('mapOpenAIError', () => {
		it('maps authentication error from error type', () => {
			const response = createMockResponse(401)
			const body = {
				error: {
					message: 'Invalid API key',
					type: 'invalid_api_key',
				},
			}

			const error = mapOpenAIError(response, body)

			expect(error.code).toBe('AUTHENTICATION_ERROR')
			expect(error.message).toBe('Invalid API key')
			expect(error.providerCode).toBe('invalid_api_key')
		})

		it('maps rate limit error with retry-after', () => {
			const response = createMockResponse(429, { 'Retry-After': '60' })
			const body = {
				error: {
					message: 'Rate limit exceeded',
					type: 'rate_limit_error',
				},
			}

			const error = mapOpenAIError(response, body)

			expect(error.code).toBe('RATE_LIMIT_ERROR')
			expect(error.retryAfter).toBe(60000)
		})

		it('maps quota exceeded error', () => {
			const response = createMockResponse(429)
			const body = {
				error: {
					message: 'Quota exceeded',
					code: 'insufficient_quota',
				},
			}

			const error = mapOpenAIError(response, body)

			expect(error.code).toBe('QUOTA_EXCEEDED_ERROR')
		})

		it('maps context length exceeded error', () => {
			const response = createMockResponse(400)
			const body = {
				error: {
					message: 'Context length exceeded',
					code: 'context_length_exceeded',
				},
			}

			const error = mapOpenAIError(response, body)

			expect(error.code).toBe('CONTEXT_LENGTH_ERROR')
		})

		it('maps model not found error', () => {
			const response = createMockResponse(404)
			const body = {
				error: {
					message: 'Model not found',
					code: 'model_not_found',
				},
			}

			const error = mapOpenAIError(response, body)

			expect(error.code).toBe('MODEL_NOT_FOUND_ERROR')
		})

		it('maps content filter error', () => {
			const response = createMockResponse(400)
			const body = {
				error: {
					message: 'Content policy violation',
					code: 'content_policy_violation',
				},
			}

			const error = mapOpenAIError(response, body)

			expect(error.code).toBe('CONTENT_FILTER_ERROR')
		})

		it('maps service error from status code', () => {
			const response = createMockResponse(500)
			const body = {
				error: {
					message: 'Internal server error',
				},
			}

			const error = mapOpenAIError(response, body)

			expect(error.code).toBe('SERVICE_ERROR')
		})

		it('includes context in error', () => {
			const response = createMockResponse(400)
			const body = {
				error: {
					message: 'Invalid parameter',
					type: 'invalid_request_error',
					param: 'messages',
				},
			}

			const error = mapOpenAIError(response, body)

			expect(error.context?.status).toBe(400)
			expect(error.context?.param).toBe('messages')
		})

		it('handles empty body gracefully', () => {
			const response = createMockResponse(500)

			const error = mapOpenAIError(response, {})

			expect(error.code).toBe('SERVICE_ERROR')
			expect(error.message).toContain('500')
		})

		it('handles undefined body gracefully', () => {
			const response = createMockResponse(500)

			const error = mapOpenAIError(response, undefined)

			expect(error.code).toBe('SERVICE_ERROR')
		})
	})

	describe('mapAnthropicError', () => {
		it('maps authentication error', () => {
			const response = createMockResponse(401)
			const body = {
				type: 'error',
				error: {
					type: 'authentication_error',
					message: 'Invalid API key',
				},
			}

			const error = mapAnthropicError(response, body)

			expect(error.code).toBe('AUTHENTICATION_ERROR')
			expect(error.message).toBe('Invalid API key')
		})

		it('maps rate limit error', () => {
			const response = createMockResponse(429, { 'Retry-After': '30' })
			const body = {
				type: 'error',
				error: {
					type: 'rate_limit_error',
					message: 'Rate limit exceeded',
				},
			}

			const error = mapAnthropicError(response, body)

			expect(error.code).toBe('RATE_LIMIT_ERROR')
			expect(error.retryAfter).toBe(30000)
		})

		it('maps overloaded error as rate limit', () => {
			const response = createMockResponse(529)
			const body = {
				type: 'error',
				error: {
					type: 'overloaded_error',
					message: 'API is overloaded',
				},
			}

			const error = mapAnthropicError(response, body)

			expect(error.code).toBe('RATE_LIMIT_ERROR')
		})

		it('maps not found error', () => {
			const response = createMockResponse(404)
			const body = {
				type: 'error',
				error: {
					type: 'not_found_error',
					message: 'Model not found',
				},
			}

			const error = mapAnthropicError(response, body)

			expect(error.code).toBe('MODEL_NOT_FOUND_ERROR')
		})

		it('maps invalid request error', () => {
			const response = createMockResponse(400)
			const body = {
				type: 'error',
				error: {
					type: 'invalid_request_error',
					message: 'Invalid request',
				},
			}

			const error = mapAnthropicError(response, body)

			expect(error.code).toBe('INVALID_REQUEST_ERROR')
		})

		it('includes error type in context', () => {
			const response = createMockResponse(400)
			const body = {
				type: 'error',
				error: {
					type: 'invalid_request_error',
					message: 'Invalid request',
				},
			}

			const error = mapAnthropicError(response, body)

			expect(error.context?.errorType).toBe('invalid_request_error')
		})

		it('handles empty body gracefully', () => {
			const response = createMockResponse(500)

			const error = mapAnthropicError(response, {})

			expect(error.code).toBe('SERVICE_ERROR')
		})
	})

	describe('mapOllamaError', () => {
		it('maps model not found error from message', () => {
			const response = createMockResponse(404)
			const body = {
				error: 'model "nonexistent" not found',
			}

			const error = mapOllamaError(response, body)

			expect(error.code).toBe('MODEL_NOT_FOUND_ERROR')
			expect(error.message).toContain('not found')
		})

		it('maps context length error from message', () => {
			const response = createMockResponse(400)
			const body = {
				error: 'context length exceeded',
			}

			const error = mapOllamaError(response, body)

			expect(error.code).toBe('CONTEXT_LENGTH_ERROR')
		})

		it('maps timeout error from message', () => {
			const response = createMockResponse(504)
			const body = {
				error: 'request timeout',
			}

			const error = mapOllamaError(response, body)

			expect(error.code).toBe('TIMEOUT_ERROR')
		})

		it('maps connection refused as network error', () => {
			const response = createMockResponse(500)
			const body = {
				error: 'connection refused',
			}

			const error = mapOllamaError(response, body)

			expect(error.code).toBe('NETWORK_ERROR')
		})

		it('maps invalid request from message', () => {
			const response = createMockResponse(400)
			const body = {
				error: 'invalid request format',
			}

			const error = mapOllamaError(response, body)

			expect(error.code).toBe('INVALID_REQUEST_ERROR')
		})

		it('falls back to HTTP status mapping', () => {
			const response = createMockResponse(500)
			const body = {
				error: 'unknown error occurred',
			}

			const error = mapOllamaError(response, body)

			expect(error.code).toBe('SERVICE_ERROR')
		})

		it('handles empty body gracefully', () => {
			const response = createMockResponse(500)

			const error = mapOllamaError(response, {})

			expect(error.code).toBe('SERVICE_ERROR')
		})

		it('handles model pull failure', () => {
			const response = createMockResponse(404)
			const body = {
				error: 'pull model failed: model does not exist',
			}

			const error = mapOllamaError(response, body)

			expect(error.code).toBe('MODEL_NOT_FOUND_ERROR')
		})
	})

	describe('mapNetworkError', () => {
		it('maps timeout error from message', () => {
			const originalError = new Error('Request timeout')

			const error = mapNetworkError(originalError)

			expect(error.code).toBe('TIMEOUT_ERROR')
			expect(error.cause).toBe(originalError)
		})

		it('maps abort error', () => {
			const originalError = new Error('Aborted')
			originalError.name = 'AbortError'

			const error = mapNetworkError(originalError)

			expect(error.code).toBe('TIMEOUT_ERROR')
		})

		it('maps aborted message as timeout', () => {
			const originalError = new Error('The request was aborted')

			const error = mapNetworkError(originalError)

			expect(error.code).toBe('TIMEOUT_ERROR')
		})

		it('maps generic fetch error as network error', () => {
			const originalError = new Error('Failed to fetch')

			const error = mapNetworkError(originalError)

			expect(error.code).toBe('NETWORK_ERROR')
		})

		it('preserves original error as cause', () => {
			const originalError = new Error('Network failure')

			const error = mapNetworkError(originalError)

			expect(error.cause).toBe(originalError)
			expect(error.message).toBe('Network failure')
		})
	})

	describe('isRetryableError', () => {
		it('returns true for rate limit error', () => {
			const error = new AdapterError('RATE_LIMIT_ERROR', 'Rate limited')
			expect(isRetryableError(error)).toBe(true)
		})

		it('returns true for network error', () => {
			const error = new AdapterError('NETWORK_ERROR', 'Network failed')
			expect(isRetryableError(error)).toBe(true)
		})

		it('returns true for timeout error', () => {
			const error = new AdapterError('TIMEOUT_ERROR', 'Timed out')
			expect(isRetryableError(error)).toBe(true)
		})

		it('returns true for service error', () => {
			const error = new AdapterError('SERVICE_ERROR', 'Service down')
			expect(isRetryableError(error)).toBe(true)
		})

		it('returns false for authentication error', () => {
			const error = new AdapterError('AUTHENTICATION_ERROR', 'Invalid key')
			expect(isRetryableError(error)).toBe(false)
		})

		it('returns false for invalid request error', () => {
			const error = new AdapterError('INVALID_REQUEST_ERROR', 'Bad request')
			expect(isRetryableError(error)).toBe(false)
		})

		it('returns false for quota exceeded error', () => {
			const error = new AdapterError('QUOTA_EXCEEDED_ERROR', 'No quota')
			expect(isRetryableError(error)).toBe(false)
		})

		it('returns false for content filter error', () => {
			const error = new AdapterError('CONTENT_FILTER_ERROR', 'Filtered')
			expect(isRetryableError(error)).toBe(false)
		})

		it('returns false for unknown error', () => {
			const error = new AdapterError('UNKNOWN_ERROR', 'Unknown')
			expect(isRetryableError(error)).toBe(false)
		})
	})
})
