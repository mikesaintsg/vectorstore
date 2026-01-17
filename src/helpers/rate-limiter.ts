/**
 * @mikesaintsg/adapters
 *
 * Rate limiter for request throttling.
 * Implements a sliding window rate limiting algorithm with max concurrent requests.
 */

import type {
	RateLimiterInterface,
	RateLimiterOptions,
	RateLimiterState,
} from '../types.js'
import {
	RATE_LIMIT_DEFAULT_MAX_CONCURRENT,
	RATE_LIMIT_DEFAULT_REQUESTS_PER_MINUTE,
	RATE_LIMIT_DEFAULT_WINDOW_MS,
} from '../constants.js'

/**
 * Pending request in the queue, waiting for a slot.
 */
interface PendingRequest {
	readonly resolve: () => void
	resolved: boolean
}

/**
 * Creates a rate limiter for coordinated request throttling.
 *
 * Implements sliding window rate limiting with maximum concurrent requests.
 * Requests that exceed limits are queued and processed when slots become available.
 *
 * @param options - Rate limiter configuration options
 * @returns A rate limiter interface
 * @remarks
 * Properties on `options`:
 * - `requestsPerMinute` — maximum requests allowed per window (default: 60)
 * - `maxConcurrent` — maximum concurrent active requests (default: 10)
 * - `windowMs` — sliding window size in milliseconds (default: 60000)
 * @example
 * ```ts
 * const limiter = createRateLimiter({
 *   requestsPerMinute: 100,
 *   maxConcurrent: 5,
 * })
 *
 * // In your request function:
 * await limiter.acquire()
 * try {
 *   await makeRequest()
 * } finally {
 *   limiter.release()
 * }
 * ```
 */
export function createRateLimiter(options?: RateLimiterOptions): RateLimiterInterface {
	// Configuration with defaults
	let requestsPerMinute = options?.requestsPerMinute ?? RATE_LIMIT_DEFAULT_REQUESTS_PER_MINUTE
	const maxConcurrent = options?.maxConcurrent ?? RATE_LIMIT_DEFAULT_MAX_CONCURRENT
	const windowMs = options?.windowMs ?? RATE_LIMIT_DEFAULT_WINDOW_MS

	// State
	let activeRequests = 0
	const requestTimestamps: number[] = []
	const pendingQueue: PendingRequest[] = []

	/**
	 * Clean up expired timestamps outside the current window.
	 */
	function cleanExpiredTimestamps(): void {
		const now = Date.now()
		const windowStart = now - windowMs

		while (requestTimestamps.length > 0) {
			const oldest = requestTimestamps[0]
			if (oldest !== undefined && oldest < windowStart) {
				requestTimestamps.shift()
			} else {
				break
			}
		}
	}

	/**
	 * Check if a new request can be made.
	 */
	function canMakeRequest(): boolean {
		cleanExpiredTimestamps()
		return (
			activeRequests < maxConcurrent &&
			requestTimestamps.length < requestsPerMinute
		)
	}

	/**
	 * Try to process pending requests in the queue.
	 */
	function processPendingQueue(): void {
		while (pendingQueue.length > 0 && canMakeRequest()) {
			const pending = pendingQueue.shift()
			if (pending && !pending.resolved) {
				pending.resolved = true
				activeRequests++
				requestTimestamps.push(Date.now())
				pending.resolve()
			}
		}
	}

	/**
	 * Calculate delay until next available slot.
	 */
	function getNextAvailableDelay(): number {
		cleanExpiredTimestamps()

		// If we're at max concurrent, we can't predict when a slot opens
		// (depends on when release() is called)
		if (activeRequests >= maxConcurrent) {
			// Small delay, will re-check
			return 10
		}

		// If rate limit is hit, calculate when oldest request expires
		if (requestTimestamps.length >= requestsPerMinute) {
			const oldest = requestTimestamps[0]
			if (oldest !== undefined) {
				const now = Date.now()
				const expiresAt = oldest + windowMs
				return Math.max(0, expiresAt - now)
			}
		}

		return 0
	}

	/**
	 * Acquire a slot, returns when available.
	 * Will wait if rate limit or concurrent limit is reached.
	 */
	async function acquire(): Promise<void> {
		return new Promise((resolve) => {
			if (canMakeRequest()) {
				// Slot available immediately
				activeRequests++
				requestTimestamps.push(Date.now())
				resolve()
			} else {
				// Queue the request with resolved flag for efficient cleanup
				const pending: PendingRequest = { resolve, resolved: false }
				pendingQueue.push(pending)

				// Set up periodic check for when slot becomes available
				const checkInterval = setInterval(() => {
					if (canMakeRequest() && pendingQueue.length > 0) {
						processPendingQueue()
					}

					// Clean up interval when this request has been resolved
					if (pending.resolved) {
						clearInterval(checkInterval)
					}
				}, getNextAvailableDelay() || 10)
			}
		})
	}

	/**
	 * Release a slot after request completes.
	 */
	function release(): void {
		if (activeRequests > 0) {
			activeRequests--
		}
		processPendingQueue()
	}

	/**
	 * Get current rate limiter state.
	 */
	function getState(): RateLimiterState {
		cleanExpiredTimestamps()

		const now = Date.now()

		// Calculate when window resets (when oldest request expires)
		let windowResetIn = windowMs
		if (requestTimestamps.length > 0) {
			const oldest = requestTimestamps[0]
			if (oldest !== undefined) {
				windowResetIn = Math.max(0, oldest + windowMs - now)
			}
		}

		return {
			activeRequests,
			maxConcurrent,
			requestsInWindow: requestTimestamps.length,
			requestsPerMinute,
			windowResetIn,
		}
	}

	/**
	 * Dynamically set the rate limit.
	 * Useful for adjusting based on Retry-After headers.
	 */
	function setLimit(newRequestsPerMinute: number): void {
		if (newRequestsPerMinute > 0) {
			requestsPerMinute = newRequestsPerMinute
		}
	}

	return {
		acquire,
		release,
		getState,
		setLimit,
	}
}
