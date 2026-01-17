/**
 * @mikesaintsg/adapters
 *
 * Error utilities and re-exports.
 */

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
