/**
 * @mikesaintsg/vectorstore
 *
 * Helper functions and type guards for the vectorstore library.
 */

import type {
	Embedding,
	StoredDocument,
} from '@mikesaintsg/core'

// ============================================================================
// Similarity Functions
// ============================================================================

/**
 * Compute cosine similarity between two embeddings.
 *
 * @param a - First embedding
 * @param b - Second embedding
 * @returns Similarity score between -1 and 1 (higher is more similar)
 */
export function cosineSimilarity(a: Embedding, b: Embedding): number {
	if (a.length !== b.length) {
		throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`)
	}

	let dotProduct = 0
	let normA = 0
	let normB = 0

	for (let i = 0; i < a.length; i++) {
		const aVal = a[i] ?? 0
		const bVal = b[i] ?? 0
		dotProduct += aVal * bVal
		normA += aVal * aVal
		normB += bVal * bVal
	}

	const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
	if (magnitude === 0) return 0

	return dotProduct / magnitude
}

/**
 * Compute dot product similarity between two embeddings.
 *
 * @param a - First embedding
 * @param b - Second embedding
 * @returns Dot product (unbounded, higher is more similar)
 */
export function dotProductSimilarity(a: Embedding, b: Embedding): number {
	if (a.length !== b.length) {
		throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`)
	}

	let dotProduct = 0
	for (let i = 0; i < a.length; i++) {
		const aVal = a[i] ?? 0
		const bVal = b[i] ?? 0
		dotProduct += aVal * bVal
	}

	return dotProduct
}

/**
 * Compute euclidean distance between two embeddings.
 * Returns 1 / (1 + distance) to convert to similarity (higher is more similar).
 *
 * @param a - First embedding
 * @param b - Second embedding
 * @returns Similarity score between 0 and 1 (higher is more similar)
 */
export function euclideanSimilarity(a: Embedding, b: Embedding): number {
	if (a.length !== b.length) {
		throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`)
	}

	let sumSquares = 0
	for (let i = 0; i < a.length; i++) {
		const aVal = a[i] ?? 0
		const bVal = b[i] ?? 0
		const diff = aVal - bVal
		sumSquares += diff * diff
	}

	const distance = Math.sqrt(sumSquares)
	return 1 / (1 + distance)
}

/**
 * Normalize a vector to unit length.
 *
 * @param vector - Vector to normalize
 * @returns Normalized vector
 */
export function normalizeVector(vector: Embedding): Embedding {
	let magnitude = 0
	for (const val of vector) {
		magnitude += val * val
	}
	magnitude = Math.sqrt(magnitude)

	if (magnitude === 0) return vector

	const normalized = new Float32Array(vector.length)
	for (let i = 0; i < vector.length; i++) {
		normalized[i] = (vector[i] ?? 0) / magnitude
	}

	return normalized
}

/**
 * Compute the magnitude (length) of a vector.
 *
 * @param vector - Vector to compute magnitude for
 * @returns Magnitude (L2 norm) of the vector
 */
export function magnitudeVector(vector: Embedding): number {
	let sumSquares = 0
	for (const val of vector) {
		sumSquares += val * val
	}
	return Math.sqrt(sumSquares)
}

// ============================================================================
// Keyword Scoring
// ============================================================================

/**
 * Compute keyword match score between query and content.
 *
 * @param query - Query string
 * @param content - Content to search
 * @param mode - Match mode: 'exact', 'fuzzy', or 'prefix'
 * @returns Score between 0 and 1
 */
export function computeKeywordScore(
	query: string,
	content: string,
	mode: 'exact' | 'fuzzy' | 'prefix' = 'exact',
): number {
	const queryTerms = tokenize(query)
	if (queryTerms.length === 0) return 0

	const contentLower = content.toLowerCase()
	let matchedTerms = 0

	for (const term of queryTerms) {
		switch (mode) {
			case 'exact':
				if (contentLower.includes(term)) matchedTerms++
				break
			case 'prefix':
				if (hasPrefix(contentLower, term)) matchedTerms++
				break
			case 'fuzzy':
				if (hasFuzzyMatch(contentLower, term)) matchedTerms++
				break
		}
	}

	return matchedTerms / queryTerms.length
}

/**
 * Tokenize text into lowercase terms.
 *
 * @param text - Text to tokenize
 * @returns Array of lowercase terms
 */
export function tokenize(text: string): readonly string[] {
	return text
		.toLowerCase()
		.split(/\W+/)
		.filter((term) => term.length > 0)
}

/**
 * Check if content contains a word starting with prefix.
 */
function hasPrefix(content: string, prefix: string): boolean {
	const words = content.split(/\W+/)
	return words.some((word) => word.startsWith(prefix))
}

/**
 * Check for fuzzy match using Levenshtein distance.
 */
function hasFuzzyMatch(content: string, term: string): boolean {
	const words = content.split(/\W+/)
	const maxDistance = Math.floor(term.length / 3)

	return words.some((word) => {
		if (word.length < term.length - maxDistance) return false
		if (word.length > term.length + maxDistance) return false
		return levenshteinDistance(word, term) <= maxDistance
	})
}

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
	if (a.length === 0) return b.length
	if (b.length === 0) return a.length

	const matrix: number[][] = []

	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i]
	}

	for (let j = 0; j <= a.length; j++) {
		const row = matrix[0]
		if (row) row[j] = j
	}

	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			const row = matrix[i]
			const prevRow = matrix[i - 1]
			if (!row || !prevRow) continue

			if (b.charAt(i - 1) === a.charAt(j - 1)) {
				row[j] = prevRow[j - 1] ?? 0
			} else {
				row[j] = Math.min(
					(prevRow[j - 1] ?? 0) + 1,
					(prevRow[j] ?? 0) + 1,
					(row[j - 1] ?? 0) + 1,
				)
			}
		}
	}

	return matrix[b.length]?.[a.length] ?? 0
}

// ============================================================================
// Memory Estimation
// ============================================================================

/**
 * Estimate memory usage of a stored document.
 *
 * @param doc - Document to estimate
 * @returns Estimated bytes
 */
export function estimateDocumentBytes(doc: StoredDocument): number {
	const contentBytes = doc.content.length * 2
	const embeddingBytes = doc.embedding.length * 4
	const idBytes = doc.id.length * 2
	const metadataBytes = doc.metadata
		? JSON.stringify(doc.metadata).length * 2
		: 0
	const overhead = 64

	return contentBytes + embeddingBytes + idBytes + metadataBytes + overhead
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a value is a valid document.
 *
 * @param value - Value to check
 * @returns True if value is a valid Document
 */
export function isDocument(value: unknown): value is { id: string; content: string } {
	if (typeof value !== 'object' || value === null) return false
	const obj = value as Record<string, unknown>
	return typeof obj.id === 'string' && typeof obj.content === 'string'
}

/**
 * Check if embeddings have matching dimensions.
 *
 * @param a - First embedding
 * @param b - Second embedding
 * @returns True if dimensions match
 */
export function dimensionsMatch(a: Embedding, b: Embedding): boolean {
	return a.length === b.length
}
