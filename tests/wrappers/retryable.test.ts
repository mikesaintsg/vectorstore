/**
 * @mikesaintsg/adapters
 *
 * Tests for retry wrapper.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	withRetry,
	withRetryArgs,
	executeWithRetry,
} from '@mikesaintsg/adapters'
import { AdapterError } from '@mikesaintsg/adapters'

describe('Retry Wrapper', () => {
	describe('withRetry', () => {
		it('returns result on first successful call', async() => {
			const fn = vi.fn().mockResolvedValue('success')
			const retryFn = withRetry(fn)

			const result = await retryFn()

			expect(result).toBe('success')
			expect(fn).toHaveBeenCalledTimes(1)
		})

		it('retries on retryable AdapterError', async() => {
			const fn = vi.fn()
				.mockRejectedValueOnce(new AdapterError('NETWORK_ERROR', 'Network failed'))
				.mockResolvedValueOnce('success')

			const retryFn = withRetry(fn, { initialDelayMs: 10 })

			const result = await retryFn()

			expect(result).toBe('success')
			expect(fn).toHaveBeenCalledTimes(2)
		})

		it('retries on rate limit error', async() => {
			const fn = vi.fn()
				.mockRejectedValueOnce(new AdapterError('RATE_LIMIT_ERROR', 'Rate limited'))
				.mockResolvedValueOnce('success')

			const retryFn = withRetry(fn, { initialDelayMs: 10 })

			const result = await retryFn()

			expect(result).toBe('success')
			expect(fn).toHaveBeenCalledTimes(2)
		})

		it('retries on timeout error', async() => {
			const fn = vi.fn()
				.mockRejectedValueOnce(new AdapterError('TIMEOUT_ERROR', 'Timed out'))
				.mockResolvedValueOnce('success')

			const retryFn = withRetry(fn, { initialDelayMs: 10 })

			const result = await retryFn()

			expect(result).toBe('success')
			expect(fn).toHaveBeenCalledTimes(2)
		})

		it('retries on service error', async() => {
			const fn = vi.fn()
				.mockRejectedValueOnce(new AdapterError('SERVICE_ERROR', 'Service down'))
				.mockResolvedValueOnce('success')

			const retryFn = withRetry(fn, { initialDelayMs: 10 })

			const result = await retryFn()

			expect(result).toBe('success')
			expect(fn).toHaveBeenCalledTimes(2)
		})

		it('does not retry on non-retryable error', async() => {
			const fn = vi.fn()
				.mockRejectedValueOnce(new AdapterError('AUTHENTICATION_ERROR', 'Invalid key'))

			const retryFn = withRetry(fn, { initialDelayMs: 10 })

			await expect(retryFn()).rejects.toThrow('Invalid key')
			expect(fn).toHaveBeenCalledTimes(1)
		})

		it('does not retry on quota exceeded error', async() => {
			const fn = vi.fn()
				.mockRejectedValueOnce(new AdapterError('QUOTA_EXCEEDED_ERROR', 'No quota'))

			const retryFn = withRetry(fn, { initialDelayMs: 10 })

			await expect(retryFn()).rejects.toThrow('No quota')
			expect(fn).toHaveBeenCalledTimes(1)
		})

		it('retries on TypeError (network fetch failure)', async() => {
			const fn = vi.fn()
				.mockRejectedValueOnce(new TypeError('Failed to fetch'))
				.mockResolvedValueOnce('success')

			const retryFn = withRetry(fn, { initialDelayMs: 10 })

			const result = await retryFn()

			expect(result).toBe('success')
			expect(fn).toHaveBeenCalledTimes(2)
		})

		it('respects maxRetries limit', async() => {
			const error = new AdapterError('NETWORK_ERROR', 'Network failed')
			const fn = vi.fn().mockRejectedValue(error)

			const retryFn = withRetry(fn, { maxRetries: 2, initialDelayMs: 10 })

			await expect(retryFn()).rejects.toThrow('Network failed')
			expect(fn).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
		})

		it('calls onRetry callback before each retry', async() => {
			const onRetry = vi.fn()
			const error = new AdapterError('NETWORK_ERROR', 'Network failed')
			const fn = vi.fn()
				.mockRejectedValueOnce(error)
				.mockRejectedValueOnce(error)
				.mockResolvedValueOnce('success')

			const retryFn = withRetry(fn, {
				initialDelayMs: 10,
				onRetry,
			})

			await retryFn()

			expect(onRetry).toHaveBeenCalledTimes(2)
			expect(onRetry).toHaveBeenCalledWith(error, 1, expect.any(Number))
			expect(onRetry).toHaveBeenCalledWith(error, 2, expect.any(Number))
		})

		it('uses custom shouldRetry function', async() => {
			const shouldRetry = vi.fn().mockReturnValue(true)
			const error = new Error('Custom error')
			const fn = vi.fn()
				.mockRejectedValueOnce(error)
				.mockResolvedValueOnce('success')

			const retryFn = withRetry(fn, {
				initialDelayMs: 10,
				shouldRetry,
			})

			await retryFn()

			expect(shouldRetry).toHaveBeenCalledWith(error, 1)
			expect(fn).toHaveBeenCalledTimes(2)
		})

		it('respects shouldRetry returning false', async() => {
			const shouldRetry = vi.fn().mockReturnValue(false)
			const error = new AdapterError('NETWORK_ERROR', 'Network failed')
			const fn = vi.fn().mockRejectedValue(error)

			const retryFn = withRetry(fn, {
				initialDelayMs: 10,
				shouldRetry,
			})

			await expect(retryFn()).rejects.toThrow('Network failed')
			expect(fn).toHaveBeenCalledTimes(1)
		})

		it('respects retryAfter from AdapterError', async() => {
			const error = new AdapterError('RATE_LIMIT_ERROR', 'Rate limited', {
				retryAfter: 50,
			})
			const fn = vi.fn()
				.mockRejectedValueOnce(error)
				.mockResolvedValueOnce('success')

			const onRetry = vi.fn()
			const retryFn = withRetry(fn, {
				initialDelayMs: 10,
				onRetry,
			})

			const start = Date.now()
			await retryFn()
			const elapsed = Date.now() - start

			expect(fn).toHaveBeenCalledTimes(2)
			// Should have waited approximately 50ms
			expect(elapsed).toBeGreaterThanOrEqual(40)
		})

		it('caps retry delay at maxDelayMs', async() => {
			const error = new AdapterError('RATE_LIMIT_ERROR', 'Rate limited', {
				retryAfter: 10000, // 10 seconds
			})
			const fn = vi.fn()
				.mockRejectedValueOnce(error)
				.mockResolvedValueOnce('success')

			const onRetry = vi.fn()
			const retryFn = withRetry(fn, {
				initialDelayMs: 10,
				maxDelayMs: 100,
				onRetry,
			})

			await retryFn()

			// Delay should be capped at 100ms
			expect(onRetry).toHaveBeenCalledWith(error, 1, 100)
		})

		it('applies exponential backoff', async() => {
			const error = new AdapterError('NETWORK_ERROR', 'Network failed')
			const fn = vi.fn()
				.mockRejectedValueOnce(error)
				.mockRejectedValueOnce(error)
				.mockRejectedValueOnce(error)
				.mockResolvedValueOnce('success')

			const delays: number[] = []
			const retryFn = withRetry(fn, {
				initialDelayMs: 10,
				backoffMultiplier: 2,
				jitter: false,
				onRetry: (_, __, delay) => delays.push(delay),
			})

			await retryFn()

			// Should be 10, 20, 40 (exponential)
			expect(delays).toEqual([10, 20, 40])
		})

		it('applies jitter when enabled', async() => {
			const error = new AdapterError('NETWORK_ERROR', 'Network failed')
			const fn = vi.fn()
				.mockRejectedValueOnce(error)
				.mockResolvedValueOnce('success')

			const delays: number[] = []
			const retryFn = withRetry(fn, {
				initialDelayMs: 100,
				jitter: true,
				onRetry: (_, __, delay) => delays.push(delay),
			})

			await retryFn()

			// With jitter (±25%), delay should be between 75 and 125
			expect(delays[0]).toBeGreaterThanOrEqual(75)
			expect(delays[0]).toBeLessThanOrEqual(125)
		})
	})

	describe('withRetryArgs', () => {
		it('passes arguments through to wrapped function', async() => {
			const fn = vi.fn().mockImplementation((a: number, b: string) => Promise.resolve(`${a}-${b}`))
			const retryFn = withRetryArgs(fn)

			const result = await retryFn(42, 'hello')

			expect(result).toBe('42-hello')
			expect(fn).toHaveBeenCalledWith(42, 'hello')
		})

		it('retries with same arguments', async() => {
			const fn = vi.fn()
				.mockRejectedValueOnce(new AdapterError('NETWORK_ERROR', 'Failed'))
				.mockImplementation((x: number) => Promise.resolve(x * 2))

			const retryFn = withRetryArgs(fn, { initialDelayMs: 10 })

			const result = await retryFn(5)

			expect(result).toBe(10)
			expect(fn).toHaveBeenCalledTimes(2)
			expect(fn).toHaveBeenNthCalledWith(1, 5)
			expect(fn).toHaveBeenNthCalledWith(2, 5)
		})

		it('handles multiple arguments correctly', async() => {
			const fn = vi.fn()
				.mockRejectedValueOnce(new AdapterError('TIMEOUT_ERROR', 'Timeout'))
				.mockResolvedValueOnce('done')

			const retryFn = withRetryArgs(fn, { initialDelayMs: 10 })

			const result = await retryFn('a', 'b', 'c')

			expect(result).toBe('done')
			expect(fn).toHaveBeenNthCalledWith(2, 'a', 'b', 'c')
		})
	})

	describe('executeWithRetry', () => {
		it('executes function with retry logic', async() => {
			const fn = vi.fn()
				.mockRejectedValueOnce(new AdapterError('NETWORK_ERROR', 'Failed'))
				.mockResolvedValueOnce('success')

			const result = await executeWithRetry(fn, { initialDelayMs: 10 })

			expect(result).toBe('success')
			expect(fn).toHaveBeenCalledTimes(2)
		})

		it('throws after max retries', async() => {
			const fn = vi.fn().mockRejectedValue(new AdapterError('NETWORK_ERROR', 'Failed'))

			await expect(
				executeWithRetry(fn, { maxRetries: 1, initialDelayMs: 10 }),
			).rejects.toThrow('Failed')

			expect(fn).toHaveBeenCalledTimes(2)
		})
	})
})
