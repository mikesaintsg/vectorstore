/**
 * @mikesaintsg/adapters
 *
 * Type definitions for the adapters package.
 * This file contains adapter-specific options and configuration types.
 *
 * Architecture:
 * - Interface definitions come from @mikesaintsg/core
 * - Message/Generation types come from @mikesaintsg/inference
 * - Options types and adapter-specific types are defined here
 *
 * Implementation Recommendations:
 * - Error mapping should be comprehensive:
 *   - Map ALL provider error codes to `AdapterErrorCode`
 *   - Include `providerCode` (original provider error code) in error data
 *   - Include `retryAfter` (milliseconds) for rate limit errors
 *   - Include `context` for debugging information
 * - Rate limiting: Per-adapter with optional shared rate limiter
 * - Retry logic: In adapters via `withRetry()` wrapper
 * - SSE parsing: Shared via helpers/sse.ts for OpenAI, Anthropic, Ollama
 * - Token counting: Model-specific via TokenCounterOptions
 */

// ============================================================================
// Imports from @mikesaintsg/core
// ============================================================================

import type {
	Embedding,
	EmbeddingAdapterInterface,
	ToolCall,
	ToolSchema,
	ToolResult,
	ProviderCapabilities,
	ToolFormatAdapterInterface,
	GenerationDefaults,
	VectorStorePersistenceAdapterInterface,
} from '@mikesaintsg/core'

// ============================================================================
// Imports from @mikesaintsg/inference
// ============================================================================

import type {
	ProviderAdapterInterface,
	StreamHandleInterface,
	PersistedSession,
	SessionSummary,
} from '@mikesaintsg/inference'

// ============================================================================
// Provider Adapter Options
// ============================================================================

/** OpenAI provider adapter options */
export interface OpenAIProviderAdapterOptions {
	/** OpenAI API key */
	readonly apiKey: string
	/** Model to use (default: 'gpt-4o') */
	readonly model?: string
	/** Base URL for API (default: 'https://api.openai.com/v1') */
	readonly baseURL?: string
	/** Organization ID */
	readonly organization?: string
	/** Default generation options */
	readonly defaultOptions?: GenerationDefaults
}

/** Anthropic provider adapter options */
export interface AnthropicProviderAdapterOptions {
	/** Anthropic API key */
	readonly apiKey: string
	/** Model to use (default: 'claude-3-5-sonnet-20241022') */
	readonly model?: string
	/** Base URL for API (default: 'https://api.anthropic.com') */
	readonly baseURL?: string
	/** Default generation options */
	readonly defaultOptions?: GenerationDefaults
}

// ============================================================================
// Embedding Adapter Options
// ============================================================================

/** OpenAI embedding adapter options */
export interface OpenAIEmbeddingAdapterOptions {
	/** OpenAI API key */
	readonly apiKey: string
	/** Model to use (default: 'text-embedding-3-small') */
	readonly model?: string
	/** Output dimensions (optional, for dimension reduction) */
	readonly dimensions?: number
	/** Base URL for API */
	readonly baseURL?: string
}

/** Voyage embedding adapter options */
export interface VoyageEmbeddingAdapterOptions {
	/** Voyage API key */
	readonly apiKey: string
	/** Model to use (default: 'voyage-2') */
	readonly model?: VoyageEmbeddingModel
	/** Base URL for API (default: 'https://api.voyageai.com/v1') */
	readonly baseURL?: string
	/** Input type for embeddings */
	readonly inputType?: 'query' | 'document'
}

/** Voyage embedding model options */
export type VoyageEmbeddingModel =
	| 'voyage-3'
	| 'voyage-3-lite'
	| 'voyage-code-3'
	| 'voyage-finance-2'
	| 'voyage-law-2'
	| 'voyage-multilingual-2'
	| 'voyage-2'
	| 'voyage-code-2'
	| (string & {})

/**
 * Anthropic embedding adapter options (placeholder).
 *
 * NOTE: Anthropic does not currently offer a public embedding API.
 * Voyage AI (https://www.voyageai.com/) is the recommended alternative,
 * as it has a partnership relationship with Anthropic.
 *
 * Use `VoyageEmbeddingAdapterOptions` instead for production embeddings.
 * This interface is reserved for future use if Anthropic releases an embedding API.
 */
export interface AnthropicEmbeddingAdapterOptions {
	/** Anthropic API key */
	readonly apiKey: string
	/** Model to use (reserved for future API) */
	readonly model?: string
	/** Base URL for API */
	readonly baseURL?: string
}

// ============================================================================
// Ollama Adapter Options (Local Development / Testing)
// ============================================================================

/**
 * Ollama provider adapter options.
 *
 * Ollama is the recommended way to test adapters during development
 * without incurring API costs. It runs models locally.
 *
 * @see https://ollama.ai/
 */
export interface OllamaProviderAdapterOptions {
	/** Base URL for Ollama API (default: 'http://localhost:11434') */
	readonly baseURL?: string
	/** Model to use (e.g., 'llama2', 'mistral', 'codellama') */
	readonly model: string
	/** Default generation options */
	readonly defaultOptions?: GenerationDefaults
	/** Keep model loaded in memory (default: true) */
	readonly keepAlive?: boolean | string
	/** Request timeout in ms (default: 120000) */
	readonly timeout?: number
}

/**
 * Ollama embedding adapter options.
 *
 * Ollama supports local embedding generation for development/testing.
 */
export interface OllamaEmbeddingAdapterOptions {
	/** Base URL for Ollama API (default: 'http://localhost:11434') */
	readonly baseURL?: string
	/** Model to use for embeddings (e.g., 'nomic-embed-text', 'mxbai-embed-large') */
	readonly model: string
	/** Request timeout in ms (default: 60000) */
	readonly timeout?: number
}

/** Common Ollama embedding models */
export type OllamaEmbeddingModel =
	| 'nomic-embed-text'
	| 'mxbai-embed-large'
	| 'all-minilm'
	| 'snowflake-arctic-embed'
	| (string & {})

/** Common Ollama chat models */
export type OllamaChatModel =
	| 'llama2'
	| 'llama2:13b'
	| 'llama2:70b'
	| 'llama3'
	| 'llama3:8b'
	| 'llama3:70b'
	| 'mistral'
	| 'mixtral'
	| 'codellama'
	| 'deepseek-coder'
	| 'phi'
	| 'qwen'
	| 'gemma'
	| 'gemma2'
	| (string & {})

// ============================================================================
// Rate Limiting Types
// ============================================================================

/**
 * Rate limiter interface.
 * Allows coordinated rate limiting across adapters.
 */
export interface RateLimiterInterface {
	/** Acquire a slot, returns when available */
	acquire(): Promise<void>
	/** Release a slot */
	release(): void
	/** Get current state */
	getState(): RateLimiterState
	/** Set rate limit dynamically (e.g., from Retry-After header) */
	setLimit(requestsPerMinute: number): void
}

/** Rate limiter state */
export interface RateLimiterState {
	/** Current number of active requests */
	readonly activeRequests: number
	/** Maximum concurrent requests */
	readonly maxConcurrent: number
	/** Requests made in current window */
	readonly requestsInWindow: number
	/** Requests allowed per minute */
	readonly requestsPerMinute: number
	/** Time until window resets (ms) */
	readonly windowResetIn: number
}

/** Rate limiter options */
export interface RateLimiterOptions {
	/** Maximum requests per minute (default: 60) */
	readonly requestsPerMinute?: number
	/** Maximum concurrent requests (default: 10) */
	readonly maxConcurrent?: number
	/** Window size in ms (default: 60000) */
	readonly windowMs?: number
}

/** Provider-specific rate limiter options (per-adapter) */
export interface AdapterRateLimiterOptions extends RateLimiterOptions {
	/** Optional shared rate limiter (for cross-adapter coordination) */
	readonly sharedLimiter?: RateLimiterInterface
	/** Use shared limiter instead of per-adapter (default: false) */
	readonly useShared?: boolean
}

// ============================================================================
// Retry Logic Types
// ============================================================================

/**
 * Retry strategy for adapter operations.
 * Retry logic is placed in adapters via composition wrappers.
 */
export interface RetryOptions {
	/** Maximum number of retry attempts (default: 3) */
	readonly maxRetries?: number
	/** Initial delay in ms (default: 1000) */
	readonly initialDelayMs?: number
	/** Maximum delay in ms (default: 30000) */
	readonly maxDelayMs?: number
	/** Exponential backoff multiplier (default: 2) */
	readonly backoffMultiplier?: number
	/** Add jitter to delays (default: true) */
	readonly jitter?: boolean
	/** Error codes that should trigger retry */
	readonly retryableCodes?: readonly AdapterErrorCode[]
	/** Custom retry condition */
	readonly shouldRetry?: (error: unknown, attempt: number) => boolean
	/** Called before each retry attempt */
	readonly onRetry?: (error: unknown, attempt: number, delayMs: number) => void
}

/** Retry wrapper for provider adapters */
export interface RetryableProviderAdapterOptions {
	/** Base provider adapter to wrap */
	readonly adapter: ProviderAdapterInterface
	/** Retry options */
	readonly retry: RetryOptions
}

/** Retry wrapper for embedding adapters */
export interface RetryableEmbeddingAdapterOptions {
	/** Base embedding adapter to wrap */
	readonly adapter: EmbeddingAdapterInterface
	/** Retry options */
	readonly retry: RetryOptions
}

// ============================================================================
// Model Multipliers (Token counting is owned by @mikesaintsg/inference)
// ============================================================================

/**
 * Model-specific token estimation multipliers.
 *
 * Token counting logic is owned by `@mikesaintsg/inference`.
 * This package provides model-specific multipliers as constants
 * that can be passed to inference's token counter for improved accuracy.
 *
 * @see DEFAULT_MODEL_MULTIPLIERS in constants.ts
 */
export interface ModelTokenMultipliers {
	/** OpenAI models typically use ~4 chars/token */
	readonly 'gpt-4': number
	readonly 'gpt-4o': number
	readonly 'gpt-3.5-turbo': number
	/** Anthropic models may differ slightly */
	readonly 'claude-3-5-sonnet-20241022': number
	readonly 'claude-3-opus-20240229': number
	readonly 'claude-3-sonnet-20240229': number
	readonly 'claude-3-haiku-20240307': number
	/** Ollama models vary by base model */
	readonly 'llama2': number
	readonly 'llama3': number
	readonly 'mistral': number
	/** Index signature for other models */
	readonly [model: string]: number
}

/** Batched embedding adapter options */
export interface BatchedEmbeddingAdapterOptions {
	/** Base embedding adapter to wrap */
	readonly adapter: EmbeddingAdapterInterface
	/** Maximum batch size (default: 100) */
	readonly batchSize?: number
	/** Delay between batches in ms (default: 50) */
	readonly delayMs?: number
	/** Deduplicate identical texts */
	readonly deduplicate?: boolean
}

/** Cached embedding entry */
export interface CachedEmbedding {
	readonly embedding: Embedding
	readonly cachedAt: number
}

/** Generic cache interface */
export interface CacheInterface<T> {
	get(key: string): T | undefined
	set(key: string, value: T): void
	delete(key: string): boolean
	clear(): void
}

/** Cached embedding adapter options */
export interface CachedEmbeddingAdapterOptions {
	/** Base embedding adapter to wrap */
	readonly adapter: EmbeddingAdapterInterface
	/** Cache implementation (Map or custom) */
	readonly cache: Map<string, CachedEmbedding> | CacheInterface<CachedEmbedding>
	/** Time-to-live in ms (default: 3600000 = 1 hour) */
	readonly ttlMs?: number
}

// ============================================================================
// Tool Format Adapter Options
// ============================================================================

/** OpenAI tool choice type */
export type OpenAIToolChoice =
	| 'auto'
	| 'none'
	| 'required'
	| { readonly type: 'function'; readonly function: { readonly name: string } }

/** OpenAI tool format adapter options */
export interface OpenAIToolFormatAdapterOptions {
	/** Tool choice behavior */
	readonly toolChoice?: OpenAIToolChoice
}

/** Anthropic tool choice type */
export type AnthropicToolChoice =
	| 'auto'
	| 'any'
	| { readonly type: 'tool'; readonly name: string }

/** Anthropic tool format adapter options */
export interface AnthropicToolFormatAdapterOptions {
	/** Tool choice behavior */
	readonly toolChoice?: AnthropicToolChoice
}

// ============================================================================
// Session Persistence Options
// ============================================================================

/** Session persistence adapter interface */
export interface SessionPersistenceAdapterInterface {
	save(session: PersistedSession): Promise<void>
	load(id: string): Promise<PersistedSession | undefined>
	remove(id: string): Promise<void>
	all(): Promise<readonly SessionSummary[]>
	clear(): Promise<void>
}

/** IndexedDB session persistence options */
export interface IndexedDBSessionPersistenceOptions {
	/** Database name (default: 'mikesaintsg-sessions') */
	readonly databaseName?: string
	/** Store name (default: 'sessions') */
	readonly storeName?: string
	/** Time-to-live for sessions in ms (default: 7 days) */
	readonly ttlMs?: number
}

// ============================================================================
// VectorStore Persistence Options
// ============================================================================

/** IndexedDB vector persistence options */
export interface IndexedDBVectorPersistenceOptions {
	/** Database name */
	readonly databaseName: string
	/** Documents store name (default: 'documents') */
	readonly documentsStore?: string
	/** Metadata store name (default: 'metadata') */
	readonly metadataStore?: string
}

/** OPFS vector persistence options */
export interface OPFSVectorPersistenceOptions {
	/** Directory name in OPFS */
	readonly directoryName: string
	/** Chunk size for large files (default: 1MB) */
	readonly chunkSize?: number
}

/** HTTP vector persistence options */
export interface HTTPVectorPersistenceOptions {
	/** Base URL for API */
	readonly baseURL: string
	/** Additional headers */
	readonly headers?: Readonly<Record<string, string>>
	/** Request timeout in ms (default: 30000) */
	readonly timeout?: number
}

// ============================================================================
// Bridge Types
// ============================================================================

/** Tool registry interface (from contextprotocol) */
export interface ToolRegistryInterface {
	getSchemas(): readonly ToolSchema[]
	execute(name: string, args: unknown): Promise<unknown>
	has(name: string): boolean
}

/** Tool call bridge interface */
export interface ToolCallBridgeInterface {
	execute(toolCall: ToolCall): Promise<ToolResult>
	executeAll(toolCalls: readonly ToolCall[]): Promise<readonly ToolResult[]>
	hasTool(name: string): boolean
}

/** Tool call bridge options */
export interface ToolCallBridgeOptions {
	/** Tool registry for execution */
	readonly registry: ToolRegistryInterface
	/** Timeout per tool execution in ms (default: 30000) */
	readonly timeout?: number
	/** Error handler */
	readonly onError?: (error: unknown, toolCall: ToolCall) => void
	/** Called before tool execution */
	readonly onBeforeExecute?: (toolCall: ToolCall) => void
	/** Called after successful tool execution */
	readonly onAfterExecute?: (toolCall: ToolCall, result: unknown) => void
}

/** VectorStore interface (from vectorstore) */
export interface VectorStoreInterface {
	search(
		query: string,
		options?: { readonly topK?: number; readonly minScore?: number }
	): Promise<readonly SearchResult[]>
}

/** Search result from vector store */
export interface SearchResult {
	readonly id: string
	readonly content: string
	readonly score: number
	readonly metadata?: Readonly<Record<string, unknown>>
}

/** Retrieval tool options */
export interface RetrievalToolOptions {
	/** VectorStore to query */
	readonly vectorStore: VectorStoreInterface
	/** Tool name */
	readonly name: string
	/** Tool description */
	readonly description: string
	/** Number of results to return (default: 5) */
	readonly topK?: number
	/** Minimum similarity score (default: 0.7) */
	readonly minScore?: number
	/** Result formatter */
	readonly formatResult?: (result: SearchResult) => unknown
}

/** Retrieval tool result */
export interface RetrievalToolResult {
	/** Tool schema for registration */
	readonly schema: ToolSchema
	/** Execute function for the tool */
	readonly execute: (params: { readonly query: string }) => Promise<readonly SearchResult[]>
}

// ============================================================================
// Error Types
// ============================================================================

/** Adapter error codes */
export type AdapterErrorCode =
	| 'AUTHENTICATION_ERROR'
	| 'RATE_LIMIT_ERROR'
	| 'QUOTA_EXCEEDED_ERROR'
	| 'NETWORK_ERROR'
	| 'TIMEOUT_ERROR'
	| 'INVALID_REQUEST_ERROR'
	| 'MODEL_NOT_FOUND_ERROR'
	| 'CONTEXT_LENGTH_ERROR'
	| 'CONTENT_FILTER_ERROR'
	| 'SERVICE_ERROR'
	| 'UNKNOWN_ERROR'

/** Adapter error data */
export interface AdapterErrorData {
	/** Error code */
	readonly code: AdapterErrorCode
	/** Provider-specific error code */
	readonly providerCode?: string
	/** Retry after (for rate limits) in ms */
	readonly retryAfter?: number
	/** Additional context */
	readonly context?: Readonly<Record<string, unknown>>
}

// ============================================================================
// Factory Function Types
// ============================================================================

/** Factory function for OpenAI provider adapter */
export type CreateOpenAIProviderAdapter = (
	options: OpenAIProviderAdapterOptions
) => ProviderAdapterInterface

/** Factory function for Anthropic provider adapter */
export type CreateAnthropicProviderAdapter = (
	options: AnthropicProviderAdapterOptions
) => ProviderAdapterInterface

/** Factory function for OpenAI embedding adapter */
export type CreateOpenAIEmbeddingAdapter = (
	options: OpenAIEmbeddingAdapterOptions
) => EmbeddingAdapterInterface

/** Factory function for Voyage embedding adapter */
export type CreateVoyageEmbeddingAdapter = (
	options: VoyageEmbeddingAdapterOptions
) => EmbeddingAdapterInterface

/** Factory function for OpenAI tool format adapter */
export type CreateOpenAIToolFormatAdapter = (
	options?: OpenAIToolFormatAdapterOptions
) => ToolFormatAdapterInterface

/** Factory function for Anthropic tool format adapter */
export type CreateAnthropicToolFormatAdapter = (
	options?: AnthropicToolFormatAdapterOptions
) => ToolFormatAdapterInterface

/** Factory function for tool call bridge */
export type CreateToolCallBridge = (
	options: ToolCallBridgeOptions
) => ToolCallBridgeInterface

/** Factory function for retrieval tool */
export type CreateRetrievalTool = (
	options: RetrievalToolOptions
) => RetrievalToolResult

/** Factory function for session persistence */
export type CreateIndexedDBSessionPersistence = (
	options?: IndexedDBSessionPersistenceOptions
) => SessionPersistenceAdapterInterface

/** Factory function for IndexedDB vector persistence */
export type CreateIndexedDBVectorPersistence = (
	options: IndexedDBVectorPersistenceOptions
) => VectorStorePersistenceAdapterInterface

/** Factory function for HTTP vector persistence */
export type CreateHTTPVectorPersistence = (
	options: HTTPVectorPersistenceOptions
) => VectorStorePersistenceAdapterInterface

/** Factory function for Ollama provider adapter */
export type CreateOllamaProviderAdapter = (
	options: OllamaProviderAdapterOptions
) => ProviderAdapterInterface

/** Factory function for Ollama embedding adapter */
export type CreateOllamaEmbeddingAdapter = (
	options: OllamaEmbeddingAdapterOptions
) => EmbeddingAdapterInterface

/** Factory function for rate limiter */
export type CreateRateLimiter = (
	options?: RateLimiterOptions
) => RateLimiterInterface

/**
 * Factory function for retryable provider adapter wrapper.
 * Wraps a base provider adapter with retry logic.
 */
export type CreateRetryableProviderAdapter = (
	options: RetryableProviderAdapterOptions
) => ProviderAdapterInterface

/**
 * Factory function for retryable embedding adapter wrapper.
 * Wraps a base embedding adapter with retry logic.
 */
export type CreateRetryableEmbeddingAdapter = (
	options: RetryableEmbeddingAdapterOptions
) => EmbeddingAdapterInterface

/**
 * Factory function for batched embedding adapter wrapper.
 * Wraps a base embedding adapter with batching support.
 */
export type CreateBatchedEmbeddingAdapter = (
	options: BatchedEmbeddingAdapterOptions
) => EmbeddingAdapterInterface

/**
 * Factory function for cached embedding adapter wrapper.
 * Wraps a base embedding adapter with caching support.
 */
export type CreateCachedEmbeddingAdapter = (
	options: CachedEmbeddingAdapterOptions
) => EmbeddingAdapterInterface

// ============================================================================
// API Response Types (Internal to Adapters)
// ============================================================================

/** OpenAI chat completion chunk */
export interface OpenAIChatCompletionChunk {
	readonly id: string
	readonly object: 'chat.completion.chunk'
	readonly created: number
	readonly model: string
	readonly choices: readonly OpenAIChatCompletionChunkChoice[]
}

/** OpenAI chat completion chunk choice */
export interface OpenAIChatCompletionChunkChoice {
	readonly index: number
	readonly delta: OpenAIChatCompletionDelta
	readonly finish_reason: string | null
}

/** OpenAI chat completion delta */
export interface OpenAIChatCompletionDelta {
	readonly role?: string
	readonly content?: string
	readonly tool_calls?: readonly OpenAIToolCallDelta[]
}

/** OpenAI tool call delta */
export interface OpenAIToolCallDelta {
	readonly index: number
	readonly id?: string
	readonly type?: 'function'
	readonly function?: {
		readonly name?: string
		readonly arguments?: string
	}
}

/** Anthropic message stream event */
export interface AnthropicMessageStreamEvent {
	readonly type: string
	readonly index?: number
	readonly content_block?: AnthropicContentBlock
	readonly delta?: AnthropicDelta
}

/** Anthropic content block */
export interface AnthropicContentBlock {
	readonly type: 'text' | 'tool_use'
	readonly text?: string
	readonly id?: string
	readonly name?: string
	readonly input?: unknown
}

/** Anthropic delta */
export interface AnthropicDelta {
	readonly type: string
	readonly text?: string
	readonly partial_json?: string
}

// ============================================================================
// OpenAI Embedding API Response Types
// ============================================================================

/** OpenAI embedding response */
export interface OpenAIEmbeddingResponse {
	readonly object: 'list'
	readonly data: readonly OpenAIEmbeddingData[]
	readonly model: string
	readonly usage: OpenAIEmbeddingUsage
}

/** OpenAI embedding data item */
export interface OpenAIEmbeddingData {
	readonly object: 'embedding'
	readonly index: number
	readonly embedding: readonly number[]
}

/** OpenAI embedding usage */
export interface OpenAIEmbeddingUsage {
	readonly prompt_tokens: number
	readonly total_tokens: number
}

// ============================================================================
// Voyage AI Embedding API Response Types
// ============================================================================

/** Voyage AI embedding response */
export interface VoyageEmbeddingResponse {
	readonly object: 'list'
	readonly data: readonly VoyageEmbeddingData[]
	readonly model: string
	readonly usage: VoyageEmbeddingUsage
}

/** Voyage AI embedding data item */
export interface VoyageEmbeddingData {
	readonly object: 'embedding'
	readonly index: number
	readonly embedding: readonly number[]
}

/** Voyage AI embedding usage */
export interface VoyageEmbeddingUsage {
	readonly total_tokens: number
}

// ============================================================================
// Ollama API Response Types (Internal to Adapters)
// ============================================================================

/** Ollama chat completion request */
export interface OllamaChatRequest {
	readonly model: string
	readonly messages: readonly OllamaChatMessage[]
	readonly stream?: boolean
	readonly format?: 'json'
	readonly options?: OllamaModelOptions
	readonly keep_alive?: boolean | string
	readonly tools?: readonly OllamaTool[]
}

/** Ollama chat message */
export interface OllamaChatMessage {
	readonly role: 'system' | 'user' | 'assistant' | 'tool'
	readonly content: string
	readonly images?: readonly string[]
	readonly tool_calls?: readonly OllamaToolCall[]
}

/** Ollama model options */
export interface OllamaModelOptions {
	readonly temperature?: number
	readonly top_p?: number
	readonly top_k?: number
	readonly num_predict?: number
	readonly stop?: readonly string[]
	readonly seed?: number
}

/** Ollama chat completion response (non-streaming) */
export interface OllamaChatResponse {
	readonly model: string
	readonly created_at: string
	readonly message: OllamaChatMessage
	readonly done: boolean
	readonly total_duration?: number
	readonly load_duration?: number
	readonly prompt_eval_count?: number
	readonly prompt_eval_duration?: number
	readonly eval_count?: number
	readonly eval_duration?: number
}

/** Ollama chat completion chunk (streaming) */
export interface OllamaChatStreamChunk {
	readonly model: string
	readonly created_at: string
	readonly message: OllamaChatMessage
	readonly done: boolean
	readonly done_reason?: 'stop' | 'length' | 'load'
	readonly total_duration?: number
	readonly load_duration?: number
	readonly prompt_eval_count?: number
	readonly prompt_eval_duration?: number
	readonly eval_count?: number
	readonly eval_duration?: number
}

/** Ollama tool definition */
export interface OllamaTool {
	readonly type: 'function'
	readonly function: OllamaToolFunction
}

/** Ollama tool function definition */
export interface OllamaToolFunction {
	readonly name: string
	readonly description: string
	readonly parameters: unknown
}

/** Ollama tool call from response */
export interface OllamaToolCall {
	readonly id?: string
	readonly type?: 'function'
	readonly function: {
		readonly name: string
		readonly arguments: Readonly<Record<string, unknown>>
	}
}

/** Ollama embedding request */
export interface OllamaEmbeddingRequest {
	readonly model: string
	readonly input: string | readonly string[]
	readonly truncate?: boolean
	readonly keep_alive?: boolean | string
}

/** Ollama embedding response */
export interface OllamaEmbeddingResponse {
	readonly model: string
	readonly embeddings: readonly (readonly number[])[]
	readonly total_duration?: number
	readonly load_duration?: number
	readonly prompt_eval_count?: number
}

/** Ollama model info (from /api/show) */
export interface OllamaModelInfo {
	readonly modelfile: string
	readonly parameters: string
	readonly template: string
	readonly details: OllamaModelDetails
}

/** Ollama model details */
export interface OllamaModelDetails {
	readonly parent_model: string
	readonly format: string
	readonly family: string
	readonly families: readonly string[]
	readonly parameter_size: string
	readonly quantization_level: string
}

/** Ollama list models response */
export interface OllamaListModelsResponse {
	readonly models: readonly OllamaModelSummary[]
}

/** Ollama model summary */
export interface OllamaModelSummary {
	readonly name: string
	readonly model: string
	readonly modified_at: string
	readonly size: number
	readonly digest: string
	readonly details: OllamaModelDetails
}

// ============================================================================
// SSE Parsing Types (Shared across providers)
// ============================================================================

/**
 * SSE event from parsing.
 * Used by helpers/sse.ts for shared SSE parsing logic.
 */
export interface SSEEvent {
	readonly event?: string
	readonly data: string
	readonly id?: string
	readonly retry?: number
}

/**
 * SSE parser options.
 * SSE parsing is shared across OpenAI, Anthropic, and Ollama adapters.
 */
export interface SSEParserOptions {
	/** Called for each parsed event */
	readonly onEvent: (event: SSEEvent) => void
	/** Called on parse error */
	readonly onError?: (error: Error) => void
	/** Called when stream ends */
	readonly onEnd?: () => void
}

/**
 * SSE parser interface.
 * Stateful parser that handles chunked SSE data.
 */
export interface SSEParserInterface {
	/** Feed data chunk to parser */
	feed(chunk: string): void
	/** Signal end of stream */
	end(): void
	/** Reset parser state */
	reset(): void
}
