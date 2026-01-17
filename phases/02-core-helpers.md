# Phase 2: Core Helpers

> **Status:** ⏳ Pending
> **Started:** —
> **Target:** —
> **Depends on:** Phase 1 (Foundation) ⏳ Pending

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project.

```
Current Deliverable: 2.1 SSE Parser
Checklist Progress: 0/20 items complete
Last Completed: —
Next Task: Implement SSE parser
Blockers: Phase 1 incomplete
```

---

## Objective

Implement the core helper utilities that all adapters depend on. By end of phase:

- SSE parser for streaming responses (shared across providers)
- Rate limiter for request throttling
- Error mapping utilities for all providers
- Retry logic wrapper

---

## Progress Summary

| Metric          | Value     |
|-----------------|-----------|
| Deliverables    | 0/5       |
| Checklist Items | 0/20      |
| Tests Passing   | —         |
| Quality Gates   | ⏳ Pending |

---

## Deliverables

| #   | Deliverable            | Status    | Assignee | Notes                                 |
|-----|------------------------|-----------|----------|---------------------------------------|
| 2.1 | SSE Parser             | ⏳ Pending | —        | Shared across all streaming providers |
| 2.2 | Rate Limiter           | ⏳ Pending | —        | Request throttling utility            |
| 2.3 | Provider Error Mapping | ⏳ Pending | —        | Map provider errors to AdapterError   |
| 2.4 | Retry Wrapper          | ⏳ Pending | —        | withRetry() for embedding/provider    |
| 2.5 | Unit Tests             | ⏳ Pending | —        | Tests for all helpers                 |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending
- 🚫 Blocked

---

## Type Dependencies

> **Purpose:** Track which types must exist before implementation.

| Deliverable | Required Types                         | Status    |
|-------------|----------------------------------------|-----------|
| 2.1         | SSEEvent, SSEParserOptions, SSEParserInterface | ✅ Done |
| 2.2         | RateLimiterInterface, RateLimiterOptions, RateLimiterState | ✅ Done |
| 2.3         | AdapterErrorCode, AdapterErrorData     | ✅ Done   |
| 2.4         | RetryOptions, RetryableProviderAdapterOptions | ✅ Done |

---

## Current Focus: 2.1 SSE Parser

### Requirements

1. Parse Server-Sent Events from HTTP response streams
2. Handle `data:`, `event:`, `id:`, `retry:` fields
3. Support chunked data (events split across chunks)
4. Handle `[DONE]` sentinel for OpenAI
5. Stateful parser (maintains buffer between feed() calls)

### Interface Contract

```typescript
// From src/types.ts
export interface SSEEvent {
	readonly event?: string
	readonly data: string
	readonly id?: string
	readonly retry?: number
}

export interface SSEParserOptions {
	readonly onEvent: (event: SSEEvent) => void
	readonly onError?: (error: Error) => void
	readonly onEnd?: () => void
}

export interface SSEParserInterface {
	feed(chunk: string): void
	end(): void
	reset(): void
}
```

### Implementation Order

1. `src/types.ts` — Already done
2. `src/helpers/sse.ts` — SSE parser implementation
3. `src/helpers/index.ts` — Barrel export
4. `tests/helpers/sse.test.ts` — Unit tests

### Implementation Checklist

**Parser Implementation:**
- [ ] Create `src/helpers/` directory
- [ ] Create `createSSEParser()` factory function
- [ ] Handle `data:` prefix parsing
- [ ] Handle `event:` field parsing
- [ ] Handle `id:` field parsing
- [ ] Handle `retry:` field parsing
- [ ] Handle multi-line data (continuation)
- [ ] Handle chunked input (partial lines)
- [ ] Handle `[DONE]` sentinel
- [ ] Implement `feed()` method
- [ ] Implement `end()` method
- [ ] Implement `reset()` method

**Exports:**
- [ ] Create `src/helpers/index.ts` barrel
- [ ] Export from main `src/index.ts`

**Tests:**
- [ ] Test single complete event
- [ ] Test multiple events in one chunk
- [ ] Test event split across chunks
- [ ] Test data with newlines
- [ ] Test [DONE] handling
- [ ] Test error callback

### Acceptance Criteria

```typescript
describe('SSE Parser', () => {
	it('parses complete SSE event', () => {
		const events: SSEEvent[] = []
		const parser = createSSEParser({
			onEvent: (event) => events.push(event),
		})
		
		parser.feed('data: {"text": "hello"}\n\n')
		
		expect(events).toHaveLength(1)
		expect(events[0].data).toBe('{"text": "hello"}')
	})

	it('handles chunked input', () => {
		const events: SSEEvent[] = []
		const parser = createSSEParser({
			onEvent: (event) => events.push(event),
		})
		
		parser.feed('data: {"tex')
		parser.feed('t": "hello"}\n\n')
		
		expect(events).toHaveLength(1)
	})
})
```

### Blocked By

- Phase 1 must be complete

### Blocks

- 2.5 (Tests) — needs SSE parser
- Phase 4 (Providers) — all providers use SSE parser

---

## Deliverable 2.2: Rate Limiter

### Requirements

1. Token bucket rate limiting
2. Configurable requests per minute
3. Configurable max concurrent requests
4. Dynamic limit adjustment (for Retry-After headers)
5. State inspection

### Interface Contract

```typescript
export interface RateLimiterInterface {
	acquire(): Promise<void>
	release(): void
	getState(): RateLimiterState
	setLimit(requestsPerMinute: number): void
}

export interface RateLimiterState {
	readonly activeRequests: number
	readonly maxConcurrent: number
	readonly requestsInWindow: number
	readonly requestsPerMinute: number
	readonly windowResetIn: number
}
```

### Implementation Checklist

- [ ] Create `src/helpers/rate-limiter.ts`
- [ ] Implement `createRateLimiter()` factory
- [ ] Implement token bucket algorithm
- [ ] Implement request queue for when limit reached
- [ ] Implement `acquire()` — waits until slot available
- [ ] Implement `release()` — returns slot to pool
- [ ] Implement `getState()` — current limiter state
- [ ] Implement `setLimit()` — dynamic adjustment
- [ ] Handle concurrent request limiting
- [ ] Handle window-based rate limiting

### Blocked By

- 2.1 (SSE Parser) — sequential deliverables

---

## Deliverable 2.3: Provider Error Mapping

### Requirements

1. Map OpenAI error codes to AdapterErrorCode
2. Map Anthropic error codes to AdapterErrorCode
3. Map Ollama error codes to AdapterErrorCode
4. Extract retry-after information
5. Create AdapterError from provider errors

### Implementation Checklist

- [ ] Create `src/helpers/error-mapping.ts`
- [ ] Implement `mapOpenAIError()` function
- [ ] Implement `mapAnthropicError()` function
- [ ] Implement `mapOllamaError()` function
- [ ] Implement `extractRetryAfter()` function
- [ ] Implement `createAdapterError()` helper
- [ ] Handle HTTP status code mapping
- [ ] Handle network errors
- [ ] Handle timeout errors

### Blocked By

- 1.3 (Error Utilities) — needs AdapterError class

---

## Deliverable 2.4: Retry Wrapper

### Requirements

1. Wrap any async function with retry logic
2. Exponential backoff with jitter
3. Configurable retry conditions
4. Respect Retry-After headers
5. Callbacks for retry events

### Implementation Checklist

- [ ] Create `src/wrappers/retryable.ts`
- [ ] Implement `withRetry()` generic wrapper
- [ ] Implement exponential backoff
- [ ] Implement jitter calculation
- [ ] Implement max retry limit
- [ ] Implement custom retry conditions
- [ ] Implement onRetry callback
- [ ] Create `createRetryableEmbeddingAdapter()` factory
- [ ] Create `createRetryableProviderAdapter()` factory

### Blocked By

- 2.3 (Error Mapping) — needs error codes for retry decisions

---

## Deliverable 2.5: Unit Tests

### Requirements

1. Full test coverage for SSE parser
2. Full test coverage for rate limiter
3. Full test coverage for error mapping
4. Full test coverage for retry wrapper

### Implementation Checklist

- [ ] `tests/helpers/sse.test.ts`
- [ ] `tests/helpers/rate-limiter.test.ts`
- [ ] `tests/helpers/error-mapping.test.ts`
- [ ] `tests/wrappers/retryable.test.ts`
- [ ] All tests use Vitest + Playwright
- [ ] No `it.todo()` remaining

### Blocked By

- 2.1, 2.2, 2.3, 2.4 — all implementations complete

---

## Files Created/Modified

> **Purpose:** Track all file changes in this phase for review.

| File                                  | Action   | Deliverable |
|---------------------------------------|----------|-------------|
| `src/helpers/sse.ts`                  | Created  | 2.1         |
| `src/helpers/rate-limiter.ts`         | Created  | 2.2         |
| `src/helpers/error-mapping.ts`        | Created  | 2.3         |
| `src/helpers/index.ts`                | Created  | 2.1         |
| `src/wrappers/retryable.ts`           | Created  | 2.4         |
| `src/wrappers/index.ts`               | Created  | 2.4         |
| `src/factories.ts`                    | Modified | 2.2, 2.4    |
| `src/index.ts`                        | Modified | All         |
| `tests/helpers/sse.test.ts`           | Created  | 2.5         |
| `tests/helpers/rate-limiter.test.ts`  | Created  | 2.5         |
| `tests/helpers/error-mapping.test.ts` | Created  | 2.5         |
| `tests/wrappers/retryable.test.ts`    | Created  | 2.5         |

---

## Quality Gates (Phase-Specific)

```powershell
npm run check    # Typecheck (no emit)
npm run format   # Lint and autofix
npm run build    # Build library
npm test         # Unit tests
```

**Current Status:**

| Gate            | Last Run | Result |
|-----------------|----------|--------|
| `npm run check` | —        | ⏳     |
| `npm run format`| —        | ⏳     |
| `npm run build` | —        | ⏳     |
| `npm test`      | —        | ⏳     |

---

## Test Coverage Requirements

| Component           | Min Coverage | Current |
|---------------------|--------------|---------|
| helpers/sse.ts      | 90%          | —       |
| helpers/rate-limiter.ts | 90%      | —       |
| helpers/error-mapping.ts | 80%     | —       |
| wrappers/retryable.ts | 85%        | —       |

---

## Notes

> **Instructions:** Add observations, gotchas, and decisions during implementation.

- SSE parsing must handle provider-specific quirks (OpenAI uses [DONE], Anthropic uses event types)
- Rate limiter should not block the event loop
- Retry wrapper must handle abort signals properly
- Use `#` private fields in all implementations

---

## Rollback Notes

> **Purpose:** If something goes wrong, how to recover.

**Safe State:** End of Phase 1
**Files to Revert:** All files in src/helpers/, src/wrappers/
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
  - [ ] Phase 2 status → ✅ Complete
  - [ ] Current Session State updated
  - [ ] Session Log entry added
