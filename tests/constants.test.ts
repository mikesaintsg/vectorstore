/**
 * @mikesaintsg/adapters
 *
 * Tests for constants.
 */

import { describe, it, expect } from 'vitest'
import {
	// OpenAI
	OPENAI_DEFAULT_CHAT_MODEL,
	OPENAI_DEFAULT_EMBEDDING_MODEL,
	OPENAI_DEFAULT_EMBEDDING_DIMENSIONS,
	OPENAI_API_BASE_URL,
	// Anthropic
	ANTHROPIC_DEFAULT_CHAT_MODEL,
	ANTHROPIC_API_BASE_URL,
	ANTHROPIC_API_VERSION,
	// Voyage
	VOYAGE_DEFAULT_EMBEDDING_MODEL,
	VOYAGE_DEFAULT_EMBEDDING_DIMENSIONS,
	VOYAGE_API_BASE_URL,
	// Ollama
	OLLAMA_API_BASE_URL,
	OLLAMA_DEFAULT_CHAT_MODEL,
	OLLAMA_DEFAULT_EMBEDDING_MODEL,
	OLLAMA_DEFAULT_TIMEOUT,
	OLLAMA_DEFAULT_EMBEDDING_DIMENSIONS,
	// Rate limiting
	RATE_LIMIT_DEFAULT_REQUESTS_PER_MINUTE,
	RATE_LIMIT_DEFAULT_MAX_CONCURRENT,
	RATE_LIMIT_DEFAULT_WINDOW_MS,
	// Retry
	RETRY_DEFAULT_MAX_RETRIES,
	RETRY_DEFAULT_INITIAL_DELAY_MS,
	RETRY_DEFAULT_MAX_DELAY_MS,
	RETRY_DEFAULT_BACKOFF_MULTIPLIER,
	// Embedding
	EMBEDDING_CACHE_DEFAULT_MAX_ENTRIES,
	EMBEDDING_CACHE_DEFAULT_TTL_MS,
	EMBEDDING_BATCH_DEFAULT_MAX_SIZE,
	EMBEDDING_BATCH_DEFAULT_FLUSH_DELAY_MS,
	// Persistence
	INDEXEDDB_DEFAULT_SESSION_DATABASE,
	INDEXEDDB_DEFAULT_SESSION_STORE,
	INDEXEDDB_DEFAULT_SESSION_TTL_MS,
	// Model multipliers
	DEFAULT_MODEL_MULTIPLIERS,
	// Retryable codes
	DEFAULT_RETRYABLE_CODES,
} from '@mikesaintsg/adapters'

describe('constants', () => {
	describe('OpenAI constants', () => {
		it('has correct default chat model', () => {
			expect(OPENAI_DEFAULT_CHAT_MODEL).toBe('gpt-4o')
		})

		it('has correct default embedding model', () => {
			expect(OPENAI_DEFAULT_EMBEDDING_MODEL).toBe('text-embedding-3-small')
		})

		it('has correct default embedding dimensions', () => {
			expect(OPENAI_DEFAULT_EMBEDDING_DIMENSIONS).toBe(1536)
		})

		it('has correct API base URL', () => {
			expect(OPENAI_API_BASE_URL).toBe('https://api.openai.com/v1')
		})
	})

	describe('Anthropic constants', () => {
		it('has correct default chat model', () => {
			expect(ANTHROPIC_DEFAULT_CHAT_MODEL).toBe('claude-3-5-sonnet-20241022')
		})

		it('has correct API base URL', () => {
			expect(ANTHROPIC_API_BASE_URL).toBe('https://api.anthropic.com')
		})

		it('has correct API version', () => {
			expect(ANTHROPIC_API_VERSION).toBe('2023-06-01')
		})
	})

	describe('Voyage constants', () => {
		it('has correct default embedding model', () => {
			expect(VOYAGE_DEFAULT_EMBEDDING_MODEL).toBe('voyage-2')
		})

		it('has correct default embedding dimensions', () => {
			expect(VOYAGE_DEFAULT_EMBEDDING_DIMENSIONS).toBe(1024)
		})

		it('has correct API base URL', () => {
			expect(VOYAGE_API_BASE_URL).toBe('https://api.voyageai.com/v1')
		})
	})

	describe('Ollama constants', () => {
		it('has correct API base URL for localhost', () => {
			expect(OLLAMA_API_BASE_URL).toBe('http://localhost:11434')
		})

		it('has correct default chat model', () => {
			expect(OLLAMA_DEFAULT_CHAT_MODEL).toBe('llama3')
		})

		it('has correct default embedding model', () => {
			expect(OLLAMA_DEFAULT_EMBEDDING_MODEL).toBe('nomic-embed-text')
		})

		it('has correct default timeout', () => {
			expect(OLLAMA_DEFAULT_TIMEOUT).toBe(120000)
		})

		it('has correct default embedding dimensions', () => {
			expect(OLLAMA_DEFAULT_EMBEDDING_DIMENSIONS).toBe(768)
		})
	})

	describe('Rate limiting constants', () => {
		it('has reasonable default requests per minute', () => {
			expect(RATE_LIMIT_DEFAULT_REQUESTS_PER_MINUTE).toBe(60)
		})

		it('has reasonable default max concurrent', () => {
			expect(RATE_LIMIT_DEFAULT_MAX_CONCURRENT).toBe(10)
		})

		it('has correct window duration', () => {
			expect(RATE_LIMIT_DEFAULT_WINDOW_MS).toBe(60000)
		})
	})

	describe('Retry constants', () => {
		it('has reasonable default max retries', () => {
			expect(RETRY_DEFAULT_MAX_RETRIES).toBe(3)
		})

		it('has reasonable initial delay', () => {
			expect(RETRY_DEFAULT_INITIAL_DELAY_MS).toBe(1000)
		})

		it('has reasonable max delay', () => {
			expect(RETRY_DEFAULT_MAX_DELAY_MS).toBe(30000)
		})

		it('has correct backoff multiplier', () => {
			expect(RETRY_DEFAULT_BACKOFF_MULTIPLIER).toBe(2)
		})
	})

	describe('Embedding cache constants', () => {
		it('has reasonable default max entries', () => {
			expect(EMBEDDING_CACHE_DEFAULT_MAX_ENTRIES).toBe(1000)
		})

		it('has 1 hour default TTL', () => {
			expect(EMBEDDING_CACHE_DEFAULT_TTL_MS).toBe(3600000)
		})
	})

	describe('Embedding batch constants', () => {
		it('has reasonable default batch size', () => {
			expect(EMBEDDING_BATCH_DEFAULT_MAX_SIZE).toBe(100)
		})

		it('has short flush delay', () => {
			expect(EMBEDDING_BATCH_DEFAULT_FLUSH_DELAY_MS).toBe(50)
		})
	})

	describe('Persistence constants', () => {
		it('has correct session database name', () => {
			expect(INDEXEDDB_DEFAULT_SESSION_DATABASE).toBe('mikesaintsg-sessions')
		})

		it('has correct session store name', () => {
			expect(INDEXEDDB_DEFAULT_SESSION_STORE).toBe('sessions')
		})

		it('has 7 day default session TTL', () => {
			expect(INDEXEDDB_DEFAULT_SESSION_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000)
		})
	})

	describe('Model multipliers', () => {
		it('has multipliers for OpenAI models', () => {
			expect(DEFAULT_MODEL_MULTIPLIERS['gpt-4']).toBe(4)
			expect(DEFAULT_MODEL_MULTIPLIERS['gpt-4o']).toBe(4)
		})

		it('has multipliers for Anthropic models', () => {
			expect(DEFAULT_MODEL_MULTIPLIERS['claude-3-5-sonnet-20241022']).toBe(3.5)
		})

		it('has multipliers for Ollama models', () => {
			expect(DEFAULT_MODEL_MULTIPLIERS.llama3).toBe(4)
			expect(DEFAULT_MODEL_MULTIPLIERS.mistral).toBe(4)
		})
	})

	describe('Retryable codes', () => {
		it('includes RATE_LIMIT_ERROR', () => {
			expect(DEFAULT_RETRYABLE_CODES).toContain('RATE_LIMIT_ERROR')
		})

		it('includes NETWORK_ERROR', () => {
			expect(DEFAULT_RETRYABLE_CODES).toContain('NETWORK_ERROR')
		})

		it('includes TIMEOUT_ERROR', () => {
			expect(DEFAULT_RETRYABLE_CODES).toContain('TIMEOUT_ERROR')
		})

		it('includes SERVICE_ERROR', () => {
			expect(DEFAULT_RETRYABLE_CODES).toContain('SERVICE_ERROR')
		})

		it('does not include AUTHENTICATION_ERROR', () => {
			expect(DEFAULT_RETRYABLE_CODES).not.toContain('AUTHENTICATION_ERROR')
		})
	})
})
