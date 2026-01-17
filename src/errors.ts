/**
 * @mikesaintsg/adapters
 *
 * Error utilities for adapter operations.
 */

import type { AdapterErrorCode, AdapterErrorData } from './types.js'

// ============================================================================
// Core Error Codes
// ============================================================================

/** Core package error codes */
export type CoreErrorCode =
	| 'ADAPTER_ERROR'
	| 'BRIDGE_ERROR'
	| 'VALIDATION_ERROR'
	| 'NOT_FOUND'
	| 'TIMEOUT'
	| 'ABORTED'

// ============================================================================
// Core Error Class
// ============================================================================

/**
 * Core package error.
 *
 * @example
 * ```ts
 * throw new CoreError('ADAPTER_ERROR', 'Failed to connect to OpenAI')
 * ```
 */
export class CoreError extends Error {
	readonly code: CoreErrorCode
	override readonly cause: Error | undefined

	constructor(code: CoreErrorCode, message: string, cause?: Error) {
		super(message)
		this.name = 'CoreError'
		this.code = code
		this.cause = cause
	}
}

/**
 * Type guard to check if an error is a CoreError.
 *
 * @param error - The value to check
 * @returns True if the error is a CoreError
 *
 * @example
 * ```ts
 * try {
 *   await adapter.embed(['text'])
 * } catch (error) {
 *   if (isCoreError(error)) {
 *     console.log('Code:', error.code)
 *   }
 * }
 * ```
 */
export function isCoreError(error: unknown): error is CoreError {
	return error instanceof CoreError
}

// ============================================================================
// Adapter Error Class
// ============================================================================

/**
 * Error class for adapter operations (provider, embedding, persistence).
 *
 * Contains structured error data including provider-specific error codes,
 * retry information, and additional context for debugging.
 *
 * @example
 * ```ts
 * throw new AdapterError('RATE_LIMIT_ERROR', 'Rate limit exceeded', {
 *   providerCode: 'rate_limit_exceeded',
 *   retryAfter: 60000,
 *   context: { requestId: 'req_123' },
 * })
 * ```
 */
export class AdapterError extends Error {
	/** Adapter error code */
	readonly code: AdapterErrorCode

	/** Provider-specific error code */
	readonly providerCode: string | undefined

	/** Retry after in milliseconds (for rate limit errors) */
	readonly retryAfter: number | undefined

	/** Additional context for debugging */
	readonly context: Readonly<Record<string, unknown>> | undefined

	/** Original error that caused this one */
	override readonly cause: Error | undefined

	constructor(
		code: AdapterErrorCode,
		message: string,
		data?: {
			readonly providerCode?: string
			readonly retryAfter?: number
			readonly context?: Readonly<Record<string, unknown>>
		},
		cause?: Error,
	) {
		super(message)
		this.name = 'AdapterError'
		this.code = code
		this.providerCode = data?.providerCode
		this.retryAfter = data?.retryAfter
		this.context = data?.context
		this.cause = cause
	}

	/**
	 * Get structured error data for serialization.
	 *
	 * @returns The error data object
	 */
	toData(): AdapterErrorData {
		const result: AdapterErrorData = { code: this.code }
		if (this.providerCode !== undefined) {
			(result as { providerCode?: string }).providerCode = this.providerCode
		}
		if (this.retryAfter !== undefined) {
			(result as { retryAfter?: number }).retryAfter = this.retryAfter
		}
		if (this.context !== undefined) {
			(result as { context?: Readonly<Record<string, unknown>> }).context = this.context
		}
		return result
	}

	/**
	 * Check if this error is retryable.
	 *
	 * @returns True if the error code indicates a retryable condition
	 */
	isRetryable(): boolean {
		const retryableCodes: readonly AdapterErrorCode[] = [
			'RATE_LIMIT_ERROR',
			'NETWORK_ERROR',
			'TIMEOUT_ERROR',
			'SERVICE_ERROR',
		]
		return retryableCodes.includes(this.code)
	}
}

/**
 * Type guard to check if an error is an AdapterError.
 *
 * @param error - The value to check
 * @returns True if the error is an AdapterError
 *
 * @example
 * ```ts
 * try {
 *   await provider.generate(messages)
 * } catch (error) {
 *   if (isAdapterError(error)) {
 *     if (error.code === 'RATE_LIMIT_ERROR' && error.retryAfter) {
 *       await sleep(error.retryAfter)
 *     }
 *   }
 * }
 * ```
 */
export function isAdapterError(error: unknown): error is AdapterError {
	return error instanceof AdapterError
}

/**
 * Check if an error has a specific adapter error code.
 *
 * @param error - The error to check
 * @param code - The error code to match
 * @returns True if error is an AdapterError with the given code
 *
 * @example
 * ```ts
 * if (hasAdapterErrorCode(error, 'RATE_LIMIT_ERROR')) {
 *   // Handle rate limiting
 * }
 * ```
 */
export function hasAdapterErrorCode(
	error: unknown,
	code: AdapterErrorCode,
): error is AdapterError {
	return isAdapterError(error) && error.code === code
}

// ============================================================================
// Error Mapping Helpers
// ============================================================================

/**
 * Extract retry-after value from error response.
 *
 * @param response - The fetch Response object
 * @returns Retry-after in milliseconds, or undefined
 */
export function extractRetryAfter(response: Response): number | undefined {
	const retryAfter = response.headers.get('Retry-After')
	if (!retryAfter) return undefined

	// Check if it's a number (seconds) or a date
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
 * Create an AdapterError from a fetch response.
 *
 * @param response - The fetch Response object
 * @param message - Error message
 * @param providerCode - Provider-specific error code
 * @returns An AdapterError with appropriate code
 */
export function createAdapterErrorFromResponse(
	response: Response,
	message: string,
	providerCode?: string,
): AdapterError {
	const retryAfter = extractRetryAfter(response)

	let code: AdapterErrorCode
	switch (response.status) {
		case 401:
		case 403:
			code = 'AUTHENTICATION_ERROR'
			break
		case 429:
			code = 'RATE_LIMIT_ERROR'
			break
		case 400:
			code = 'INVALID_REQUEST_ERROR'
			break
		case 404:
			code = 'MODEL_NOT_FOUND_ERROR'
			break
		case 500:
		case 502:
		case 503:
		case 504:
			code = 'SERVICE_ERROR'
			break
		default:
			code = 'UNKNOWN_ERROR'
	}

	// Build data object properly
	const baseData = {
		context: {
			status: response.status,
			statusText: response.statusText,
		},
	}
	const data = providerCode !== undefined && retryAfter !== undefined
		? { ...baseData, providerCode, retryAfter }
		: providerCode !== undefined
			? { ...baseData, providerCode }
			: retryAfter !== undefined
				? { ...baseData, retryAfter }
				: baseData

	return new AdapterError(code, message, data)
}
