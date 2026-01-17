# Phase 3: Embeddings

> **Status:** ✅ Complete
> **Started:** 2026-01-17
> **Target:** 2026-01-17
> **Depends on:** Phase 2 (Core Helpers) ✅ Complete

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project.

```
Current Deliverable: All complete
Checklist Progress: 25/25 items complete
Last Completed: 3.6 Unit Tests
Next Task: Phase 4 - Providers
Blockers: None
```

---

## Objective

Implement all embedding adapters and wrapper adapters. By end of phase:

- OpenAI embedding adapter with text-embedding-3-small/large support
- Voyage AI embedding adapter for Anthropic users
- Ollama embedding adapter for local development
- Batched embedding wrapper for efficient bulk operations
- Cached embedding wrapper for deduplication
- All adapters implement `EmbeddingAdapterInterface` from core

---

## Progress Summary

| Metric          | Value        |
|-----------------|--------------|
| Deliverables    | 6/6          |
| Checklist Items | 25/25        |
| Tests Passing   | 222          |
| Quality Gates   | ✅ Passing   |

---

## Deliverables

| #   | Deliverable                  | Status    | Assignee | Notes                              |
|-----|------------------------------|-----------|----------|------------------------------------|
| 3.1 | OpenAI Embedding Adapter     | ✅ Done   | —        | text-embedding-3-small/large       |
| 3.2 | Voyage Embedding Adapter     | ✅ Done   | —        | Anthropic recommended              |
| 3.3 | Ollama Embedding Adapter     | ✅ Done   | —        | Local development/testing          |
| 3.4 | Batched Embedding Wrapper    | ✅ Done   | —        | Batch multiple embed calls         |
| 3.5 | Cached Embedding Wrapper     | ✅ Done   | —        | Cache results, skip duplicates     |
| 3.6 | Unit Tests                   | ✅ Done   | —        | Full coverage for all adapters     |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending
- 🚫 Blocked

---

## Type Dependencies

> **Purpose:** Track which types must exist before implementation.

| Deliverable | Required Types                                                 | Status |
|-------------|----------------------------------------------------------------|--------|
| 3.1         | OpenAIEmbeddingAdapterOptions, EmbeddingAdapterInterface       | ✅ Done |
| 3.2         | VoyageEmbeddingAdapterOptions                                  | ✅ Done |
| 3.3         | OllamaEmbeddingAdapterOptions, OllamaEmbeddingRequest/Response | ✅ Done |
| 3.4         | BatchedEmbeddingAdapterOptions                                 | ✅ Done |
| 3.5         | CachedEmbeddingAdapterOptions, CachedEmbedding                 | ✅ Done |

---

## Current Focus: 3.1 OpenAI Embedding Adapter

### Requirements

1. Implement `EmbeddingAdapterInterface` from `@mikesaintsg/core`
2. Support text-embedding-3-small (default) and text-embedding-3-large
3. Support dimension reduction via `dimensions` option
4. Handle API errors with proper AdapterError mapping
5. Support abort via AbortSignal

### Interface Contract

```typescript
// From @mikesaintsg/core
interface EmbeddingAdapterInterface {
	embed(texts: readonly string[], options?: AbortableOptions): Promise<readonly Embedding[]>
	getModelMetadata(): EmbeddingModelMetadata
}

// From src/types.ts
interface OpenAIEmbeddingAdapterOptions {
	readonly apiKey: string
	readonly model?: string
	readonly dimensions?: number
	readonly baseURL?: string
}
```

### Implementation Order

1. `src/types.ts` — Already done
2. `src/embeddings/openai.ts` — OpenAI adapter implementation
3. `src/factories.ts` — Add `createOpenAIEmbeddingAdapter`
4. `tests/embeddings/openai.test.ts` — Unit tests

### Implementation Checklist

**Adapter Implementation:**
- [ ] Create `createOpenAIEmbeddingAdapter()` factory
- [ ] Implement `embed()` method with fetch
- [ ] Implement `getModelMetadata()` method
- [ ] Handle single text embedding (convert to array)
- [ ] Handle batch text embedding
- [ ] Handle dimension reduction option
- [ ] Map HTTP errors to AdapterError
- [ ] Support AbortSignal
- [ ] Use constants for API URL and defaults

**Response Parsing:**
- [ ] Parse OpenAI embedding response format
- [ ] Convert response to Float32Array
- [ ] Handle API error responses
- [ ] Handle rate limit responses (extract retry-after)

**Exports:**
- [ ] Add factory to `src/factories.ts`
- [ ] Export from `src/embeddings/index.ts`
- [ ] Export from `src/index.ts`

### Acceptance Criteria

```typescript
describe('OpenAI Embedding Adapter', () => {
	it('implements EmbeddingAdapterInterface', () => {
		const adapter = createOpenAIEmbeddingAdapter({
			apiKey: 'test-key',
		})
		
		expect(adapter.embed).toBeInstanceOf(Function)
		expect(adapter.getModelMetadata).toBeInstanceOf(Function)
	})

	it('returns correct model metadata', () => {
		const adapter = createOpenAIEmbeddingAdapter({
			apiKey: 'test-key',
			model: 'text-embedding-3-small',
		})
		
		const metadata = adapter.getModelMetadata()
		expect(metadata.provider).toBe('openai')
		expect(metadata.model).toBe('text-embedding-3-small')
		expect(metadata.dimensions).toBe(1536)
	})
})
```

### Blocked By

- Phase 2 (Core Helpers) — needs error mapping

### Blocks

- 3.4 (Batched) — needs base adapter to wrap
- 3.5 (Cached) — needs base adapter to wrap

---

## Deliverable 3.2: Voyage Embedding Adapter

### Requirements

1. Implement `EmbeddingAdapterInterface`
2. Support voyage-3, voyage-3-lite, voyage-code-3 models
3. Support input_type: 'query' | 'document'
4. Handle API errors with proper mapping

### Implementation Checklist

- [ ] Create `createVoyageEmbeddingAdapter()` factory
- [ ] Implement `embed()` method
- [ ] Implement `getModelMetadata()` method
- [ ] Support input_type option for retrieval optimization
- [ ] Map HTTP errors to AdapterError
- [ ] Use constants for API URL
- [ ] Add factory to exports

### Blocked By

- 3.1 (OpenAI Adapter) — same pattern

---

## Deliverable 3.3: Ollama Embedding Adapter

### Requirements

1. Implement `EmbeddingAdapterInterface`
2. Support nomic-embed-text, mxbai-embed-large, all-minilm models
3. Handle local Ollama server at localhost:11434
4. Support configurable timeout

### Implementation Checklist

- [ ] Create `createOllamaEmbeddingAdapter()` factory
- [ ] Implement `embed()` using /api/embed endpoint
- [ ] Implement `getModelMetadata()` method
- [ ] Handle Ollama NDJSON response format
- [ ] Handle connection errors (Ollama not running)
- [ ] Support timeout configuration
- [ ] Add factory to exports

### Blocked By

- 3.2 (Voyage Adapter) — sequential implementation

---

## Deliverable 3.4: Batched Embedding Wrapper

### Requirements

1. Wrap any `EmbeddingAdapterInterface`
2. Batch multiple embed() calls into single API request
3. Configurable batch size and flush delay
4. Deduplicate identical texts within batch
5. Return results in correct order

### Interface Contract

```typescript
interface BatchedEmbeddingAdapterOptions {
	readonly adapter: EmbeddingAdapterInterface
	readonly batchSize?: number      // default: 100
	readonly delayMs?: number        // default: 50
	readonly deduplicate?: boolean   // default: true
}
```

### Implementation Checklist

- [ ] Create `createBatchedEmbeddingAdapter()` factory
- [ ] Implement request queue with batching
- [ ] Implement flush timer for delayed execution
- [ ] Implement deduplication within batch
- [ ] Map batch results back to callers
- [ ] Handle errors for individual callers
- [ ] Support AbortSignal passthrough
- [ ] Implement proper cleanup on destroy

### Blocked By

- 3.3 (Ollama Adapter) — needs adapter to wrap for testing

---

## Deliverable 3.5: Cached Embedding Wrapper

### Requirements

1. Wrap any `EmbeddingAdapterInterface`
2. Cache embeddings by text hash
3. Support TTL expiration
4. Accept Map or custom cache interface
5. Skip API call for cached texts

### Interface Contract

```typescript
interface CachedEmbeddingAdapterOptions {
	readonly adapter: EmbeddingAdapterInterface
	readonly cache: Map<string, CachedEmbedding> | CacheInterface<CachedEmbedding>
	readonly ttlMs?: number  // default: 3600000 (1 hour)
}

interface CachedEmbedding {
	readonly embedding: Embedding
	readonly cachedAt: number
}
```

### Implementation Checklist

- [ ] Create `createCachedEmbeddingAdapter()` factory
- [ ] Compute content hash for cache key
- [ ] Check cache before calling wrapped adapter
- [ ] Store results in cache with timestamp
- [ ] Check TTL on cache hits
- [ ] Handle partial cache hits (some texts cached, some not)
- [ ] Support custom cache interface
- [ ] Passthrough getModelMetadata()

### Blocked By

- 3.4 (Batched Adapter) — sequential implementation

---

## Deliverable 3.6: Unit Tests

### Requirements

1. Test each adapter in isolation
2. Mock fetch/HTTP for deterministic tests
3. Test wrapper composition (cached + batched)
4. Test error handling and edge cases

### Implementation Checklist

**OpenAI Tests:**
- [ ] `tests/embeddings/openai.test.ts`
- [ ] Test successful embedding
- [ ] Test batch embedding
- [ ] Test dimension reduction
- [ ] Test error mapping

**Voyage Tests:**
- [ ] `tests/embeddings/voyage.test.ts`
- [ ] Test successful embedding
- [ ] Test input_type handling
- [ ] Test error mapping

**Ollama Tests:**
- [ ] `tests/embeddings/ollama.test.ts`
- [ ] Test successful embedding
- [ ] Test connection error handling
- [ ] Test timeout handling

**Batched Tests:**
- [ ] `tests/embeddings/batched.test.ts`
- [ ] Test batching behavior
- [ ] Test deduplication
- [ ] Test flush timing
- [ ] Test error handling

**Cached Tests:**
- [ ] `tests/embeddings/cached.test.ts`
- [ ] Test cache hit
- [ ] Test cache miss
- [ ] Test TTL expiration
- [ ] Test partial cache hit

**Integration Tests:**
- [ ] `tests/embeddings/integration.test.ts`
- [ ] Test composed adapters (cached + batched + base)

### Blocked By

- 3.1, 3.2, 3.3, 3.4, 3.5 — all implementations complete

---

## Files Created/Modified

> **Purpose:** Track all file changes in this phase for review.

| File                               | Action   | Deliverable |
|------------------------------------|----------|-------------|
| `src/embeddings/openai.ts`         | Modified | 3.1         |
| `src/embeddings/voyage.ts`         | Created  | 3.2         |
| `src/embeddings/ollama.ts`         | Created  | 3.3         |
| `src/embeddings/batched.ts`        | Modified | 3.4         |
| `src/embeddings/cache.ts`          | Modified | 3.5         |
| `src/embeddings/index.ts`          | Modified | All         |
| `src/factories.ts`                 | Modified | All         |
| `tests/embeddings/openai.test.ts`  | Created  | 3.6         |
| `tests/embeddings/voyage.test.ts`  | Created  | 3.6         |
| `tests/embeddings/ollama.test.ts`  | Created  | 3.6         |
| `tests/embeddings/batched.test.ts` | Created  | 3.6         |
| `tests/embeddings/cached.test.ts`  | Created  | 3.6         |

---

## Quality Gates (Phase-Specific)

```powershell
npm run check    # Typecheck (no emit)
npm run format   # Lint and autofix
npm run build    # Build library
npm test         # Unit tests
```

**Current Status:**

| Gate             | Last Run | Result |
|------------------|----------|--------|
| `npm run check`  | —        | ⏳      |
| `npm run format` | —        | ⏳      |
| `npm run build`  | —        | ⏳      |
| `npm test`       | —        | ⏳      |

---

## Test Coverage Requirements

| Component              | Min Coverage | Current |
|------------------------|--------------|---------|
| embeddings/openai.ts   | 85%          | —       |
| embeddings/voyage.ts   | 85%          | —       |
| embeddings/ollama.ts   | 80%          | —       |
| embeddings/batched.ts  | 90%          | —       |
| embeddings/cache.ts    | 90%          | —       |

---

## Notes

> **Instructions:** Add observations, gotchas, and decisions during implementation.

- OpenAI embeddings return Float32 arrays; need to convert properly
- Voyage AI uses different dimension sizes per model
- Ollama uses NDJSON for embeddings, not SSE
- Batched adapter must handle Promise resolution correctly
- Cached adapter needs efficient hash computation
- Use `#` private fields in all implementations

---

## Rollback Notes

> **Purpose:** If something goes wrong, how to recover.

**Safe State:** End of Phase 2
**Files to Revert:** All files in src/embeddings/
**Dependencies:** None (no external state)

---

## Phase Completion Criteria

All of the following must be true:

- [ ] All deliverables marked ✅ Done
- [ ] `npm run check` passes
- [ ] `npm run format` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] No `it.todo()` remaining in phase scope
- [ ] All files in "Files Created/Modified" reviewed
- [ ] PLAN.md updated:
  - [ ] Phase 3 status → ✅ Complete
  - [ ] Current Session State updated
  - [ ] Session Log entry added
