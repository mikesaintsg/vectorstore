# @mikesaintsg/adapters — Technical Architecture Guide

> **Zero-dependency LLM provider and embedding adapters for the @mikesaintsg ecosystem.**

---

## Implementation Status

| Component                   | Status    | Notes                                 |
|-----------------------------|-----------|---------------------------------------|
| OpenAI Provider Adapter     | ⏳ Pending | Chat completions, streaming, tools    |
| Anthropic Provider Adapter  | ⏳ Pending | Messages API, streaming, tools        |
| Ollama Provider Adapter     | ⏳ Pending | Local development/testing, streaming  |
| OpenAI Embedding Adapter    | ⏳ Pending | text-embedding-3-small/large, ada-002 |
| Voyage Embedding Adapter    | ⏳ Pending | Recommended for Anthropic users       |
| Ollama Embedding Adapter    | ⏳ Pending | Local development/testing             |
| Batched Embedding Wrapper   | ⏳ Pending | Wraps base adapters                   |
| Cached Embedding Wrapper    | ⏳ Pending | Wraps base adapters                   |
| Retryable Adapter Wrappers  | ⏳ Pending | withRetry() for providers/embeddings  |
| Rate Limiter                | ⏳ Pending | Per-adapter, optional shared          |
| Tool Format Adapters        | ⏳ Pending | OpenAI/Anthropic/Ollama tool formats  |
| Session Persistence         | ⏳ Pending | IndexedDB session storage             |
| VectorStore Persistence     | ⏳ Pending | IndexedDB, OPFS, HTTP                 |
| SSE Parser                  | ⏳ Pending | Shared across providers               |

---

## Table of Contents

1. [Package Purpose & Philosophy](#1-package-purpose--philosophy)
2. [Adapter Classification](#2-adapter-classification)
3. [Package Organization](#3-package-organization)
4. [Provider Adapters](#4-provider-adapters)
5. [Embedding Adapters](#5-embedding-adapters)
6. [Tool Format Adapters](#6-tool-format-adapters)
7. [Persistence Adapters](#7-persistence-adapters)
8. [Bridge Functions](#8-bridge-functions)
9. [Rate Limiting](#9-rate-limiting)
10. [SSE Parsing](#10-sse-parsing)
11. [Model Multipliers](#11-model-multipliers)
12. [Error Handling](#12-error-handling)
13. [Implementation Patterns](#13-implementation-patterns)
14. [Integration Examples](#14-integration-examples)
15. [Type Reference](#15-type-reference)

---

## 1. Package Purpose & Philosophy

### Problem Statement

Building LLM applications requires integrating with multiple providers and services:

- **Provider diversity** — OpenAI, Anthropic, Google, Cohere have different APIs
- **Embedding providers** — Different vector dimensions, rate limits, pricing
- **Persistence needs** — Sessions, vectors, and caches need storage
- **Format translation** — Tool calls differ between providers

Without centralization, every package reimplements these integrations.

### What This Package Provides

`@mikesaintsg/adapters` centralizes all third-party integrations:

| Category             | Adapters                                     |
|----------------------|----------------------------------------------|
| **LLM Providers**    | OpenAI, Anthropic, Ollama (Chat Completions) |
| **Embeddings**       | OpenAI, Voyage, Ollama                       |
| **Wrapper Adapters** | Batched, Cached, Retryable                   |
| **Rate Limiting**    | Per-adapter with optional shared limiter     |
| **Tool Formats**     | OpenAI, Anthropic, Ollama tool call formats  |
| **Persistence**      | IndexedDB, OPFS, HTTP for sessions/vectors   |
| **Bridges**          | Tool call bridge, retrieval tool factory     |
| **SSE Parsing**      | Shared parser for streaming responses        |

### Design Principles

1. **Adapters, not magic strings** — Explicit adapter instantiation, not `provider: 'openai'`
2. **Interface-first** — All adapters implement interfaces from `@mikesaintsg/core`
3. **Zero dependencies** — Built on native `fetch`, no axios/node-fetch
4. **Lazy loading** — Import only what you need
5. **Consistent errors** — All adapters use ecosystem error patterns
6. **Composition over inheritance** — Wrapper adapters (batched, cached, retryable) wrap base adapters

### Package Boundaries

```
adapters owns:
├── LLM provider implementations (OpenAI, Anthropic, Ollama)
├── Embedding provider implementations (OpenAI, Voyage, Ollama)
├── Embedding wrapper adapters (batched, cached, retryable)
├── Tool format translators (per provider)
├── SSE parsing (shared helpers/sse.ts)
├── Rate limiting utilities
├── Persistence adapters (IndexedDB, OPFS, HTTP)
├── Cross-package bridges (tool-call, retrieval)
└── Provider-specific error mapping

adapters does NOT own:
├── Interface definitions (owned by core)
├── Token counting logic (owned by inference)
├── Business logic (owned by inference, vectorstore, contextprotocol)
├── Shared type definitions (owned by core)
└── Native platform adapters (stay in domain packages)
```

### Ownership Clarification

| Component                       | Owner     | Notes                    |
|---------------------------------|-----------|--------------------------|
| `EmbeddingAdapterInterface`     | core      | Interface definition     |
| `createOpenAIEmbeddingAdapter`  | adapters  | Implementation           |
| `ProviderAdapterInterface`      | inference | Depends on Message types |
| `createOpenAIProviderAdapter`   | adapters  | Implementation           |
| `ToolFormatAdapterInterface`    | core      | Interface definition     |
| `createOpenAIToolFormatAdapter` | adapters  | Implementation           |
| Token counting                  | inference | `Engine.countTokens()`   |
| Model multipliers               | adapters  | Helper constants         |
| SSE parsing                     | adapters  | Shared across providers  |
| Rate limiting                   | adapters  | Per-adapter + shared     |
| Retry logic                     | adapters  | Wrapper adapters         |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Your Application                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│   │  inference  │  │ vectorstore │  │contextproto │  │contextbuildr│    │
│   │   Engine    │  │ VectorStore │  │  Registry   │  │   Builder   │    │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────┘    │
│          │                │                │                             │
├──────────┼────────────────┼────────────────┼─────────────────────────────┤
│          │     @mikesaintsg/adapters       │                             │
│          ▼                ▼                ▼                             │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    Provider Adapters                             │   │
│   │   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │   │
│   │   │ OpenAI Provider │ │Anthropic Provider│ │ Ollama Provider │   │   │
│   │   └─────────────────┘ └─────────────────┘ └─────────────────┘   │   │
│   ├─────────────────────────────────────────────────────────────────┤   │
│   │                   Embedding Adapters                             │   │
│   │   ┌──────────┐  ┌──────────┐  ┌──────────┐                      │   │
│   │   │  OpenAI  │  │  Voyage  │  │  Ollama  │                      │   │
│   │   └──────────┘  └──────────┘  └──────────┘                      │   │
│   ├─────────────────────────────────────────────────────────────────┤   │
│   │                   Wrapper Adapters                               │   │
│   │   ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐   │   │
│   │   │ Batched  │  │  Cached  │  │ Retryable │  │ Rate Limited │   │   │
│   │   └──────────┘  └──────────┘  └───────────┘  └──────────────┘   │   │
│   ├─────────────────────────────────────────────────────────────────┤   │
│   │                  Persistence Adapters                            │   │
│   │   ┌───────────┐   ┌──────────┐   ┌──────────┐                   │   │
│   │   │ IndexedDB │   │   OPFS   │   │   HTTP   │                   │   │
│   │   └───────────┘   └──────────┘   └──────────┘                   │   │
│   ├─────────────────────────────────────────────────────────────────┤   │
│   │                      Shared Helpers                              │   │
│   │   ┌────────────────┐   ┌───────────────────┐                    │   │
│   │   │   SSE Parser   │   │   Token Counter   │                    │   │
│   │   └────────────────┘   └───────────────────┘                    │   │
│   ├─────────────────────────────────────────────────────────────────┤   │
│   │                      Bridge Functions                            │   │
│   │   ┌────────────────┐   ┌───────────────────┐                    │   │
│   │   │ToolCall Bridge │   │ Retrieval Tool    │                    │   │
│   │   └────────────────┘   └───────────────────┘                    │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│      External APIs (OpenAI, Anthropic, Voyage) + Local (Ollama)         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Adapter Classification

### Decision Criteria

An adapter belongs in `@mikesaintsg/adapters` if ANY of these are true:

| Criterion                | Example                                |
|--------------------------|----------------------------------------|
| **Third-party API**      | OpenAI, Anthropic, Cohere APIs         |
| **Cross-package bridge** | IndexedDB adapter for vectorstore      |
| **External service**     | HTTP-based persistence                 |
| **Shared dependency**    | Uses interfaces from multiple packages |

An adapter stays in its domain package if ALL of these are true:

| Criterion               | Example                     |
|-------------------------|-----------------------------|
| **Native platform API** | OPFS (native to filesystem) |
| **In-memory only**      | Testing/mock adapters       |
| **Package-internal**    | No external dependencies    |

### Adapter Inventory

#### Moves to @mikesaintsg/adapters

| Adapter                             | From Package    | Reason                |
|-------------------------------------|-----------------|-----------------------|
| `createOpenAIProviderAdapter`       | inference       | Third-party API       |
| `createAnthropicProviderAdapter`    | inference       | Third-party API       |
| `createOllamaProviderAdapter`       | inference       | Local API for testing |
| `createOpenAIEmbeddingAdapter`      | inference       | Third-party API       |
| `createVoyageEmbeddingAdapter`      | inference       | Third-party API       |
| `createOllamaEmbeddingAdapter`      | inference       | Local API for testing |
| `createBatchedEmbeddingAdapter`     | inference       | Wrapper adapter       |
| `createCachedEmbeddingAdapter`      | inference       | Wrapper adapter       |
| `createRetryableProviderAdapter`    | inference       | Wrapper adapter       |
| `createRetryableEmbeddingAdapter`   | inference       | Wrapper adapter       |
| `createRateLimiter`                 | inference       | Cross-adapter utility |
| `createOpenAIToolFormatAdapter`     | contextprotocol | Third-party format    |
| `createAnthropicToolFormatAdapter`  | contextprotocol | Third-party format    |
| `createOllamaToolFormatAdapter`     | contextprotocol | Local API format      |
| `createIndexedDBSessionPersistence` | inference       | Cross-package         |
| `createIndexedDBVectorPersistence`  | vectorstore     | Cross-package         |
| `createOPFSVectorPersistence`       | vectorstore     | Cross-package         |
| `createHTTPVectorPersistence`       | vectorstore     | External service      |

#### Stays in Domain Packages

| Adapter                        | Package     | Reason              |
|--------------------------------|-------------|---------------------|
| `createInMemoryPersistence`    | vectorstore | In-memory only      |
| `createOPFSStorageAdapter`     | filesystem  | Native platform API |
| `createFallbackStorageAdapter` | filesystem  | In-memory fallback  |

---

## 3. Package Organization

### Directory Structure

```
@mikesaintsg/adapters/
├── src/
│   ├── index.ts                    # Barrel exports
│   ├── types.ts                    # Re-exports from core + local types
│   ├── constants.ts                # API endpoints, defaults
│   ├── errors.ts                   # Adapter-specific errors
│   ├── helpers.ts                  # Shared utilities
│   │
│   ├── helpers/
│   │   ├── index.ts                # Helpers barrel
│   │   ├── sse.ts                  # SSE parser (shared across providers)
│   │   ├── token-counter.ts        # Model-specific token counting
│   │   └── rate-limiter.ts         # Rate limiting utilities
│   │
│   ├── providers/
│   │   ├── index.ts                # Provider barrel
│   │   ├── openai.ts               # OpenAI provider adapter
│   │   ├── anthropic.ts            # Anthropic provider adapter
│   │   └── ollama.ts               # Ollama provider adapter
│   │
│   ├── embeddings/
│   │   ├── index.ts                # Embeddings barrel
│   │   ├── openai.ts               # OpenAI embedding adapter
│   │   ├── voyage.ts               # Voyage embedding adapter
│   │   ├── ollama.ts               # Ollama embedding adapter
│   │   ├── batched.ts              # Batched embedding wrapper
│   │   ├── cached.ts               # Cached embedding wrapper
│   │   └── retryable.ts            # Retryable embedding wrapper
│   │
│   ├── tools/
│   │   ├── index.ts                # Tools barrel
│   │   ├── openai.ts               # OpenAI tool format
│   │   ├── anthropic.ts            # Anthropic tool format
│   │   └── ollama.ts               # Ollama tool format
│   │
│   ├── persistence/
│   │   ├── sessions/
│   │   │   ├── indexeddb.ts        # IndexedDB session persistence
│   │   │   └── index.ts            # Sessions barrel
│   │   ├── vectors/
│   │   │   ├── indexeddb.ts        # IndexedDB vector persistence
│   │   │   ├── opfs.ts             # OPFS vector persistence
│   │   │   ├── http.ts             # HTTP vector persistence
│   │   │   └── index.ts            # Vectors barrel
│   │   └── index.ts                # Persistence barrel
│   │
│   └── bridges/
│       ├── tool-call.ts            # Inference ↔ ContextProtocol bridge
│       ├── retrieval.ts            # VectorStore ↔ ContextProtocol bridge
│       └── index.ts                # Bridges barrel
│
├── tests/                          # Mirrors src/ structure
│   ├── core/
│   │   └── helpers/
│   ├── providers/
│   │   ├── openai/
│   │   ├── anthropic/
│   │   └── ollama/
│   ├── embeddings/
│   │   ├── openai/
│   │   ├── voyage/
│   │   ├── ollama/
│   │   └── wrappers/
│   ├── tools/
│   ├── persistence/
│   │   ├── sessions/
│   │   └── vectors/
│   └── bridges/
│
├── package.json
├── tsconfig.json
└── README.md
```

### Import Patterns

```typescript
// Import specific adapter
import { createOpenAIProviderAdapter } from '@mikesaintsg/adapters/providers/openai'

// Import all providers
import { 
  createOpenAIProviderAdapter,
  createAnthropicProviderAdapter 
} from '@mikesaintsg/adapters/providers'

// Import from main barrel
import { 
  createOpenAIProviderAdapter,
  createOpenAIEmbeddingAdapter 
} from '@mikesaintsg/adapters'
```

---

## 4. Provider Adapters

### OpenAI Provider

```typescript
import { createOpenAIProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const provider = createOpenAIProviderAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
  organization: 'org-xxx', // Optional
  baseURL: 'https://api.openai.com/v1', // Optional
  defaultOptions: {
    temperature: 0.7,
    maxTokens: 4096,
  },
})

const engine = createEngine({ provider })
```

### Anthropic Provider

```typescript
import { createAnthropicProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const provider = createAnthropicProviderAdapter({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  baseURL: 'https://api.anthropic.com', // Optional
  defaultOptions: {
    temperature: 0.7,
    maxTokens: 4096,
  },
})

const engine = createEngine({ provider })
```

### Ollama Provider (Local Development)

Ollama is the recommended way to test adapters during development without incurring API costs:

```typescript
import { createOllamaProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const provider = createOllamaProviderAdapter({
  model: 'llama3', // or 'mistral', 'codellama', etc.
  baseURL: 'http://localhost:11434', // Optional, default
  defaultOptions: {
    temperature: 0.7,
  },
  keepAlive: true, // Keep model loaded in memory
})

const engine = createEngine({ provider })
```

**Setup Ollama:**

```powershell
# Install Ollama (https://ollama.ai/)
# Pull a model
ollama pull llama3

# Verify it's running
curl http://localhost:11434/api/tags
```

### Provider Interface

All providers implement `ProviderAdapterInterface` from inference:

```typescript
import type { ProviderAdapterInterface } from '@mikesaintsg/inference'

interface ProviderAdapterInterface {
  getId(): string
  generate(
    messages: readonly Message[],
    options: GenerationOptions
  ): StreamHandleInterface
  supportsTools(): boolean
  supportsStreaming(): boolean
  getCapabilities(): ProviderCapabilities
}
```

---

## 5. Embedding Adapters

### OpenAI Embeddings

```typescript
import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'

const embedder = createOpenAIEmbeddingAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small', // or 'text-embedding-3-large'
  dimensions: 1536, // Optional dimension reduction
})

const embedding = await embedder.embed('Hello, world!')
console.log(embedding.vector.length) // 1536
```

### Voyage Embeddings

Voyage AI is the recommended embedding provider for Anthropic users (same company relationship):

```typescript
import { createVoyageEmbeddingAdapter } from '@mikesaintsg/adapters'

const embedder = createVoyageEmbeddingAdapter({
  apiKey: process.env.VOYAGE_API_KEY,
  model: 'voyage-3', // or 'voyage-code-3', 'voyage-3-lite'
  inputType: 'document', // or 'query' for search queries
})

const embedding = await embedder.embed('function hello() {}')
```

### Ollama Embeddings (Local Development)

For local development/testing without API costs:

```typescript
import { createOllamaEmbeddingAdapter } from '@mikesaintsg/adapters'

const embedder = createOllamaEmbeddingAdapter({
  model: 'nomic-embed-text', // or 'mxbai-embed-large'
  baseURL: 'http://localhost:11434', // Optional, default
})

const embedding = await embedder.embed('Hello, world!')
```

**Supported Ollama embedding models:**
- `nomic-embed-text` — General purpose, 768 dimensions
- `mxbai-embed-large` — High quality, 1024 dimensions
- `all-minilm` — Lightweight, 384 dimensions
- `snowflake-arctic-embed` — High performance, 1024 dimensions

### Wrapper Adapters (Composition Pattern)

Batched and cached adapters wrap base adapters, allowing mixing and matching features:

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Application                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               CachedEmbeddingAdapter                        │
│   (Checks cache before calling wrapped adapter)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              BatchedEmbeddingAdapter                         │
│   (Batches requests for efficiency)                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│             RetryableEmbeddingAdapter                        │
│   (Retries on transient failures)                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               OpenAIEmbeddingAdapter                         │
│   (Actual API calls)                                        │
└─────────────────────────────────────────────────────────────┘
```

### Batched Embeddings

Wrap any embedding adapter with batching:

```typescript
import { 
  createOpenAIEmbeddingAdapter,
  createBatchedEmbeddingAdapter 
} from '@mikesaintsg/adapters'

const baseEmbedder = createOpenAIEmbeddingAdapter({ apiKey })

const batchedEmbedder = createBatchedEmbeddingAdapter({
  adapter: baseEmbedder,
  batchSize: 100,
  delayMs: 50,
  deduplicate: true, // Skip identical texts
})

// Automatically batches multiple embed calls
const embeddings = await Promise.all(
  texts.map(text => batchedEmbedder.embed(text))
)
```

### Cached Embeddings

Wrap any embedding adapter with caching:

```typescript
import {
  createOpenAIEmbeddingAdapter,
  createCachedEmbeddingAdapter
} from '@mikesaintsg/adapters'

const baseEmbedder = createOpenAIEmbeddingAdapter({ apiKey })

const cachedEmbedder = createCachedEmbeddingAdapter({
  adapter: baseEmbedder,
  cache: new Map(), // Or IndexedDB cache
  ttlMs: 3600_000, // 1 hour
})
```

### Retryable Embeddings

Wrap any embedding adapter with retry logic:

```typescript
import {
  createOpenAIEmbeddingAdapter,
  createRetryableEmbeddingAdapter
} from '@mikesaintsg/adapters'

const baseEmbedder = createOpenAIEmbeddingAdapter({ apiKey })

const retryableEmbedder = createRetryableEmbeddingAdapter({
  adapter: baseEmbedder,
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryableCodes: ['RATE_LIMIT_ERROR', 'NETWORK_ERROR', 'SERVICE_ERROR'],
    onRetry: (error, attempt, delayMs) => {
      console.log(`Retry attempt ${attempt} after ${delayMs}ms`)
    },
  },
})
```

### Composing Wrappers

Combine multiple wrappers for production use:

```typescript
import {
  createOpenAIEmbeddingAdapter,
  createCachedEmbeddingAdapter,
  createBatchedEmbeddingAdapter,
  createRetryableEmbeddingAdapter,
} from '@mikesaintsg/adapters'

// Build from inside out: base -> retry -> batch -> cache
const base = createOpenAIEmbeddingAdapter({ apiKey })
const retryable = createRetryableEmbeddingAdapter({ adapter: base, retry: {} })
const batched = createBatchedEmbeddingAdapter({ adapter: retryable, batchSize: 100 })
const cached = createCachedEmbeddingAdapter({ adapter: batched, cache: new Map() })

// Use the fully wrapped adapter
const embeddings = await cached.embedBatch(texts)
```

### Embedding Interface

All embedders implement `EmbeddingAdapterInterface` from core:

```typescript
interface EmbeddingAdapterInterface {
  embed(text: string): Promise<Embedding>
  embedBatch(texts: readonly string[]): Promise<readonly Embedding[]>
  getModel(): EmbeddingModelMetadata
}
```

---

## 6. Tool Format Adapters

### OpenAI Tool Format

```typescript
import { createOpenAIToolFormatAdapter } from '@mikesaintsg/adapters'
import { createToolRegistry } from '@mikesaintsg/contextprotocol'

const registry = createToolRegistry()
const formatter = createOpenAIToolFormatAdapter({
  toolChoice: 'auto', // 'none' | 'required' | { name: string }
})

// Convert schemas to OpenAI format
const openAITools = formatter.formatSchemas(registry.getSchemas())

// Parse tool calls from response
const toolCalls = formatter.parseToolCalls(openAIResponse)

// Format result for injection
const formattedResult = formatter.formatResult(toolResult)
```

### Anthropic Tool Format

```typescript
import { createAnthropicToolFormatAdapter } from '@mikesaintsg/adapters'

const formatter = createAnthropicToolFormatAdapter({
  toolChoice: 'auto', // 'any' | { name: string }
})

// Same interface as OpenAI formatter
const anthropicTools = formatter.formatSchemas(registry.getSchemas())
```

### Tool Format Interface

```typescript
interface ToolFormatAdapterInterface {
  formatSchemas(schemas: readonly ToolSchema[]): unknown
  parseToolCalls(response: unknown): readonly ToolCall[]
  formatResult(result: ToolResult): unknown
}
```

---

## 7. Persistence Adapters

### Session Persistence (IndexedDB)

```typescript
import { createIndexedDBSessionPersistence } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const persistence = createIndexedDBSessionPersistence({
  databaseName: 'my-app-sessions',
  storeName: 'sessions',
  ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
})

const engine = createEngine({ 
  provider,
  sessionPersistence: persistence,
})

// Sessions automatically persist across page refreshes
```

### VectorStore Persistence (IndexedDB)

```typescript
import { createIndexedDBVectorPersistence } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const persistence = createIndexedDBVectorPersistence({
  databaseName: 'my-app-vectors',
  documentsStore: 'documents',
  metadataStore: 'metadata',
})

const vectorStore = await createVectorStore({
  embedder,
  persistence,
})
```

### VectorStore Persistence (HTTP)

```typescript
import { createHTTPVectorPersistence } from '@mikesaintsg/adapters'

const persistence = createHTTPVectorPersistence({
  baseURL: 'https://api.example.com/vectors',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
})
```

### Persistence Interface

```typescript
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

---

## 8. Bridge Functions

### Tool Call Bridge

Connects inference tool calls to contextprotocol execution:

```typescript
import { createToolCallBridge } from '@mikesaintsg/adapters'
import { createToolRegistry } from '@mikesaintsg/contextprotocol'
import { createEngine } from '@mikesaintsg/inference'

const registry = createToolRegistry()
registry.register(weatherTool, async (params) => {
  return await fetchWeather(params.city)
})

const bridge = createToolCallBridge({
  registry,
  timeout: 30_000,
  onError: (error, toolCall) => {
    console.error(`Tool ${toolCall.name} failed:`, error)
  },
})

// In generation loop
for await (const event of stream) {
  if (event.type === 'tool_call') {
    const result = await bridge.execute(event.toolCall)
    session.addToolResult(result)
  }
}
```

### Retrieval Tool Factory

Creates a tool that queries a vector store:

```typescript
import { createRetrievalTool } from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const vectorStore = await createVectorStore({ embedder })

const retrievalTool = createRetrievalTool({
  vectorStore,
  name: 'search_knowledge',
  description: 'Search the knowledge base for relevant information',
  topK: 5,
  minScore: 0.7,
})

registry.register(retrievalTool.schema, retrievalTool.execute)
```

---

## 9. Rate Limiting

### Strategy: Per-Adapter with Optional Shared Limiter

Rate limiting is implemented per-adapter with optional coordination through a shared rate limiter:

```typescript
import {
  createOpenAIProviderAdapter,
  createRateLimiter,
} from '@mikesaintsg/adapters'

// Create a shared rate limiter for cross-adapter coordination
const sharedLimiter = createRateLimiter({
  requestsPerMinute: 60,
  maxConcurrent: 10,
})

// Use shared limiter with provider
const provider = createOpenAIProviderAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
  rateLimiter: {
    sharedLimiter,
    useShared: true,
  },
})

// Or use per-adapter rate limiting (default)
const provider2 = createOpenAIProviderAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
  rateLimiter: {
    requestsPerMinute: 100,
    maxConcurrent: 20,
  },
})
```

### Dynamic Rate Limit Adjustment

Rate limiters can adjust based on `Retry-After` headers:

```typescript
const limiter = createRateLimiter({ requestsPerMinute: 60 })

// After receiving a rate limit response with Retry-After header
limiter.setLimit(30) // Reduce to 30 requests/minute

// Check current state
const state = limiter.getState()
console.log(`Active: ${state.activeRequests}/${state.maxConcurrent}`)
console.log(`Window: ${state.requestsInWindow}/${state.requestsPerMinute}`)
```

### Rate Limiter Interface

```typescript
interface RateLimiterInterface {
  acquire(): Promise<void>
  release(): void
  getState(): RateLimiterState
  setLimit(requestsPerMinute: number): void
}

interface RateLimiterState {
  readonly activeRequests: number
  readonly maxConcurrent: number
  readonly requestsInWindow: number
  readonly requestsPerMinute: number
  readonly windowResetIn: number
}
```

---

## 10. SSE Parsing

### Shared SSE Parser

SSE parsing is shared across OpenAI, Anthropic, and Ollama adapters via `helpers/sse.ts`:

```typescript
import { createSSEParser, type SSEEvent } from '@mikesaintsg/adapters'

const parser = createSSEParser({
  onEvent: (event: SSEEvent) => {
    console.log('Event:', event.event)
    console.log('Data:', event.data)
  },
  onError: (error) => {
    console.error('Parse error:', error)
  },
  onEnd: () => {
    console.log('Stream ended')
  },
})

// Feed chunks from fetch response
const response = await fetch(url, { method: 'POST', body })
const reader = response.body?.getReader()
const decoder = new TextDecoder()

while (reader) {
  const { done, value } = await reader.read()
  if (done) break
  parser.feed(decoder.decode(value))
}

parser.end()
```

### SSE Event Structure

```typescript
interface SSEEvent {
  readonly event?: string  // Event type (e.g., 'message', 'error')
  readonly data: string    // Event data
  readonly id?: string     // Event ID
  readonly retry?: number  // Reconnect delay
}
```

### Provider-Specific Parsing

Each provider builds on the shared SSE parser:

```typescript
// OpenAI uses 'data:' prefix with JSON
// data: {"choices": [{"delta": {"content": "Hello"}}]}

// Anthropic uses event types with JSON
// event: content_block_delta
// data: {"type": "content_block_delta", "delta": {"text": "Hello"}}

// Ollama uses newline-delimited JSON (NDJSON)
// {"message": {"content": "Hello"}, "done": false}
```

---

## 11. Model Multipliers

### Ownership Note

**Token counting logic is owned by `@mikesaintsg/inference`** via `Engine.countTokens()`. This package provides **model-specific multipliers** as constants that can be used to improve estimation accuracy.

### Model-Specific Multipliers

Adapters exports model-specific character-to-token multipliers:

```typescript
import { DEFAULT_MODEL_MULTIPLIERS } from '@mikesaintsg/adapters'

// Use with inference's token counter
import { createEngine } from '@mikesaintsg/inference'

const engine = createEngine({
  provider,
  tokenCounter: {
    modelMultipliers: DEFAULT_MODEL_MULTIPLIERS,
  },
})

// Engine uses multipliers for more accurate counting
const tokens = engine.countTokens('Hello, world!', 'gpt-4o')
```

### Default Model Multipliers

| Model                 | Chars/Token | Notes                   |
|-----------------------|-------------|-------------------------|
| `gpt-4`               | 4           | OpenAI GPT-4            |
| `gpt-4o`              | 4           | OpenAI GPT-4o           |
| `gpt-3.5-turbo`       | 4           | OpenAI GPT-3.5          |
| `claude-3-5-sonnet-*` | 3.5         | Anthropic Claude 3.5    |
| `claude-3-opus-*`     | 3.5         | Anthropic Claude 3 Opus |
| `llama2`              | 4           | Ollama Llama 2          |
| `llama3`              | 4           | Ollama Llama 3          |
| `mistral`             | 4           | Ollama Mistral          |

---

## 12. Error Handling

### Error Codes

| Code                    | Description            | Common Cause             | Recovery                                  |
|-------------------------|------------------------|--------------------------|-------------------------------------------|
| `AUTHENTICATION_ERROR`  | Invalid API key        | Wrong or expired API key | Verify API key is correct and not expired |
| `RATE_LIMIT_ERROR`      | Rate limit exceeded    | Too many requests        | Wait and retry with exponential backoff   |
| `QUOTA_EXCEEDED_ERROR`  | Usage quota exceeded   | Monthly quota reached    | Check billing, increase quota             |
| `NETWORK_ERROR`         | Network failure        | Connection issues        | Check network, retry                      |
| `TIMEOUT_ERROR`         | Request timeout        | Slow response            | Increase timeout, retry                   |
| `INVALID_REQUEST_ERROR` | Malformed request      | Invalid parameters       | Check request format                      |
| `MODEL_NOT_FOUND_ERROR` | Unknown model          | Model doesn't exist      | Use valid model name                      |
| `CONTEXT_LENGTH_ERROR`  | Context too long       | Token limit exceeded     | Truncate context                          |
| `CONTENT_FILTER_ERROR`  | Content blocked        | Content policy violation | Modify content                            |
| `SERVICE_ERROR`         | Provider service error | Server-side issue        | Retry later                               |
| `UNKNOWN_ERROR`         | Unknown error          | Unexpected condition     | Check logs, report bug                    |

### Adapter Error Types

```typescript
import { AdapterError, isAdapterError } from '@mikesaintsg/adapters'

type AdapterErrorCode =
  | 'AUTHENTICATION_ERROR'   // Invalid API key
  | 'RATE_LIMIT_ERROR'       // Rate limit exceeded
  | 'QUOTA_EXCEEDED_ERROR'   // Usage quota exceeded
  | 'NETWORK_ERROR'          // Network failure
  | 'TIMEOUT_ERROR'          // Request timeout
  | 'INVALID_REQUEST_ERROR'  // Malformed request
  | 'MODEL_NOT_FOUND_ERROR'  // Unknown model
  | 'CONTEXT_LENGTH_ERROR'   // Context too long
  | 'CONTENT_FILTER_ERROR'   // Content blocked
  | 'SERVICE_ERROR'          // Provider service error

try {
  const result = await session.generate()
} catch (error) {
  if (isAdapterError(error)) {
    switch (error.code) {
      case 'RATE_LIMIT_ERROR':
        const retryAfter = error.data?.retryAfter
        await sleep(retryAfter ?? 60_000)
        break
      case 'CONTEXT_LENGTH_ERROR':
        session.truncateHistory(10)
        break
    }
  }
}
```

### Error Mapping

Each provider adapter maps provider-specific errors:

```typescript
// OpenAI error codes → AdapterErrorCode
'invalid_api_key' → 'AUTHENTICATION_ERROR'
'rate_limit_exceeded' → 'RATE_LIMIT_ERROR'
'context_length_exceeded' → 'CONTEXT_LENGTH_ERROR'

// Anthropic error codes → AdapterErrorCode
'authentication_error' → 'AUTHENTICATION_ERROR'
'rate_limit_error' → 'RATE_LIMIT_ERROR'
'invalid_request_error' → 'INVALID_REQUEST_ERROR'
```

---

## 13. Implementation Patterns

### Factory Function Pattern

All adapters use factory functions:

```typescript
// In adapters/src/providers/openai.ts
import type { 
  ProviderAdapterInterface,
  OpenAIProviderAdapterOptions 
} from '../types.js'

export function createOpenAIProviderAdapter(
  options: OpenAIProviderAdapterOptions
): ProviderAdapterInterface {
  const { apiKey, model = 'gpt-4o', baseURL, organization, defaultOptions } = options
  
  return {
    getId: () => `openai:${model}`,
    
    generate(messages, genOptions) {
      // Implementation
    },
    
    supportsTools: () => true,
    supportsStreaming: () => true,
    
    getCapabilities: () => ({
      supportsTools: true,
      supportsStreaming: true,
      supportsVision: model.includes('vision') || model.includes('4o'),
      supportsFunctions: true,
      models: [model],
    }),
  }
}
```

### Streaming Implementation

Use native `fetch` with SSE parsing:

```typescript
async function* streamCompletion(
  url: string,
  body: unknown,
  signal: AbortSignal
): AsyncGenerator<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, stream: true }),
    signal,
  })

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  
  while (reader) {
    const { done, value } = await reader.read()
    if (done) break
    
    const chunk = decoder.decode(value)
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))
        const content = data.choices?.[0]?.delta?.content
        if (content) yield content
      }
    }
  }
}
```

### Cross-Package Adapter Pattern

Accept minimal interfaces, not full implementations:

```typescript
// Good: Minimal interface
interface IndexedDBVectorPersistenceOptions {
  readonly database: {
    store<T>(name: string): StoreInterface<T>
  }
}

// Bad: Full implementation dependency
interface IndexedDBVectorPersistenceOptions {
  readonly database: DatabaseInterface // Too specific
}
```

---

## 14. Integration Examples

### Full Chat Application

```typescript
import { createEngine } from '@mikesaintsg/inference'
import { createToolRegistry } from '@mikesaintsg/contextprotocol'
import {
  createOpenAIProviderAdapter,
  createIndexedDBSessionPersistence,
  createToolCallBridge,
} from '@mikesaintsg/adapters'

// Setup
const provider = createOpenAIProviderAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
})

const persistence = createIndexedDBSessionPersistence({
  databaseName: 'my-chat-app',
})

const registry = createToolRegistry()
registry.register(weatherTool, weatherHandler)

const bridge = createToolCallBridge({ registry })

const engine = createEngine({ 
  provider,
  sessionPersistence: persistence,
})

// Create session
const session = engine.createSession({
  system: 'You are a helpful assistant.',
})

// Chat loop
async function chat(userMessage: string): Promise<string> {
  session.addMessage('user', userMessage)
  
  const stream = session.stream({
    tools: registry.getSchemas(),
  })
  
  let response = ''
  
  for await (const token of stream) {
    response += token
    updateUI(response)
  }
  
  const result = await stream.result()
  
  // Handle tool calls
  if (result.toolCalls.length > 0) {
    for (const call of result.toolCalls) {
      const toolResult = await bridge.execute(call)
      session.addToolResult(call.id, call.name, toolResult)
    }
    return chat('') // Continue with tool results
  }
  
  return response
}
```

### RAG Application

```typescript
import { createEngine } from '@mikesaintsg/inference'
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createContextBuilder } from '@mikesaintsg/contextbuilder'
import {
  createOpenAIProviderAdapter,
  createOpenAIEmbeddingAdapter,
  createIndexedDBVectorPersistence,
  createRetrievalTool,
} from '@mikesaintsg/adapters'

// Setup embedder and persistence
const embedder = createOpenAIEmbeddingAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small',
})

const persistence = createIndexedDBVectorPersistence({
  databaseName: 'my-rag-app',
})

const vectorStore = await createVectorStore({
  embedder,
  persistence,
})

// Create retrieval tool
const retrievalTool = createRetrievalTool({
  vectorStore,
  name: 'search_docs',
  description: 'Search documentation',
})

// Setup engine
const provider = createOpenAIProviderAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
})

const engine = createEngine({ provider })
const session = engine.createSession({
  system: 'Answer questions using the provided context.',
})

// RAG query
async function query(question: string): Promise<string> {
  // Retrieve relevant documents
  const results = await vectorStore.search(question, { topK: 5 })
  
  // Build context
  const context = createContextBuilder()
    .system('You are a helpful assistant.')
    .section('Relevant Documents', results.map(r => r.content).join('\n\n'))
    .user(question)
    .build()
  
  // Generate with context
  const result = await engine.generateFromContext(context)
  return result.text
}
```

---

## 15. Type Reference

### Provider Types

```typescript
interface ProviderAdapterInterface {
  getId(): string
  generate(
    messages: readonly Message[],
    options: GenerationOptions
  ): StreamHandleInterface
  supportsTools(): boolean
  supportsStreaming(): boolean
  getCapabilities(): ProviderCapabilities
}

interface ProviderCapabilities {
  readonly supportsTools: boolean
  readonly supportsStreaming: boolean
  readonly supportsVision: boolean
  readonly supportsFunctions: boolean
  readonly models: readonly string[]
}

interface OpenAIProviderAdapterOptions {
  readonly apiKey: string
  readonly model?: string
  readonly baseURL?: string
  readonly organization?: string
  readonly defaultOptions?: GenerationDefaults
}

interface AnthropicProviderAdapterOptions {
  readonly apiKey: string
  readonly model?: string
  readonly baseURL?: string
  readonly defaultOptions?: GenerationDefaults
}
```

### Embedding Types

```typescript
interface EmbeddingAdapterInterface {
  embed(text: string): Promise<Embedding>
  embedBatch(texts: readonly string[]): Promise<readonly Embedding[]>
  getModel(): EmbeddingModelMetadata
}

interface Embedding {
  readonly vector: readonly number[]
  readonly model: string
  readonly dimensions: number
}

interface EmbeddingModelMetadata {
  readonly id: string
  readonly dimensions: number
  readonly maxTokens: number
}

interface OpenAIEmbeddingAdapterOptions {
  readonly apiKey: string
  readonly model?: string
  readonly dimensions?: number
  readonly baseURL?: string
}

interface VoyageEmbeddingAdapterOptions {
  readonly apiKey: string
  readonly model?: string
  readonly baseURL?: string
}
```

### Tool Format Types

```typescript
interface ToolFormatAdapterInterface {
  formatSchemas(schemas: readonly ToolSchema[]): unknown
  parseToolCalls(response: unknown): readonly ToolCall[]
  formatResult(result: ToolResult): unknown
}

interface OpenAIToolFormatAdapterOptions {
  readonly toolChoice?: 'auto' | 'none' | 'required' | { readonly name: string }
}

interface AnthropicToolFormatAdapterOptions {
  readonly toolChoice?: 'auto' | 'any' | { readonly name: string }
}
```

### Persistence Types

```typescript
interface SessionPersistenceAdapterInterface {
  save(session: PersistedSession): Promise<void>
  load(id: string): Promise<PersistedSession | undefined>
  remove(id: string): Promise<void>
  all(): Promise<readonly SessionSummary[]>
  clear(): Promise<void>
}

interface VectorStorePersistenceAdapterInterface {
  load(): Promise<readonly StoredDocument[]>
  loadMetadata(): Promise<VectorStoreMetadata | undefined>
  save(docs: StoredDocument | readonly StoredDocument[]): Promise<void>
  saveMetadata(metadata: VectorStoreMetadata): Promise<void>
  remove(ids: string | readonly string[]): Promise<void>
  clear(): Promise<void>
  isAvailable(): Promise<boolean>
}

interface IndexedDBSessionPersistenceOptions {
  readonly databaseName?: string
  readonly storeName?: string
  readonly ttlMs?: number
}

interface IndexedDBVectorPersistenceOptions {
  readonly databaseName: string
  readonly documentsStore?: string
  readonly metadataStore?: string
}

interface HTTPVectorPersistenceOptions {
  readonly baseURL: string
  readonly headers?: Readonly<Record<string, string>>
}
```

### Bridge Types

```typescript
interface ToolCallBridgeOptions {
  readonly registry: ToolRegistryInterface
  readonly timeout?: number
  readonly onError?: (error: unknown, toolCall: ToolCall) => void
}

interface ToolCallBridgeInterface {
  execute(toolCall: ToolCall): Promise<ToolResult>
}

interface RetrievalToolOptions {
  readonly vectorStore: VectorStoreInterface
  readonly name: string
  readonly description: string
  readonly topK?: number
  readonly minScore?: number
}

interface RetrievalToolResult {
  readonly schema: ToolSchema
  readonly execute: (params: unknown) => Promise<unknown>
}
```

---

## License

MIT © [Mike Saints-G](https://github.com/mikesaintsg)
