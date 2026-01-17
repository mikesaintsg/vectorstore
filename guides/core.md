# @mikesaintsg/core API Guide

> **Shared types, contracts, and interfaces for the @mikesaintsg ecosystem.**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Shared Types](#shared-types)
6. [Embedding Contract](#embedding-contract)
7. [Adapter Interfaces](#adapter-interfaces)
8. [Bridge Interfaces](#bridge-interfaces)
9. [Result Pattern](#result-pattern)
10. [Error Utilities](#error-utilities)
11. [Integration Patterns](#integration-patterns)
12. [TypeScript Integration](#typescript-integration)
13. [API Reference](#api-reference)
14. [License](#license)

---

## Introduction

### Value Proposition

`@mikesaintsg/core` defines the shared type contracts and interfaces for the @mikesaintsg ecosystem:

- **Shared contracts** — Types that multiple packages depend on
- **Bridge interfaces** — Standard contracts for cross-package communication
- **Utility types** — Common patterns like `Result<T, E>` and `Unsubscribe`
- **Error primitives** — Base classes for consistent error handling

### What This Package Is

| Provides | Description |
|----------|-------------|
| Shared type definitions | Types used across multiple packages |
| Interface definitions | Contracts implemented by adapters |
| Bridge interfaces | Contracts for cross-package bridges |
| Utility types | Common patterns like `Result<T, E>` |
| Error base classes | Shared error handling primitives |

### What This Package Is NOT

| Does Not Provide | Reason |
|------------------|--------|
| Adapter implementations | Owned by `@mikesaintsg/adapters` |
| Persistence logic | Owned by `storage`, `indexeddb`, `filesystem` |
| LLM API calls | Owned by `inference` via adapters |
| UI components | Owned by `form`, `table` |
| Tool execution | Owned by `contextprotocol` |
| Vector search | Owned by `vectorstore` |

### Package Responsibilities

```
@mikesaintsg/core owns:
├── Contracts and interfaces used by 2+ packages
├── Interface definitions (EmbeddingAdapterInterface, ToolFormatAdapterInterface, etc.)
├── Utility types (Result, Unsubscribe, AbortableOptions)
├── Bridge interfaces (ToolCallBridgeInterface, etc.)
├── Shared data types (BuiltContext, ContextFrame, ScoredResult, etc.)
└── Base error utilities (EcosystemError, PackageErrorData)

@mikesaintsg/adapters owns:
├── Provider implementations (OpenAI, Anthropic, Ollama)
├── Embedding implementations (OpenAI, Voyage, Ollama)
├── Embedding wrapper adapters (batched, cached, retryable)
├── Tool format translators (per provider)
├── SSE parsing (shared helper)
├── Rate limiting utilities
├── Persistence adapters (IndexedDB, OPFS, HTTP)
├── Cross-package bridges (tool-call, retrieval)
├── Model-specific token multipliers
└── Provider-specific error mapping

@mikesaintsg/inference owns:
├── ProviderAdapterInterface (depends on Message types)
├── Engine, Session, StreamHandle
├── Generation and message types
├── Token counting logic
├── Token batching
├── Abort coordination (AbortScope)
└── Timeout monitoring

@mikesaintsg/contextbuilder owns:
├── Context assembly and deduplication
├── Token budget management
├── Section tracking
├── File tracking
├── Template registry
├── ContextBuilder, ContextManager
└── Sliding window management

@mikesaintsg/contextprotocol owns:
├── Tool registry
├── Tool schema validation
├── Tool execution routing
├── Argument validation
└── Result formatting

@mikesaintsg/vectorstore owns:
├── Vector storage and search
├── Document management
├── Similarity algorithms
└── In-memory persistence adapter
```

### Ecosystem Ownership Table

| Component                         | Owner           | Notes                                       |
|-----------------------------------|-----------------|---------------------------------------------|
| `EmbeddingAdapterInterface`       | core            | Interface definition                        |
| `createOpenAIEmbeddingAdapter`    | adapters        | Implementation                              |
| `ProviderAdapterInterface`        | inference       | Depends on Message types                    |
| `createOpenAIProviderAdapter`     | adapters        | Implementation                              |
| `ToolFormatAdapterInterface`      | core            | Interface definition                        |
| `createOpenAIToolFormatAdapter`   | adapters        | Implementation                              |
| `BuiltContext`                    | core            | Shared data structure                       |
| `ContextBuilder`                  | contextbuilder  | Assembles BuiltContext                      |
| `Engine.generateFromContext`      | inference       | Consumes BuiltContext                       |
| Token counting                    | inference       | `Engine.countTokens()`                      |
| Model multipliers                 | adapters        | `DEFAULT_MODEL_MULTIPLIERS` constant        |
| SSE parsing                       | adapters        | Shared across providers                     |
| Rate limiting                     | adapters        | Per-adapter + optional shared               |
| Retry logic                       | adapters        | Wrapper adapters                            |
| Tool registry                     | contextprotocol | Schema storage and execution                |
| Tool call bridge                  | adapters        | Connects inference ↔ contextprotocol        |

---

## Installation

```bash
npm install @mikesaintsg/core
```

For full ecosystem integration: 

```bash
npm install @mikesaintsg/core @mikesaintsg/inference @mikesaintsg/vectorstore @mikesaintsg/contextprotocol
```

---

## Quick Start

### Using Shared Types

```ts
import type {
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
	Embedding,
	Unsubscribe,
	Result,
} from '@mikesaintsg/core'

import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'

// Types from core, implementation from adapters
const adapter: EmbeddingAdapterInterface = createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY,
})
```

### Using Bridge Functions

```ts
import { createToolCallBridge } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'
import { createToolRegistry } from '@mikesaintsg/contextprotocol'
import { createOpenAIProviderAdapter } from '@mikesaintsg/adapters'

const provider = createOpenAIProviderAdapter({ apiKey: process.env.OPENAI_API_KEY })
const engine = createEngine({ provider })
const registry = createToolRegistry()

// Bridge handles tool call flow automatically
const bridge = createToolCallBridge({
	registry,
	onError: (error) => console.error('Tool execution failed:', error),
})

const session = engine.createSession({ system: 'You are helpful.' })
const stream = await session.generate({ tools: registry.getSchemas() })

// Bridge processes tool calls and returns results
for await (const event of stream) {
	if (event.type === 'tool_call') {
		const result = await bridge.execute(event.toolCall)
		session.addToolResult(result)
	}
}
```

### Using Result Pattern

```ts
import { ok, err, isOk, isErr, unwrap, type Result } from '@mikesaintsg/core'

function divide(a: number, b: number): Result<number, 'DIVISION_BY_ZERO'> {
	if (b === 0) {
		return err('DIVISION_BY_ZERO')
	}
	return ok(a / b)
}

const result = divide(10, 2)

if (isOk(result)) {
	console.log(result. value) // 5
} else {
	console.log(result.error) // Never reached
}

// Or unwrap with default
const value = unwrap(result, 0) // 5
```

---

## Core Concepts

### Design Philosophy

1. **Contracts over implementation** — Define interfaces, not logic
2. **Bridges over boilerplate** — Standardize common integration patterns
3. **Types over runtime** — Most value is at compile time
4. **Optional integration** — Packages work without core; core makes them work better together

### Dependency Direction

```
┌─────────────────────────────────────────────────────────────┐
│                     User Application                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Uses bridge functions from core to connect packages       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────┐  ┌───────────┐  ┌───────────────┐           │
│   │inference │  │vectorstore│  │contextprotocol│           │
│   └────┬─────┘  └─────┬─────┘  └───────┬───────┘           │
│        │              │                │                    │
│        └──────────────┼────────────────┘                    │
│                       │                                     │
│                       ▼                                     │
│              ┌────────────────┐                             │
│              │     core       │                             │
│              │ (types only)   │                             │
│              └────────────────┘                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Packages import **types** from core.  Core never imports from packages.

### What Qualifies for Core

A type or function belongs in core if: 

1. **Two or more packages** would otherwise duplicate it
2. **Integration code** is written identically by most users
3. **The contract is stable** and unlikely to change per-package

### Method Semantics

| Pattern | Returns | Use Case |
|---------|---------|----------|
| `create*Bridge()` | Bridge interface | Connect two packages |
| `create*Tool()` | Tool schema + handler | Standard tool patterns |
| `create*Guard()` | Guard function | Navigation guards |
| `ok(value)` | `Result` success | Result pattern |
| `err(error)` | `Result` failure | Result pattern |
| `is*(value)` | `boolean` | Type guards |

---

## Shared Types

### Unsubscribe

The universal cleanup function type:

```ts
/**
 * Cleanup function returned by event subscriptions. 
 * Call to stop receiving events and release resources.
 */
type Unsubscribe = () => void
```

Used by all packages for event subscriptions: 

```ts
import type { Unsubscribe } from '@mikesaintsg/core'

const unsubscribe:  Unsubscribe = storage.onChange((key, value) => {
	console.log(`${key} changed to ${value}`)
})

// Later:  cleanup
unsubscribe()
```

### DestroyFn

Lifecycle cleanup function:

```ts
/**
 * Cleanup function for destroying resources.
 * Unlike Unsubscribe, this is for complete teardown.
 */
type DestroyFn = () => void
```

### Destroyable

Interface for resources that need cleanup:

```ts
/**
 * Resource that must be explicitly destroyed.
 */
interface Destroyable {
	/**
	 * Release all resources held by this instance.
	 * After calling, the instance is unusable.
	 */
	destroy(): void
}
```

### ChangeSource

Origin of a state change:

```ts
/**
 * Indicates where a change originated.
 */
type ChangeSource = 'local' | 'remote'
```

Used by `storage`, `broadcast`, and `indexeddb` for cross-tab awareness:

```ts
import type { ChangeSource } from '@mikesaintsg/core'

storage.onChange((key, value, source:  ChangeSource) => {
	if (source === 'remote') {
		// Another tab made this change
		updateUI(key, value)
	}
})
```

### Abortable

Interface for cancellable operations:

```ts
/**
 * Operation that can be cancelled via AbortSignal.
 */
interface AbortableOptions {
	readonly signal?: AbortSignal
}
```

### StorageInfo

Storage quota and usage information shared between `filesystem` and `indexeddb`:

```ts
/**
 * Storage information (quota and usage).
 * Used by filesystem.getQuota() and indexeddb.getStorageEstimate().
 */
interface StorageInfo {
	/** Current storage usage in bytes */
	readonly usage: number
	/** Maximum storage quota in bytes */
	readonly quota: number
	/** Available storage in bytes */
	readonly available: number
	/** Percentage of quota used (0-100) */
	readonly percentUsed: number
}
```

Usage:

```ts
import type { StorageInfo } from '@mikesaintsg/core'

// From filesystem
const fsQuota: StorageInfo = await fileSystem.getQuota()
console.log(`Using ${fsQuota.percentUsed.toFixed(1)}% of storage`)

// From indexeddb
const dbQuota: StorageInfo = await database.getStorageEstimate()
console.log(`${dbQuota.available} bytes available`)
```

### PruneResult

Result information from prune operations, used by `storage` and `indexeddb`:

```ts
/**
 * Result from pruning expired entries.
 */
interface PruneResult {
	/** Number of entries removed */
	readonly prunedCount: number
	/** Number of entries remaining */
	readonly remainingCount: number
}
```

### ContentHash

Content hash for deduplication, used by `contextbuilder`:

```ts
/**
 * Content hash for deduplication (SHA-256 hex string).
 */
type ContentHash = string
```

### ScoredResult

Scored result from similarity search, used by `vectorstore` and `contextbuilder`:

```ts
/**
 * Scored result from similarity search or retrieval.
 */
interface ScoredResult {
	readonly id: string
	readonly content: string
	readonly score: number
	readonly metadata?: Readonly<Record<string, unknown>>
	readonly embedding?: Embedding
}
```

### Context Frame Types

Types for context assembly, used by `contextbuilder` and `inference`:

```ts
/**
 * Frame type discriminator.
 */
type FrameType =
	| 'system'
	| 'instruction'
	| 'section'
	| 'file'
	| 'document'
	| 'example'
	| 'tool'
	| 'memory'
	| 'retrieval'
	| 'custom'

/**
 * Frame priority levels.
 */
type FramePriority = 'critical' | 'high' | 'normal' | 'low' | 'optional'

/**
 * Context frame - atomic unit of context.
 */
interface ContextFrame {
	readonly id: string
	readonly type: FrameType
	readonly content: string
	readonly contentHash: ContentHash
	readonly priority: FramePriority
	readonly tokenEstimate: number
	readonly createdAt: number
	readonly metadata?: FrameMetadata
}
```

### Token Budget Types

Types for token budget management, used by `contextbuilder` and `inference`:

```ts
/**
 * Token budget level.
 */
type TokenBudgetLevel = 'ok' | 'warning' | 'critical' | 'exceeded'

/**
 * Token budget state.
 */
interface TokenBudgetState {
	readonly used: number
	readonly available: number
	readonly reserved: number
	readonly max: number
	readonly usage: number
	readonly level: TokenBudgetLevel
}
```

### BuiltContext

Assembled context ready for inference, used by `contextbuilder` and `inference`:

```ts
/**
 * Assembled context ready for inference.
 */
interface BuiltContext {
	readonly frames: readonly ContextFrame[]
	readonly totalTokens: number
	readonly budget: TokenBudgetState
	readonly truncated: boolean
	readonly truncationInfo?: TruncationInfo
	readonly deduplication?: DeduplicationResult
	readonly timestamp: number
}
```

---

## Embedding Contract

### The Problem

`vectorstore` needs embeddings.  `inference` provides them. Without a shared contract: 

```ts
// vectorstore would define its own interface
interface VectorStoreEmbeddingAdapter { /* ... */ }

// inference would define a different interface
interface InferenceEmbeddingAdapter { /* ... */ }

// User must write adapter between them
```

### The Solution

Core owns the embedding contract that both packages implement/consume:

```ts
import type {
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
	Embedding,
} from '@mikesaintsg/core'
```

### Embedding Type

```ts
/**
 * A single embedding vector.
 * Float32Array for memory efficiency and typed array operations.
 */
type Embedding = Float32Array
```

### EmbeddingModelMetadata

```ts
/**
 * Metadata identifying an embedding model.
 * Used to ensure vector compatibility.
 */
interface EmbeddingModelMetadata {
	/** Provider name (e.g., 'openai', 'anthropic') */
	readonly provider: string

	/** Model identifier (e.g., 'text-embedding-3-small') */
	readonly model: string

	/** Vector dimensions produced by this model */
	readonly dimensions: number
}
```

### EmbeddingAdapterInterface

```ts
/**
 * Contract for embedding generation.
 * Implemented by inference, consumed by vectorstore.
 */
interface EmbeddingAdapterInterface {
	/**
	 * Generate embeddings for one or more texts.
	 *
	 * @param texts - Texts to embed
	 * @param options - Optional abort signal
	 * @returns Embeddings in same order as input texts
	 *
	 * @example
	 * ```ts
	 * const embeddings = await adapter.embed(['Hello', 'World'])
	 * // embeddings[0] corresponds to 'Hello'
	 * // embeddings[1] corresponds to 'World'
	 * ```
	 */
	embed(
		texts: readonly string[],
		options?: AbortableOptions
	): Promise<readonly Embedding[]>

	/**
	 * Get metadata about the embedding model.
	 * Used for compatibility checking.
	 */
	getModelMetadata(): EmbeddingModelMetadata
}
```

### Usage

```ts
import type { EmbeddingAdapterInterface } from '@mikesaintsg/core'
import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

// Interface from core, implementation from adapters
const embeddingAdapter: EmbeddingAdapterInterface = createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY,
	model: 'text-embedding-3-small',
})

// vectorstore consumes it
const vectorStore = await createVectorStore({
	embedding: embeddingAdapter,
})

// Type safety flows through
const metadata = embeddingAdapter.getModelMetadata()
console.log(`Using ${metadata.provider}/${metadata.model} (${metadata.dimensions}d)`)
```

---

## Adapter Interfaces

Core defines the interface contracts that `@mikesaintsg/adapters` implements. This separation ensures no circular dependencies while providing type safety across packages.

### Interface Ownership

| Package | Owns |
|---------|------|
| `@mikesaintsg/core` | `EmbeddingAdapterInterface`, `ToolFormatAdapterInterface`, bridge interfaces |
| `@mikesaintsg/adapters` | Adapter implementations, adapter-specific options types |
| `@mikesaintsg/inference` | `ProviderAdapterInterface` (depends on `Message`, `GenerationOptions` types) |

### EmbeddingAdapterInterface

```ts
interface EmbeddingAdapterInterface {
	embed(texts: readonly string[], options?: AbortableOptions): Promise<readonly Embedding[]>
	getModelMetadata(): EmbeddingModelMetadata
}
```

Usage:

```ts
import type { EmbeddingAdapterInterface } from '@mikesaintsg/core'
import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'

const adapter: EmbeddingAdapterInterface = createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY,
	model: 'text-embedding-3-small',
})
```

### VectorStorePersistenceAdapterInterface

```ts
interface VectorStorePersistenceAdapterInterface {
	load(): Promise<readonly StoredDocument[]>
	loadMetadata(): Promise<VectorStoreMetadata | undefined>
	save(docs: StoredDocument | readonly StoredDocument[]): Promise<void>
	saveMetadata(metadata: VectorStoreMetadata): Promise<void>
	remove(ids: string | readonly string[]): Promise<void>
	clear(): Promise<void>
	isAvailable(): Promise<boolean>
}
```

Usage:

```ts
import type { VectorStorePersistenceAdapterInterface } from '@mikesaintsg/core'
import { createIndexedDBVectorPersistence } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const vectorStore = await createVectorStore({
	embedding: embeddingAdapter,
	persistence: createIndexedDBVectorPersistence({ databaseName: 'my-vectors' }),
})
```

### ToolFormatAdapterInterface

```ts
interface ToolFormatAdapterInterface {
	formatSchemas(schemas: readonly ToolSchema[]): unknown
	parseToolCalls(response: unknown): readonly ToolCall[]
	formatResult(result: ToolResult): unknown
}
```

Usage:

```ts
import type { ToolFormatAdapterInterface } from '@mikesaintsg/core'
import { createOpenAIToolFormatAdapter } from '@mikesaintsg/adapters'
import { createToolRegistry } from '@mikesaintsg/contextprotocol'

const registry = createToolRegistry({
	formatAdapter: createOpenAIToolFormatAdapter(),
})
```

### Custom Adapters

Implement core interfaces for custom providers:

```ts
import type { EmbeddingAdapterInterface, Embedding, AbortableOptions } from '@mikesaintsg/core'

class CustomEmbeddingAdapter implements EmbeddingAdapterInterface {
	async embed(texts: readonly string[], _options?: AbortableOptions): Promise<readonly Embedding[]> {
		// Call your custom embedding API here
		const results = await Promise.all(texts.map(text => this.#generateEmbedding(text)))
		return results
	}

	getModelMetadata() {
		return { provider: 'custom', model: 'my-model', dimensions: 384 }
	}

	#generateEmbedding(_text: string): Promise<Embedding> {
		// Implementation calls your embedding service
		return Promise.resolve(new Float32Array(384))
	}
}
```

---

## Bridge Interfaces

Core defines interface contracts for cross-package bridges. Implementations are in `@mikesaintsg/adapters`.

### ToolCallBridgeInterface

Connects inference tool calls to contextprotocol execution:

```ts
interface ToolCallBridgeInterface {
	execute(toolCall: ToolCall): Promise<ToolResult>
	executeAll(toolCalls: readonly ToolCall[]): Promise<readonly ToolResult[]>
	hasTool(name: string): boolean
}
```

Usage:

```ts
import type { ToolCallBridgeInterface } from '@mikesaintsg/core'
import { createToolCallBridge } from '@mikesaintsg/adapters'
import { createToolRegistry } from '@mikesaintsg/contextprotocol'

const registry = createToolRegistry()
const bridge: ToolCallBridgeInterface = createToolCallBridge({
	registry,
	timeout: 30000,
	onError: (error, toolCall) => console.error(`Tool ${toolCall.name} failed:`, error),
})

// Use in generation loop
for await (const event of stream) {
	if (event.type === 'tool_call') {
		const result = await bridge.execute(event.toolCall)
		session.addToolResult(result)
	}
}
```

### SessionPersistenceInterface

Connects inference sessions to storage:

```ts
interface SessionPersistenceInterface {
	save(id: string, session: SerializableSession): Promise<void>
	load(id: string): Promise<SerializedSession | undefined>
	delete(id: string): Promise<void>
	list(): Promise<readonly string[]>
	prune(maxAgeMs: number): Promise<number>
}
```

Usage:

```ts
import type { SessionPersistenceInterface } from '@mikesaintsg/core'
import { createIndexedDBSessionPersistence } from '@mikesaintsg/adapters'

const persistence: SessionPersistenceInterface = createIndexedDBSessionPersistence({
	databaseName: 'my-app',
	storeName: 'sessions',
	ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
})
```

### RetrievalToolOptions

Factory options for creating retrieval tools:

```ts
interface RetrievalToolOptions<TMetadata = unknown> {
	readonly vectorStore: VectorStoreMinimal<TMetadata>
	readonly name: string
	readonly description: string
	readonly defaultLimit?: number
	readonly maxLimit?: number
	readonly scoreThreshold?: number
	readonly formatResult?: (result: ScoredResult) => unknown
}
```

Usage:

```ts
import { createRetrievalTool } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const { schema, handler } = createRetrievalTool({
	vectorStore,
	name: 'search_docs',
	description: 'Search documentation for relevant information',
	defaultLimit: 5,
	scoreThreshold: 0.7,
})

registry.register(schema, handler)
```

### FormDirtyGuardOptions

Options for form navigation guards:

```ts
interface FormDirtyGuardOptions<TFormData = unknown, TPage extends string = string> {
	readonly form: FormMinimal<TFormData>
	readonly confirmFn: (message: string) => Promise<boolean> | boolean
	readonly message?: string
	readonly excludePages?: readonly TPage[]
	readonly onlyFromPages?: readonly TPage[]
}
```

Usage:

```ts
import { createFormDirtyGuard } from '@mikesaintsg/adapters'
import { createForm } from '@mikesaintsg/form'
import { createNavigation } from '@mikesaintsg/navigation'

const guard = createFormDirtyGuard({
	form,
	confirmFn: (message) => window.confirm(message),
	message: 'You have unsaved changes. Leave anyway?',
})

const removeGuard = nav.addGuard(guard)
```

---

## Result Pattern

### The Types

```ts
/** Success result */
interface Ok<T> {
	readonly ok: true
	readonly value: T
}

/** Failure result */
interface Err<E> {
	readonly ok: false
	readonly error: E
}

/** Discriminated union for operation results */
type Result<T, E> = Ok<T> | Err<E>
```

### Factory Functions

```ts
import { ok, err, type Result } from '@mikesaintsg/core'

function divide(a: number, b: number): Result<number, 'DIVISION_BY_ZERO'> {
	if (b === 0) return err('DIVISION_BY_ZERO')
	return ok(a / b)
}
```

### Type Guards

```ts
import { isOk, isErr } from '@mikesaintsg/core'

const result = divide(10, 2)
if (isOk(result)) {
	console.log(result.value) // 5
}
```

### Utility Functions

```ts
import { unwrap, map, chain } from '@mikesaintsg/core'

// Unwrap with default
const value = unwrap(result, 0) // 5

// Map success value
const doubled = map(ok(5), x => x * 2) // ok(10)

// Chain results
const parsed = chain(ok('42'), s => {
	const n = parseInt(s, 10)
	return isNaN(n) ? err('PARSE_ERROR') : ok(n)
})
```

---

## Error Utilities

### Base Error Class

```ts
/**
 * Base error class for ecosystem errors.
 * Provides consistent structure across packages.
 */
abstract class EcosystemError extends Error {
	/** Error code for programmatic handling */
	abstract readonly code: string

	/** Original error that caused this one */
	readonly cause?: Error

	constructor(message: string, cause?: Error) {
		super(message)
		this.name = this.constructor.name
		this. cause = cause
	}
}
```

### Type Guard

```ts
/**
 * Check if error is from the ecosystem.
 *
 * @param error - Value to check
 *
 * @example
 * ```ts
 * try {
 *   await someOperation()
 * } catch (error) {
 *   if (isEcosystemError(error)) {
 *     console.log('Code:', error.code)
 *   }
 * }
 * ```
 */
function isEcosystemError(error: unknown): error is EcosystemError
```

### Error Code Type

```ts
/**
 * Extract error code type from an error class.
 *
 * @example
 * ```ts
 * type StorageCode = ErrorCode<StorageError>
 * // 'NOT_FOUND' | 'QUOTA_EXCEEDED' | ...
 * ```
 */
type ErrorCode<T extends EcosystemError> = T['code']
```

### Creating Package Errors

Packages extend `EcosystemError` for error classes, and use `PackageErrorData` for error data interfaces:

```ts
// In @mikesaintsg/storage
import { EcosystemError, type PackageErrorData } from '@mikesaintsg/core'

// Error codes as type union
type StorageErrorCode =
	| 'NOT_FOUND'
	| 'QUOTA_EXCEEDED'
	| 'SERIALIZATION_FAILED'

// Error data interface using PackageErrorData base
interface StorageErrorData extends PackageErrorData<StorageErrorCode> {
	readonly key?: string
}

// Error class extending EcosystemError
class StorageError extends EcosystemError {
	readonly code: StorageErrorCode
	readonly key?: string

	constructor(code: StorageErrorCode, message: string, key?: string, cause?: Error) {
		super(message, cause)
		this.code = code
		this.key = key
	}
}
```

### PackageErrorData Pattern

The `PackageErrorData<TCode>` generic interface provides a consistent base for all package error data:

```ts
import type { PackageErrorData } from '@mikesaintsg/core'

// Define error codes
type MyErrorCode = 'NOT_FOUND' | 'INVALID' | 'TIMEOUT'

// Extend PackageErrorData with package-specific fields
interface MyErrorData extends PackageErrorData<MyErrorCode> {
	readonly resourceId?: string
	readonly retryAfter?: number
}

// The resulting interface includes:
// - code: MyErrorCode (from generic)
// - cause?: Error (from PackageErrorData)
// - resourceId?: string (package-specific)
// - retryAfter?: number (package-specific)
```

---

## Integration Patterns

### RAG Pipeline

Complete retrieval-augmented generation pattern:

```ts
// Types from core
import type { EmbeddingAdapterInterface } from '@mikesaintsg/core'

// Implementations from adapters
import {
	createToolCallBridge,
	createRetrievalTool,
	createIndexedDBSessionPersistence,
	createIndexedDBVectorPersistence,
	createOpenAIEmbeddingAdapter,
	createOpenAIProviderAdapter,
} from '@mikesaintsg/adapters'

import { createEngine } from '@mikesaintsg/inference'
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createToolRegistry } from '@mikesaintsg/contextprotocol'

// 1. Setup embedding (interface from core, implementation from adapters)
const embeddingAdapter: EmbeddingAdapterInterface = createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY,
	model: 'text-embedding-3-small',
})

// 2. Create vector store with persistence from adapters
const vectorStore = await createVectorStore({
	embedding: embeddingAdapter,
	persistence: createIndexedDBVectorPersistence({ databaseName: 'vectors' }),
})

// 3. Create tool registry with retrieval tool (from adapters)
const registry = createToolRegistry()

const { schema: searchSchema, handler: searchHandler } = createRetrievalTool({
	vectorStore,
	name: 'search_knowledge',
	description: 'Search the knowledge base for relevant information',
	defaultLimit: 5,
	scoreThreshold: 0.7,
})

registry.register(searchSchema, searchHandler)

// 4. Create tool call bridge (from adapters)
const bridge = createToolCallBridge({
	registry,
	onError: (error, toolCall) => {
		console.error(`Tool ${toolCall.name} failed:`, error)
	},
})

// 5. Create inference engine with provider from adapters
const engine = createEngine({
	provider: createOpenAIProviderAdapter({
		apiKey: process.env.OPENAI_API_KEY,
		model: 'gpt-4',
	}),
})

// 6. Setup session persistence (from adapters)
const persistence = createIndexedDBSessionPersistence({
	databaseName: 'chat-app',
	storeName: 'sessions',
})

// 7. Create or restore session
const sessionId = 'main-session'
const existingData = await persistence.load(sessionId)

const session = existingData
	? engine.restoreSession(existingData)
	: engine.createSession({
		system: `You are a helpful assistant with access to a knowledge base.
Use the search_knowledge tool to find relevant information before answering.`,
	})

// 8. Auto-save session
session.onMessageAdded(async () => {
	await persistence.save(session)
})

// 9. Chat function
async function chat(userMessage: string): Promise<string> {
	session.addMessage('user', userMessage)

	const stream = await session.generate({
		tools: registry.getSchemas(),
	})

	let response = ''

	for await (const event of stream) {
		switch (event.type) {
			case 'text':
				response += event.text
				break

			case 'tool_call':
				const result = await bridge.execute(event.toolCall)
				session.addToolResult(result)
				break

			case 'done':
				if (event.finishReason === 'tool_calls') {
					// Continue generation after tool results
					const continuation = await session.generate({
						tools: registry.getSchemas(),
					})
					for await (const contEvent of continuation) {
						if (contEvent.type === 'text') {
							response += contEvent.text
						}
					}
				}
				break
		}
	}

	return response
}

// 10. Use it
const answer = await chat('What does the documentation say about error handling?')
console.log(answer)
```

### Form with Navigation Guard

```ts
import { createFormDirtyGuard } from '@mikesaintsg/adapters'
import { createForm } from '@mikesaintsg/form'
import { createNavigation } from '@mikesaintsg/navigation'
import { createStorage } from '@mikesaintsg/storage'

// 1. Create form
const form = createForm<ContactForm>(document.querySelector('form')!)

// 2. Create navigation
type Page = 'list' | 'edit' | 'view'
const nav = createNavigation<Page>({ page: 'list' })

// 3. Create storage for draft persistence
const storage = createStorage<{ draft: Partial<ContactForm> }>('localStorage', {
	prefix: 'contact-form:',
})

// 4. Add dirty guard (from adapters)
const guard = createFormDirtyGuard({
	form,
	confirmFn: (message) => window.confirm(message),
	message: 'You have unsaved changes. Leave this page?',
	excludePages: ['edit'], // Don't prompt when navigating within edit
})

const removeGuard = nav.addGuard(guard)

// 5. Auto-save draft
form.onValueChange(async (values) => {
	await storage.set('draft', values)
})

// 6. Restore draft on edit page
nav.onNavigate(async (page) => {
	if (page === 'edit') {
		const draft = await storage.get('draft')
		if (draft) {
			form.setValues(draft)
		}
	}
})

// 7. Clear draft on successful save
form.onSubmit(async (values) => {
	await saveContact(values)
	await storage.remove('draft')
	form.reset()
	nav.push('list')
})

// 8. Cleanup
function destroy(): void {
	removeGuard()
	form.destroy()
	nav.destroy()
}
```

### Cross-Tab AI Session

```ts
import {
	createToolCallBridge,
	createIndexedDBSessionPersistence,
	createOpenAIProviderAdapter,
} from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'
import { createToolRegistry } from '@mikesaintsg/contextprotocol'
import { createBroadcast } from '@mikesaintsg/broadcast'

interface AIState {
	activeSessionId: string | undefined
	generating: boolean
	generatingTabId: string | undefined
}

// 1. Setup broadcast for cross-tab coordination
const broadcast = createBroadcast<AIState>({
	channel: 'ai-coordinator',
	state: {
		activeSessionId: undefined,
		generating: false,
		generatingTabId: undefined,
	},
})

// 2. Setup persistence (from adapters)
const persistence = createIndexedDBSessionPersistence({
	databaseName: 'ai-app',
	storeName: 'sessions',
})

// 3. Create engine and registry (provider from adapters)
const provider = createOpenAIProviderAdapter({ apiKey: process.env.OPENAI_API_KEY })
const engine = createEngine({ provider })
const registry = createToolRegistry()
const bridge = createToolCallBridge({ registry })

// 4. Coordinate generation across tabs
async function generate(sessionId: string, message: string): Promise<string> {
	// Acquire lock to prevent concurrent generation
	const lock = await broadcast.acquireLock('ai-generation', {
		timeoutMs: 5000,
	})

	if (! lock) {
		throw new Error('Another tab is generating')
	}

	broadcast.setState({
		activeSessionId: sessionId,
		generating: true,
		generatingTabId: broadcast.getTabId(),
	})

	try {
		// Load session
		const existingData = await persistence.load(sessionId)
		const session = existingData
			? engine.restoreSession(existingData)
			: engine.createSession({ system: 'You are helpful.' })

		session.addMessage('user', message)

		const stream = await session.generate({ tools: registry.getSchemas() })
		let response = ''

		for await (const event of stream) {
			if (event.type === 'text') {
				response += event. text
			} else if (event.type === 'tool_call') {
				const result = await bridge.execute(event.toolCall)
				session.addToolResult(result)
			}
		}

		// Save session
		await persistence.save(sessionId, session)

		return response
	} finally {
		broadcast.setState({
			generating: false,
			generatingTabId: undefined,
		})
		lock.release()
	}
}

// 5. Show indicator when another tab is generating
broadcast.onStateChange((state, source) => {
	if (source === 'remote' && state.generating) {
		showGeneratingIndicator()
	} else {
		hideGeneratingIndicator()
	}
})

// 6. Reload session when another tab saves
broadcast.onStateChange(async (state, source) => {
	if (source === 'remote' && state.activeSessionId === currentSessionId) {
		// Another tab updated our session
		await reloadSession(currentSessionId)
	}
})
```

---

## TypeScript Integration

### Type Import Pattern

Core is the source of truth for shared types. Other packages import from core:

```ts
// In your application - import shared types from core
import type {
	// Shared types for context building
	BuiltContext,
	ContextFrame,
	FrameType,
	FramePriority,
	TokenBudgetState,
	ScoredResult,

	// Embedding contract
	EmbeddingAdapterInterface,
	Embedding,

	// Tool types
	ToolSchema,
	ToolCall,
	ToolResult,

	// Utilities
	Unsubscribe,
	Result,
	AbortableOptions,
} from '@mikesaintsg/core'

// Package-specific types are imported from their packages
import type { SessionInterface, StreamHandleInterface } from '@mikesaintsg/inference'
import type { VectorStoreInterface } from '@mikesaintsg/vectorstore'
import type { ToolRegistryInterface } from '@mikesaintsg/contextprotocol'
```

### What Core Exports

Core exports only types that are:
1. Used by 2+ packages
2. Shared adapter interfaces
3. Common utility types

Core does NOT re-export types from other packages.

### Generic Constraints

```ts
// Bridge functions use generics that match package interfaces
function createToolCallBridge<TRegistry extends ToolRegistryInterface>(
	options: ToolCallBridgeOptions<TRegistry>
): ToolCallBridgeInterface

function createRetrievalTool<TMetadata>(
	options: RetrievalToolOptions<TMetadata>
): { schema: ToolSchema; handler:  ToolHandler }

function createFormDirtyGuard<TFormData, TPage extends string>(
	options: FormDirtyGuardOptions<TFormData, TPage>
): NavigationGuard<TPage>
```

### Strict Type Inference

```ts
// Types flow through without manual annotation
const bridge = createToolCallBridge({
	registry, // ToolRegistryInterface inferred
	onError: (error, toolCall) => {
		// error:  unknown
		// toolCall: ToolCall (inferred)
	},
})

const { schema, handler } = createRetrievalTool({
	vectorStore, // VectorStoreInterface<MyMetadata> inferred
	name:  'search',
	description: 'Search documents',
	formatResult: (result) => {
		// result: ScoredResult<MyMetadata> (inferred)
		return result. document. content
	},
})
```

---

## API Reference

### Factory Functions

#### createToolCallBridge(options): ToolCallBridgeInterface

Creates a bridge between inference tool calls and contextprotocol execution.

**Parameters:**
- `options. registry` — Tool registry for execution (required)
- `options.onError` — Error callback (optional)
- `options.timeout` — Execution timeout in ms (optional)
- `options.onBeforeExecute` — Pre-execution callback (optional)
- `options.onAfterExecute` — Post-execution callback (optional)

**Returns:** `ToolCallBridgeInterface`

---

#### createRetrievalTool(options): { schema, handler }

Creates a standard retrieval tool for vectorstore. 

**Parameters:**
- `options.vectorStore` — Vector store to search (required)
- `options.name` — Tool name (required)
- `options.description` — Tool description (required)
- `options.defaultLimit` — Default result count (optional, default: 5)
- `options.maxLimit` — Maximum result count (optional, default: 20)
- `options.scoreThreshold` — Minimum similarity score (optional)
- `options.formatResult` — Result formatter (optional)
- `options.extendParameters` — Additional parameters (optional)
- `options.buildFilter` — Filter builder function (optional)

**Returns:** `{ schema:  ToolSchema; handler: ToolHandler }`

---

#### createFormDirtyGuard(options): NavigationGuard

Creates a navigation guard that prompts on dirty form. 

**Parameters:**
- `options.form` — Form interface to check (required)
- `options.confirmFn` — Confirmation function (required)
- `options.message` — Confirmation message (optional)
- `options.excludePages` — Pages to skip guard (optional)
- `options.onlyFromPages` — Only check from these pages (optional)

**Returns:** `NavigationGuard<TPage>`

---

#### createSessionPersistence(options): SessionPersistenceInterface

Creates session persistence adapter for indexeddb. 

**Parameters:**
- `options.database` — IndexedDB database instance (required)
- `options.storeName` — Store name for sessions (required)
- `options.autoprune` — Auto-prune age in ms (optional)
- `options.onSaveError` — Save error callback (optional)

**Returns:** `SessionPersistenceInterface`

---

### Result Functions

#### ok(value): Ok\<T\>

Create success result.

#### err(error): Err\<E\>

Create failure result.

#### isOk(result): result is Ok\<T\>

Check if result is success.

#### isErr(result): result is Err\<E\>

Check if result is failure. 

#### unwrap(result, defaultValue): T

Get value or default.

#### unwrapOrThrow(result): T

Get value or throw error. 

#### map(result, fn): Result\<U, E\>

Transform success value.

#### mapErr(result, fn): Result\<T, F\>

Transform error value.

#### chain(result, fn): Result\<U, E\>

Chain results (flatMap).

---

### Interfaces

#### ToolCallBridgeInterface

| Method | Returns | Description |
|--------|---------|-------------|
| `execute(toolCall)` | `Promise<ToolResult>` | Execute single tool call |
| `executeAll(toolCalls)` | `Promise<readonly ToolResult[]>` | Execute multiple in parallel |
| `hasTool(name)` | `boolean` | Check if tool exists |

#### SessionPersistenceInterface

| Method | Returns | Description |
|--------|---------|-------------|
| `save(id, session)` | `Promise<void>` | Save session |
| `load(id)` | `Promise<SerializedSession \| undefined>` | Load session |
| `delete(id)` | `Promise<void>` | Delete session |
| `list()` | `Promise<readonly string[]>` | List session IDs |
| `prune(maxAgeMs)` | `Promise<number>` | Delete old sessions |

---

### Types

```ts
/** Cleanup function for subscriptions */
type Unsubscribe = () => void

/** Cleanup function for resources */
type DestroyFn = () => void

/** Origin of state change */
type ChangeSource = 'local' | 'remote'

/** Cancellable operation options */
interface AbortableOptions {
	readonly signal?:  AbortSignal
}

/** Resource with cleanup */
interface Destroyable {
	destroy(): void
}

/** Embedding vector */
type Embedding = Float32Array

/** Embedding model info */
interface EmbeddingModelMetadata {
	readonly provider: string
	readonly model: string
	readonly dimensions: number
}

/** Embedding generation contract */
interface EmbeddingAdapterInterface {
	embed(texts: readonly string[], options?: AbortableOptions): Promise<readonly Embedding[]>
	getModelMetadata(): EmbeddingModelMetadata
}

/** Success result */
interface Ok<T> {
	readonly ok: true
	readonly value: T
}

/** Failure result */
interface Err<E> {
	readonly ok: false
	readonly error: E
}

/** Result union */
type Result<T, E> = Ok<T> | Err<E>
```

---

### Error Types

```ts
/**
 * Generic error data interface for package-specific errors.
 * Packages extend this to define their error structure.
 */
interface PackageErrorData<TCode extends string> {
	readonly code: TCode
	readonly cause?: Error
}

/** Base ecosystem error */
abstract class EcosystemError extends Error {
	abstract readonly code: string
	readonly cause?: Error
}

/** Type guard for ecosystem errors */
function isEcosystemError(error: unknown): error is EcosystemError

/** Extract error code type */
type ErrorCode<T extends EcosystemError> = T['code']
```

---

### Storage Types

```ts
/** Storage information (quota and usage) - shared by indexeddb and filesystem */
interface StorageInfo {
	readonly usage: number
	readonly quota: number
	readonly available: number
	readonly percentUsed: number
}
```

---

## License

MIT
