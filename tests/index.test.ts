/**
 * @mikesaintsg/adapters
 *
 * Placeholder test to verify test infrastructure works.
 *
 * TODO: [Phase 1] Add real tests as implementations are completed
 */

import { describe, it, expect } from 'vitest'

describe('adapters', () => {
	describe('package', () => {
		it('exports types', async() => {
			// Verify basic types can be imported
			const adapters = await import('@mikesaintsg/adapters')
			expect(adapters).toBeDefined()
		})

		it('exports constants', async() => {
			const { OPENAI_DEFAULT_EMBEDDING_MODEL } = await import('@mikesaintsg/adapters')
			expect(OPENAI_DEFAULT_EMBEDDING_MODEL).toBe('text-embedding-3-small')
		})

		it('exports error utilities', async() => {
			const { CoreError, isCoreError } = await import('@mikesaintsg/adapters')
			expect(CoreError).toBeDefined()
			expect(isCoreError).toBeDefined()
		})
	})
})
