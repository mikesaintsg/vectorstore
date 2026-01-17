/**
 * @mikesaintsg/adapters
 *
 * Provider-specific error mapping utilities.
 * Maps OpenAI, Anthropic, and Ollama error responses to AdapterError.
 */

import type { AdapterErrorCode } from '../types.js'
import { AdapterError } from '../errors.js'

// ============================================================================
// OpenAI Error Mapping
// ============================================================================

/**
 * OpenAI error response structure.
 */
interface OpenAIErrorResponse {
	readonly error?: {
		readonly message?: string
		readonly type?: string
		readonly code?: string
		readonly param?: string | null
	}
}

/**
 * Map OpenAI error type/code to AdapterErrorCode.
 */
const OPENAI_ERROR_MAP: Readonly<Record<string, AdapterErrorCode>> = {
	// Error types
	'invalid_api_key': 'AUTHENTICATION_ERROR',
	'authentication_error': 'AUTHENTICATION_ERROR',
	'invalid_request_error': 'INVALID_REQUEST_ERROR',
	'rate_limit_error': 'RATE_LIMIT_ERROR',
	'rate_limit_exceeded': 'RATE_LIMIT_ERROR',
	'tokens_exceeded_error': 'RATE_LIMIT_ERROR',
	'insufficient_quota': 'QUOTA_EXCEEDED_ERROR',
	'billing_hard_limit_reached': 'QUOTA_EXCEEDED_ERROR',
	'context_length_exceeded': 'CONTEXT_LENGTH_ERROR',
	'model_not_found': 'MODEL_NOT_FOUND_ERROR',
	'content_policy_violation': 'CONTENT_FILTER_ERROR',
	'content_filter': 'CONTENT_FILTER_ERROR',
	'server_error': 'SERVICE_ERROR',
	'api_error': 'SERVICE_ERROR',
	'timeout': 'TIMEOUT_ERROR',
}

/**
 * Creates an AdapterError from an OpenAI API error response.
 *
 * @param response - The fetch Response object
 * @param body - The parsed error response body
 * @returns An AdapterError with appropriate code and metadata
 *
 * @example
 * ```ts
 * const response = await fetch(openaiUrl, options)
 * if (!response.ok) {
 *   const body = await response.json()
 *   throw mapOpenAIError(response, body)
 * }
 * ```
 */
export function mapOpenAIError(
	response: Response,
	body: unknown,
): AdapterError {
	const errorBody = body as OpenAIErrorResponse
	const error = errorBody?.error

	const message = error?.message ?? `OpenAI API error: ${response.status}`
	const providerCode = error?.code ?? error?.type

	// Determine error code from provider code or HTTP status
	let code: AdapterErrorCode = 'UNKNOWN_ERROR'
	if (providerCode && OPENAI_ERROR_MAP[providerCode]) {
		code = OPENAI_ERROR_MAP[providerCode]
	} else {
		code = mapHttpStatusToErrorCode(response.status)
	}

	// Extract retry-after for rate limit errors
	const retryAfter = extractRetryAfterMs(response)

	// Build data object with only defined properties
	const data: {
		providerCode?: string
		retryAfter?: number
		context: Record<string, unknown>
	} = {
		context: {
			status: response.status,
			type: error?.type,
			param: error?.param,
		},
	}
	if (providerCode !== undefined) {
		data.providerCode = providerCode
	}
	if (code === 'RATE_LIMIT_ERROR' && retryAfter !== undefined) {
		data.retryAfter = retryAfter
	}

	return new AdapterError(code, message, data)
}

// ============================================================================
// Anthropic Error Mapping
// ============================================================================

/**
 * Anthropic error response structure.
 */
interface AnthropicErrorResponse {
	readonly type?: 'error'
	readonly error?: {
		readonly type?: string
		readonly message?: string
	}
}

/**
 * Map Anthropic error type to AdapterErrorCode.
 */
const ANTHROPIC_ERROR_MAP: Readonly<Record<string, AdapterErrorCode>> = {
	'authentication_error': 'AUTHENTICATION_ERROR',
	'invalid_api_key': 'AUTHENTICATION_ERROR',
	'permission_error': 'AUTHENTICATION_ERROR',
	'not_found_error': 'MODEL_NOT_FOUND_ERROR',
	'rate_limit_error': 'RATE_LIMIT_ERROR',
	'overloaded_error': 'RATE_LIMIT_ERROR',
	'invalid_request_error': 'INVALID_REQUEST_ERROR',
	'api_error': 'SERVICE_ERROR',
}

/**
 * Creates an AdapterError from an Anthropic API error response.
 *
 * @param response - The fetch Response object
 * @param body - The parsed error response body
 * @returns An AdapterError with appropriate code and metadata
 *
 * @example
 * ```ts
 * const response = await fetch(anthropicUrl, options)
 * if (!response.ok) {
 *   const body = await response.json()
 *   throw mapAnthropicError(response, body)
 * }
 * ```
 */
export function mapAnthropicError(
	response: Response,
	body: unknown,
): AdapterError {
	const errorBody = body as AnthropicErrorResponse
	const error = errorBody?.error

	const message = error?.message ?? `Anthropic API error: ${response.status}`
	const providerCode = error?.type

	// Determine error code from provider code or HTTP status
	let code: AdapterErrorCode = 'UNKNOWN_ERROR'
	if (providerCode && ANTHROPIC_ERROR_MAP[providerCode]) {
		code = ANTHROPIC_ERROR_MAP[providerCode]
	} else {
		code = mapHttpStatusToErrorCode(response.status)
	}

	// Extract retry-after for rate limit errors
	const retryAfter = extractRetryAfterMs(response)

	// Build data object with only defined properties
	const data: {
		providerCode?: string
		retryAfter?: number
		context: Record<string, unknown>
	} = {
		context: {
			status: response.status,
			errorType: error?.type,
		},
	}
	if (providerCode !== undefined) {
		data.providerCode = providerCode
	}
	if (code === 'RATE_LIMIT_ERROR' && retryAfter !== undefined) {
		data.retryAfter = retryAfter
	}

	return new AdapterError(code, message, data)
}

// ============================================================================
// Ollama Error Mapping
// ============================================================================

/**
 * Ollama error response structure.
 */
interface OllamaErrorResponse {
	readonly error?: string
}

/**
 * Map Ollama error messages to AdapterErrorCode.
 */
const OLLAMA_ERROR_PATTERNS: readonly {
	readonly pattern: RegExp
	readonly code: AdapterErrorCode
}[] = [
	{ pattern: /model.*not found/i, code: 'MODEL_NOT_FOUND_ERROR' },
	{ pattern: /model.*does not exist/i, code: 'MODEL_NOT_FOUND_ERROR' },
	{ pattern: /pull.*failed/i, code: 'MODEL_NOT_FOUND_ERROR' },
	{ pattern: /context length/i, code: 'CONTEXT_LENGTH_ERROR' },
	{ pattern: /context.*exceeded/i, code: 'CONTEXT_LENGTH_ERROR' },
	{ pattern: /timeout/i, code: 'TIMEOUT_ERROR' },
	{ pattern: /connection.*refused/i, code: 'NETWORK_ERROR' },
	{ pattern: /connection.*failed/i, code: 'NETWORK_ERROR' },
	{ pattern: /invalid.*request/i, code: 'INVALID_REQUEST_ERROR' },
	{ pattern: /bad.*request/i, code: 'INVALID_REQUEST_ERROR' },
]

/**
 * Creates an AdapterError from an Ollama API error response.
 *
 * @param response - The fetch Response object
 * @param body - The parsed error response body
 * @returns An AdapterError with appropriate code and metadata
 *
 * @example
 * ```ts
 * const response = await fetch(ollamaUrl, options)
 * if (!response.ok) {
 *   const body = await response.json()
 *   throw mapOllamaError(response, body)
 * }
 * ```
 */
export function mapOllamaError(
	response: Response,
	body: unknown,
): AdapterError {
	const errorBody = body as OllamaErrorResponse
	const errorMessage = errorBody?.error

	const message = errorMessage ?? `Ollama API error: ${response.status}`

	// Try to match error message patterns
	let code: AdapterErrorCode = mapHttpStatusToErrorCode(response.status)
	if (errorMessage) {
		for (const { pattern, code: matchCode } of OLLAMA_ERROR_PATTERNS) {
			if (pattern.test(errorMessage)) {
				code = matchCode
				break
			}
		}
	}

	return new AdapterError(code, message, {
		context: {
			status: response.status,
		},
	})
}

// ============================================================================
// Network Error Mapping
// ============================================================================

/**
 * Creates an AdapterError from a network error (fetch failed).
 *
 * @param error - The original Error from fetch
 * @returns An AdapterError with appropriate code
 *
 * @example
 * ```ts
 * try {
 *   const response = await fetch(url, options)
 * } catch (error) {
 *   throw mapNetworkError(error)
 * }
 * ```
 */
export function mapNetworkError(error: Error): AdapterError {
	const message = error.message

	// Check for timeout
	if (message.includes('timeout') || message.includes('aborted')) {
		return new AdapterError('TIMEOUT_ERROR', message, undefined, error)
	}

	// Check for abort
	if (error.name === 'AbortError') {
		return new AdapterError('TIMEOUT_ERROR', 'Request was aborted', undefined, error)
	}

	// Default to network error
	return new AdapterError('NETWORK_ERROR', message, undefined, error)
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map HTTP status code to AdapterErrorCode.
 */
function mapHttpStatusToErrorCode(status: number): AdapterErrorCode {
	switch (status) {
		case 401:
		case 403:
			return 'AUTHENTICATION_ERROR'
		case 429:
			return 'RATE_LIMIT_ERROR'
		case 400:
			return 'INVALID_REQUEST_ERROR'
		case 404:
			return 'MODEL_NOT_FOUND_ERROR'
		case 500:
		case 502:
		case 503:
		case 504:
			return 'SERVICE_ERROR'
		default:
			return 'UNKNOWN_ERROR'
	}
}

/**
 * Extract Retry-After header value in milliseconds.
 */
function extractRetryAfterMs(response: Response): number | undefined {
	const retryAfter = response.headers.get('Retry-After')
	if (!retryAfter) return undefined

	// Check if it's a number (seconds)
	const seconds = parseInt(retryAfter, 10)
	if (!isNaN(seconds)) {
		return seconds * 1000
	}

	// Try to parse as HTTP date
	const date = Date.parse(retryAfter)
	if (!isNaN(date)) {
		return Math.max(0, date - Date.now())
	}

	return undefined
}

/**
 * Check if an error is retryable based on its code.
 *
 * @param error - The AdapterError to check
 * @returns True if the error is retryable
 */
export function isRetryableError(error: AdapterError): boolean {
	const retryableCodes: readonly AdapterErrorCode[] = [
		'RATE_LIMIT_ERROR',
		'NETWORK_ERROR',
		'TIMEOUT_ERROR',
		'SERVICE_ERROR',
	]
	return retryableCodes.includes(error.code)
}
