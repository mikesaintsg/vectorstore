/**
 * @mikesaintsg/vectorstore
 *
 * Helper functions tests.
 */

import { describe, it, expect } from 'vitest'
import {
	cosineSimilarity,
	dotProductSimilarity,
	euclideanSimilarity,
	normalizeVector,
	computeKeywordScore,
	tokenize,
	estimateDocumentBytes,
	isDocument,
	dimensionsMatch,
} from '@mikesaintsg/vectorstore'

// ============================================================================
// Similarity Functions Tests
// ============================================================================

describe('cosineSimilarity', () => {
	it('returns 1 for identical vectors', () => {
		const a = new Float32Array([1, 2, 3])
		const b = new Float32Array([1, 2, 3])
		expect(cosineSimilarity(a, b)).toBeCloseTo(1)
	})

	it('returns 0 for orthogonal vectors', () => {
		const a = new Float32Array([1, 0])
		const b = new Float32Array([0, 1])
		expect(cosineSimilarity(a, b)).toBeCloseTo(0)
	})

	it('returns -1 for opposite vectors', () => {
		const a = new Float32Array([1, 0])
		const b = new Float32Array([-1, 0])
		expect(cosineSimilarity(a, b)).toBeCloseTo(-1)
	})

	it('throws for dimension mismatch', () => {
		const a = new Float32Array([1, 2])
		const b = new Float32Array([1, 2, 3])
		expect(() => cosineSimilarity(a, b)).toThrow('Dimension mismatch')
	})

	it('returns 0 for zero vectors', () => {
		const a = new Float32Array([0, 0, 0])
		const b = new Float32Array([1, 2, 3])
		expect(cosineSimilarity(a, b)).toBe(0)
	})
})

describe('dotProductSimilarity', () => {
	it('computes dot product correctly', () => {
		const a = new Float32Array([1, 2, 3])
		const b = new Float32Array([4, 5, 6])
		expect(dotProductSimilarity(a, b)).toBe(32) // 1*4 + 2*5 + 3*6
	})

	it('returns 0 for orthogonal vectors', () => {
		const a = new Float32Array([1, 0])
		const b = new Float32Array([0, 1])
		expect(dotProductSimilarity(a, b)).toBe(0)
	})

	it('throws for dimension mismatch', () => {
		const a = new Float32Array([1, 2])
		const b = new Float32Array([1, 2, 3])
		expect(() => dotProductSimilarity(a, b)).toThrow('Dimension mismatch')
	})
})

describe('euclideanSimilarity', () => {
	it('returns 1 for identical vectors', () => {
		const a = new Float32Array([1, 2, 3])
		const b = new Float32Array([1, 2, 3])
		expect(euclideanSimilarity(a, b)).toBe(1)
	})

	it('returns less than 1 for different vectors', () => {
		const a = new Float32Array([0, 0])
		const b = new Float32Array([3, 4])
		// distance = 5, similarity = 1/(1+5) = 1/6
		expect(euclideanSimilarity(a, b)).toBeCloseTo(1 / 6)
	})

	it('throws for dimension mismatch', () => {
		const a = new Float32Array([1, 2])
		const b = new Float32Array([1, 2, 3])
		expect(() => euclideanSimilarity(a, b)).toThrow('Dimension mismatch')
	})
})

describe('normalizeVector', () => {
	it('normalizes to unit length', () => {
		const v = new Float32Array([3, 4])
		const normalized = normalizeVector(v)

		let magnitude = 0
		for (const val of normalized) {
			magnitude += val * val
		}
		expect(Math.sqrt(magnitude)).toBeCloseTo(1)
	})

	it('returns same vector for zero vector', () => {
		const v = new Float32Array([0, 0, 0])
		const normalized = normalizeVector(v)
		expect(normalized).toBe(v)
	})

	it('preserves direction', () => {
		const v = new Float32Array([3, 4])
		const normalized = normalizeVector(v)
		expect(normalized[0]! / normalized[1]!).toBeCloseTo(3 / 4)
	})
})

// ============================================================================
// Keyword Scoring Tests
// ============================================================================

describe('computeKeywordScore', () => {
	describe('exact mode', () => {
		it('returns 1 when all terms match', () => {
			expect(computeKeywordScore('hello world', 'hello world test', 'exact')).toBe(1)
		})

		it('returns 0.5 when half terms match', () => {
			expect(computeKeywordScore('hello world', 'hello test', 'exact')).toBe(0.5)
		})

		it('returns 0 when no terms match', () => {
			expect(computeKeywordScore('hello', 'world', 'exact')).toBe(0)
		})

		it('is case insensitive', () => {
			expect(computeKeywordScore('Hello', 'hello world', 'exact')).toBe(1)
		})
	})

	describe('prefix mode', () => {
		it('matches word prefixes', () => {
			expect(computeKeywordScore('type', 'typescript programming', 'prefix')).toBe(1)
		})

		it('returns 0 when prefix not at word start', () => {
			expect(computeKeywordScore('script', 'typescript', 'prefix')).toBe(0)
		})
	})

	describe('fuzzy mode', () => {
		it('matches similar words', () => {
			expect(computeKeywordScore('helo', 'hello world', 'fuzzy')).toBe(1)
		})

		it('returns 0 for very different words', () => {
			expect(computeKeywordScore('xyz', 'hello world', 'fuzzy')).toBe(0)
		})
	})

	it('returns 0 for empty query', () => {
		expect(computeKeywordScore('', 'hello world', 'exact')).toBe(0)
	})
})

describe('tokenize', () => {
	it('splits text into lowercase terms', () => {
		expect(tokenize('Hello World')).toEqual(['hello', 'world'])
	})

	it('removes punctuation', () => {
		expect(tokenize('hello, world! how are you?')).toEqual(['hello', 'world', 'how', 'are', 'you'])
	})

	it('filters empty strings', () => {
		expect(tokenize('  hello   world  ')).toEqual(['hello', 'world'])
	})
})

// ============================================================================
// Memory Estimation Tests
// ============================================================================

describe('estimateDocumentBytes', () => {
	it('estimates bytes for document', () => {
		const doc = {
			id: 'test',
			content: 'hello',
			embedding: new Float32Array(128),
			createdAt: Date.now(),
			updatedAt: Date.now(),
		}
		const bytes = estimateDocumentBytes(doc)

		expect(bytes).toBeGreaterThan(0)
		expect(bytes).toBeGreaterThanOrEqual(128 * 4) // at least embedding size
	})

	it('includes metadata in estimation', () => {
		const docWithMetadata = {
			id: 'test',
			content: 'hello',
			embedding: new Float32Array(128),
			metadata: { key: 'value' },
			createdAt: Date.now(),
			updatedAt: Date.now(),
		}
		const docWithoutMetadata = {
			id: 'test',
			content: 'hello',
			embedding: new Float32Array(128),
			createdAt: Date.now(),
			updatedAt: Date.now(),
		}

		expect(estimateDocumentBytes(docWithMetadata)).toBeGreaterThan(
			estimateDocumentBytes(docWithoutMetadata),
		)
	})
})

// ============================================================================
// Validation Helpers Tests
// ============================================================================

describe('isDocument', () => {
	it('returns true for valid document', () => {
		expect(isDocument({ id: 'test', content: 'hello' })).toBe(true)
	})

	it('returns true for document with metadata', () => {
		expect(isDocument({ id: 'test', content: 'hello', metadata: { key: 'value' } })).toBe(true)
	})

	it('returns false for null', () => {
		expect(isDocument(null)).toBe(false)
	})

	it('returns false for non-object', () => {
		expect(isDocument('string')).toBe(false)
		expect(isDocument(123)).toBe(false)
	})

	it('returns false for missing id', () => {
		expect(isDocument({ content: 'hello' })).toBe(false)
	})

	it('returns false for missing content', () => {
		expect(isDocument({ id: 'test' })).toBe(false)
	})

	it('returns false for non-string id', () => {
		expect(isDocument({ id: 123, content: 'hello' })).toBe(false)
	})
})

describe('dimensionsMatch', () => {
	it('returns true for matching dimensions', () => {
		const a = new Float32Array(128)
		const b = new Float32Array(128)
		expect(dimensionsMatch(a, b)).toBe(true)
	})

	it('returns false for mismatched dimensions', () => {
		const a = new Float32Array(128)
		const b = new Float32Array(256)
		expect(dimensionsMatch(a, b)).toBe(false)
	})
})
