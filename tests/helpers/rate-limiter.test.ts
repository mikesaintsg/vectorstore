/**
 * @mikesaintsg/adapters
 *
 * Tests for rate limiter.
 */

import { describe, it, expect } from 'vitest'
import { createRateLimiter } from '@mikesaintsg/adapters'

describe('Rate Limiter', () => {
	describe('createRateLimiter', () => {
		it('creates a rate limiter with default options', () => {
			const limiter = createRateLimiter()
			const state = limiter.getState()

			expect(state.maxConcurrent).toBe(10)
			expect(state.requestsPerMinute).toBe(60)
			expect(state.activeRequests).toBe(0)
			expect(state.requestsInWindow).toBe(0)
		})

		it('creates a rate limiter with custom options', () => {
			const limiter = createRateLimiter({
				requestsPerMinute: 100,
				maxConcurrent: 5,
			})
			const state = limiter.getState()

			expect(state.maxConcurrent).toBe(5)
			expect(state.requestsPerMinute).toBe(100)
		})

		it('acquires a slot immediately when available', async() => {
			const limiter = createRateLimiter({ maxConcurrent: 5 })

			await limiter.acquire()
			const state = limiter.getState()

			expect(state.activeRequests).toBe(1)
			expect(state.requestsInWindow).toBe(1)

			limiter.release()
		})

		it('releases a slot after acquisition', async() => {
			const limiter = createRateLimiter()

			await limiter.acquire()
			expect(limiter.getState().activeRequests).toBe(1)

			limiter.release()
			expect(limiter.getState().activeRequests).toBe(0)
		})

		it('tracks multiple acquisitions correctly', async() => {
			const limiter = createRateLimiter({ maxConcurrent: 5 })

			await limiter.acquire()
			await limiter.acquire()
			await limiter.acquire()

			const state = limiter.getState()
			expect(state.activeRequests).toBe(3)
			expect(state.requestsInWindow).toBe(3)

			limiter.release()
			limiter.release()
			limiter.release()
		})

		it('handles concurrent acquisition up to max limit', async() => {
			const limiter = createRateLimiter({
				maxConcurrent: 3,
				requestsPerMinute: 100,
			})

			// Acquire all slots
			await Promise.all([
				limiter.acquire(),
				limiter.acquire(),
				limiter.acquire(),
			])

			const state = limiter.getState()
			expect(state.activeRequests).toBe(3)

			// Release all slots
			limiter.release()
			limiter.release()
			limiter.release()
		})

		it('does not go below zero active requests on excess release', () => {
			const limiter = createRateLimiter()

			limiter.release()
			limiter.release()

			const state = limiter.getState()
			expect(state.activeRequests).toBe(0)
		})

		it('allows setLimit to change rate limit dynamically', () => {
			const limiter = createRateLimiter({ requestsPerMinute: 60 })

			expect(limiter.getState().requestsPerMinute).toBe(60)

			limiter.setLimit(30)
			expect(limiter.getState().requestsPerMinute).toBe(30)

			limiter.setLimit(120)
			expect(limiter.getState().requestsPerMinute).toBe(120)
		})

		it('ignores non-positive values in setLimit', () => {
			const limiter = createRateLimiter({ requestsPerMinute: 60 })

			limiter.setLimit(0)
			expect(limiter.getState().requestsPerMinute).toBe(60)

			limiter.setLimit(-10)
			expect(limiter.getState().requestsPerMinute).toBe(60)
		})

		it('tracks requests in window correctly', async() => {
			const limiter = createRateLimiter({ windowMs: 1000 })

			await limiter.acquire()
			limiter.release()

			await limiter.acquire()
			limiter.release()

			const state = limiter.getState()
			expect(state.requestsInWindow).toBe(2)
			expect(state.activeRequests).toBe(0)
		})

		it('reports windowResetIn correctly', async() => {
			const limiter = createRateLimiter({ windowMs: 60000 })

			await limiter.acquire()
			const state = limiter.getState()

			// Window reset should be close to 60000ms
			expect(state.windowResetIn).toBeGreaterThan(59000)
			expect(state.windowResetIn).toBeLessThanOrEqual(60000)

			limiter.release()
		})

		it('queues requests when concurrent limit reached', async() => {
			const limiter = createRateLimiter({
				maxConcurrent: 2,
				requestsPerMinute: 100,
			})

			// Acquire 2 slots (maxConcurrent)
			await limiter.acquire()
			await limiter.acquire()

			// Third request should be queued
			let thirdAcquired = false
			const thirdPromise = limiter.acquire().then(() => {
				thirdAcquired = true
			})

			// Give it a moment
			await new Promise((resolve) => setTimeout(resolve, 20))

			// Should still be waiting
			expect(thirdAcquired).toBe(false)

			// Release one slot
			limiter.release()

			// Wait for third to acquire
			await thirdPromise

			expect(thirdAcquired).toBe(true)
			expect(limiter.getState().activeRequests).toBe(2)

			// Cleanup
			limiter.release()
			limiter.release()
		})

		it('processes queued requests in order', async() => {
			const limiter = createRateLimiter({
				maxConcurrent: 1,
				requestsPerMinute: 100,
			})

			const order: number[] = []

			// Acquire the only slot
			await limiter.acquire()

			// Queue additional requests
			const promise1 = limiter.acquire().then(() => order.push(1))
			const promise2 = limiter.acquire().then(() => order.push(2))
			const promise3 = limiter.acquire().then(() => order.push(3))

			// Release and wait
			limiter.release()
			await promise1

			limiter.release()
			await promise2

			limiter.release()
			await promise3

			expect(order).toEqual([1, 2, 3])

			limiter.release()
		})

		it('cleans up expired timestamps from window', async() => {
			const limiter = createRateLimiter({
				windowMs: 50,
				requestsPerMinute: 100,
			})

			// Make some requests
			await limiter.acquire()
			limiter.release()
			await limiter.acquire()
			limiter.release()

			expect(limiter.getState().requestsInWindow).toBe(2)

			// Wait for window to expire
			await new Promise((resolve) => setTimeout(resolve, 60))

			// Should be cleaned up
			expect(limiter.getState().requestsInWindow).toBe(0)
		})

		it('handles high concurrency without issues', async() => {
			const limiter = createRateLimiter({
				maxConcurrent: 5,
				requestsPerMinute: 50,
			})

			// Start 20 requests concurrently
			const requests = Array.from({ length: 20 }, async(_, i) => {
				await limiter.acquire()
				// Simulate some work
				await new Promise((resolve) => setTimeout(resolve, 5))
				limiter.release()
				return i
			})

			const results = await Promise.all(requests)
			expect(results).toHaveLength(20)
			expect(limiter.getState().activeRequests).toBe(0)
		})

		it('respects rate limit per minute', async() => {
			const limiter = createRateLimiter({
				maxConcurrent: 100,
				requestsPerMinute: 3,
				windowMs: 100, // Small window for testing
			})

			// Make 3 requests (the limit)
			await limiter.acquire()
			limiter.release()
			await limiter.acquire()
			limiter.release()
			await limiter.acquire()
			limiter.release()

			const state = limiter.getState()
			expect(state.requestsInWindow).toBe(3)
		})
	})
})
