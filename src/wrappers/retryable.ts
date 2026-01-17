/**
 * @mikesaintsg/adapters
 *
 * Retry wrapper for adapter operations.
 * Provides exponential backoff with jitter for transient failures.
 */

import type { RetryOptions, AdapterErrorCode } from '../types.js'
import { isAdapterError } from '../errors.js'
import {
	RETRY_DEFAULT_MAX_RETRIES,
	RETRY_DEFAULT_INITIAL_DELAY_MS,
	RETRY_DEFAULT_MAX_DELAY_MS,
	RETRY_DEFAULT_BACKOFF_MULTIPLIER,
	DEFAULT_RETRYABLE_CODES,
} from '../constants.js'

/**
 * Default retry options.
 */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
	maxRetries: RETRY_DEFAULT_MAX_RETRIES,
	initialDelayMs: RETRY_DEFAULT_INITIAL_DELAY_MS,
	maxDelayMs: RETRY_DEFAULT_MAX_DELAY_MS,
	backoffMultiplier: RETRY_DEFAULT_BACKOFF_MULTIPLIER,
	jitter: true,
	retryableCodes: DEFAULT_RETRYABLE_CODES,
}

// ============================================================================
// Shared Helper Functions
// ============================================================================

/**
 * Check if an error should trigger a retry.
 */
function checkRetryable(
	error: unknown,
	attempt: number,
	retryableCodes: readonly AdapterErrorCode[],
	shouldRetry?: (error: unknown, attempt: number) => boolean,
): boolean {
	// Custom retry condition takes precedence
	if (shouldRetry) {
		return shouldRetry(error, attempt)
	}

	// Check if it's an AdapterError with a retryable code
	if (isAdapterError(error)) {
		return retryableCodes.includes(error.code)
	}

	// Network errors (TypeError from fetch) are retryable
	if (error instanceof TypeError) {
		return true
	}

	return false
}

/**
 * Calculate delay for a retry attempt.
 */
function computeDelay(
	attempt: number,
	error: unknown,
	initialDelayMs: number,
	maxDelayMs: number,
	backoffMultiplier: number,
	jitter: boolean,
): number {
	// Respect Retry-After header if present
	if (isAdapterError(error) && error.retryAfter !== undefined) {
		return Math.min(error.retryAfter, maxDelayMs)
	}

	// Exponential backoff
	let delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1)

	// Apply jitter (±25%)
	if (jitter) {
		const jitterFactor = 0.75 + Math.random() * 0.5
		delay = delay * jitterFactor
	}

	// Cap at max delay
	return Math.min(Math.round(delay), maxDelayMs)
}

/**
 * Sleep for a given duration.
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Wraps an async function with retry logic.
 *
 * Implements exponential backoff with optional jitter. Retries are triggered
 * for transient errors (rate limit, network, timeout, service) by default.
 *
 * @typeParam T - Return type of the wrapped function
 * @param fn - The async function to wrap with retry logic
 * @param options - Retry configuration options
 * @returns A wrapped function that will retry on transient failures
 * @remarks
 * Properties on `options`:
 * - `maxRetries` — maximum retry attempts (default: 3)
 * - `initialDelayMs` — initial delay before first retry (default: 1000ms)
 * - `maxDelayMs` — maximum delay between retries (default: 30000ms)
 * - `backoffMultiplier` — multiplier for exponential backoff (default: 2)
 * - `jitter` — add randomness to delays (default: true)
 * - `retryableCodes` — error codes that trigger retry
 * - `shouldRetry` — custom retry condition function
 * - `onRetry` — callback before each retry attempt
 * @example
 * ```ts
 * const fetchWithRetry = withRetry(
 *   async () => {
 *     const response = await fetch(url)
 *     return response.json()
 *   },
 *   {
 *     maxRetries: 3,
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry ${attempt} in ${delay}ms`)
 *     },
 *   },
 * )
 *
 * const result = await fetchWithRetry()
 * ```
 */
export function withRetry<T>(
	fn: () => Promise<T>,
	options?: RetryOptions,
): () => Promise<T> {
	const {
		maxRetries,
		initialDelayMs,
		maxDelayMs,
		backoffMultiplier,
		jitter,
		retryableCodes,
	} = { ...DEFAULT_RETRY_OPTIONS, ...options }

	const { shouldRetry, onRetry } = options ?? {}

	return async function retryable(): Promise<T> {
		let lastError: unknown

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await fn()
			} catch (error) {
				lastError = error

				// Check if we've exhausted retries
				if (attempt >= maxRetries) {
					break
				}

				// Check if error is retryable
				if (!checkRetryable(error, attempt + 1, retryableCodes, shouldRetry)) {
					break
				}

				// Calculate delay
				const delay = computeDelay(
					attempt + 1,
					error,
					initialDelayMs,
					maxDelayMs,
					backoffMultiplier,
					jitter,
				)

				// Call onRetry callback
				onRetry?.(error, attempt + 1, delay)

				// Wait before retrying
				await sleep(delay)
			}
		}

		// All retries exhausted, throw the last error
		throw lastError
	}
}

/**
 * Wraps a function with retry logic and passes through arguments.
 *
 * Similar to `withRetry` but preserves function arguments.
 *
 * @typeParam TArgs - Tuple type of function arguments
 * @typeParam T - Return type of the wrapped function
 * @param fn - The async function to wrap
 * @param options - Retry configuration options
 * @returns A wrapped function that will retry on transient failures
 * @example
 * ```ts
 * const embedWithRetry = withRetryArgs(
 *   async (text: string) => embedder.embed(text),
 *   { maxRetries: 3 },
 * )
 *
 * const embedding = await embedWithRetry('Hello world')
 * ```
 */
export function withRetryArgs<TArgs extends readonly unknown[], T>(
	fn: (...args: TArgs) => Promise<T>,
	options?: RetryOptions,
): (...args: TArgs) => Promise<T> {
	const {
		maxRetries,
		initialDelayMs,
		maxDelayMs,
		backoffMultiplier,
		jitter,
		retryableCodes,
	} = { ...DEFAULT_RETRY_OPTIONS, ...options }

	const { shouldRetry, onRetry } = options ?? {}

	return async function retryable(...args: TArgs): Promise<T> {
		let lastError: unknown

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await fn(...args)
			} catch (error) {
				lastError = error

				if (attempt >= maxRetries) {
					break
				}

				if (!checkRetryable(error, attempt + 1, retryableCodes, shouldRetry)) {
					break
				}

				const delay = computeDelay(
					attempt + 1,
					error,
					initialDelayMs,
					maxDelayMs,
					backoffMultiplier,
					jitter,
				)
				onRetry?.(error, attempt + 1, delay)
				await sleep(delay)
			}
		}

		throw lastError
	}
}

/**
 * Execute a function with retry logic (one-shot).
 *
 * Convenience function for single invocations without creating a wrapper.
 *
 * @typeParam T - Return type of the function
 * @param fn - The async function to execute with retries
 * @param options - Retry configuration options
 * @returns The result of the function
 * @example
 * ```ts
 * const result = await executeWithRetry(
 *   async () => fetch(url).then(r => r.json()),
 *   { maxRetries: 3 },
 * )
 * ```
 */
export async function executeWithRetry<T>(
	fn: () => Promise<T>,
	options?: RetryOptions,
): Promise<T> {
	return withRetry(fn, options)()
}
