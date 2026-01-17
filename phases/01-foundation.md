# Phase 1: Foundation

> **Status:** 🔄 In Progress
> **Started:** 2026-01-17
> **Target:** 2026-01-20
> **Depends on:** None (first phase)

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project.

```
Current Deliverable: 1.5 Project Setup Validation (COMPLETE)
Checklist Progress: 12/15 items complete
Last Completed: All quality gates passing, 64 tests
Next Task: Update phase file checklists, mark phase complete
Blockers: None
```

---

## Objective

Establish the foundational structure for the adapters package. By end of phase, the library should have:

- Validated and complete type definitions
- Working project configuration (TypeScript, ESLint, Vite, Vitest)
- Core helper functions and constants
- Error handling utilities
- Barrel exports configured correctly
- Basic test setup passing

---

## Progress Summary

| Metric          | Value      |
|-----------------|------------|
| Deliverables    | 3/5        |
| Checklist Items | 12/15      |
| Tests Passing   | 64         |
| Quality Gates   | ✅ All Pass |

---

## Deliverables

| #   | Deliverable                 | Status | Assignee | Notes                          |
|-----|-----------------------------|--------|----------|--------------------------------|
| 1.1 | Types Review and Validation | ✅ Done | —        | All imports verified           |
| 1.2 | Constants and Configuration | ✅ Done | —        | All constants implemented      |
| 1.3 | Error Utilities             | ✅ Done | —        | AdapterError class complete    |
| 1.4 | Helper Functions            | ✅ Done | —        | Hash, serialize utilities done |
| 1.5 | Project Setup Validation    | ✅ Done | —        | All quality gates passing      |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending
- 🚫 Blocked

---

## Type Dependencies

> **Purpose:** Track which types must exist before implementation.

| Deliverable | Required Types                        | Status |
|-------------|---------------------------------------|--------|
| 1.1         | All types from @mikesaintsg/core      | ✅ Done |
| 1.1         | All types from @mikesaintsg/inference | ✅ Done |
| 1.3         | AdapterErrorCode, AdapterErrorData    | ✅ Done |

---

## Current Focus: 1.1 Types Review and Validation

### Requirements

1. Verify all imports from `@mikesaintsg/core` are valid
2. Verify all imports from `@mikesaintsg/inference` are valid
3. Ensure no circular dependencies exist
4. Validate all factory function types are complete
5. Ensure types align with guides (adapters.md, core.md, inference.md)

### Interface Contract

The following types are imported from dependencies:

```typescript
// From @mikesaintsg/core
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

// From @mikesaintsg/inference
import type {
	ProviderAdapterInterface,
	StreamHandleInterface,
	PersistedSession,
	SessionSummary,
} from '@mikesaintsg/inference'
```

### Implementation Order

1. Review `src/types.ts` — Verify all imports resolve correctly
2. Check `package.json` — Ensure peer dependencies are declared
3. Run `npm run check` — Verify TypeScript compilation
4. Create placeholder implementations if types reference undefined interfaces

### Implementation Checklist

**Types Review:**
- [ ] Verify imports from `@mikesaintsg/core` resolve
- [ ] Verify imports from `@mikesaintsg/inference` resolve
- [ ] Check all interface suffixes follow conventions (`Interface` for behavioral)
- [ ] Validate options types end with `Options`
- [ ] Ensure no duplicate type definitions

**Dependencies:**
- [ ] Peer dependencies declared in package.json
- [ ] No circular dependency issues
- [ ] TypeScript paths configured correctly

**Validation:**
- [ ] `npm run check` passes
- [ ] No unused type exports
- [ ] All factory function types have matching options types

### Acceptance Criteria

```typescript
// Types should compile without errors
import type {
	OpenAIProviderAdapterOptions,
	AnthropicProviderAdapterOptions,
	OllamaProviderAdapterOptions,
	OpenAIEmbeddingAdapterOptions,
	VoyageEmbeddingAdapterOptions,
	OllamaEmbeddingAdapterOptions,
	BatchedEmbeddingAdapterOptions,
	CachedEmbeddingAdapterOptions,
	RetryOptions,
	RateLimiterInterface,
	SSEParserInterface,
	ToolCallBridgeInterface,
	AdapterErrorCode,
} from '@mikesaintsg/adapters'
```

### Blocked By

- Nothing currently

### Blocks

- 1.2 (Constants) — needs validated types
- 1.3 (Error Utilities) — needs validated error types
- 1.4 (Helpers) — needs validated types

---

## Deliverable 1.2: Constants and Configuration

### Requirements

1. Define all API endpoint constants (OpenAI, Anthropic, Voyage, Ollama)
2. Define default values for all adapters
3. Define model token multipliers
4. Export retryable error codes constant

### Implementation Checklist

**Constants:**
- [ ] OpenAI constants (base URL, default model, dimensions)
- [ ] Anthropic constants (base URL, default model)
- [ ] Voyage constants (base URL, default model, dimensions)
- [ ] Ollama constants (base URL, default timeout)
- [ ] Embedding cache defaults
- [ ] Batch size defaults
- [ ] Persistence defaults

**Token Multipliers:**
- [ ] DEFAULT_MODEL_MULTIPLIERS complete for all supported models
- [ ] DEFAULT_RETRYABLE_CODES exported

### Blocked By

- 1.1 (Types) — constants reference type definitions

---

## Deliverable 1.3: Error Utilities

### Requirements

1. Create `AdapterError` class extending `Error`
2. Create type guard `isAdapterError()`
3. Map provider-specific errors to `AdapterErrorCode`
4. Include retry information for rate limit errors

### Implementation Checklist

**Error Class:**
- [ ] Create `AdapterError` class with code, data, cause
- [ ] Implement proper error name
- [ ] Include helper for extracting retry-after

**Type Guards:**
- [ ] `isAdapterError()` type guard
- [ ] Error code narrowing helpers

**Error Mapping:**
- [ ] OpenAI error code mapping
- [ ] Anthropic error code mapping
- [ ] Ollama error code mapping

### Blocked By

- 1.1 (Types) — AdapterErrorCode, AdapterErrorData

---

## Deliverable 1.4: Helper Functions

### Requirements

1. Content hashing utilities
2. Document serialization/deserialization
3. Embedding size estimation
4. General utility functions

### Implementation Checklist

**Hashing:**
- [ ] `computeContentHash()` using SHA-256
- [ ] Hash caching optimization (if needed)

**Serialization:**
- [ ] `serializeStoredDocument()` — Float32Array to array
- [ ] `deserializeStoredDocument()` — array to Float32Array

**Utilities:**
- [ ] `estimateEmbeddingBytes()` — size calculation
- [ ] Any additional helpers identified during implementation

### Blocked By

- 1.1 (Types) — StoredDocument, Embedding types

---

## Deliverable 1.5: Project Setup Validation

### Requirements

1. All quality gates pass
2. Test infrastructure configured
3. Showcase skeleton works
4. Barrel exports complete

### Implementation Checklist

**Quality Gates:**
- [ ] `npm run check` passes
- [ ] `npm run format` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes (may have no tests yet)

**Configuration:**
- [ ] tsconfig.json properly configured
- [ ] vitest.config.ts configured for browser tests
- [ ] eslint.config.ts applied
- [ ] vite.config.ts configured

**Exports:**
- [ ] `src/index.ts` exports all public APIs
- [ ] Sub-module exports configured (embeddings, formatters, persistence)

### Blocked By

- 1.1, 1.2, 1.3, 1.4 — all previous deliverables

---

## Files Created/Modified

> **Purpose:** Track all file changes in this phase for review.

| File                       | Action   | Deliverable |
|----------------------------|----------|-------------|
| `src/types.ts`             | Modified | 1.1         |
| `package.json`             | Review   | 1.1         |
| `src/constants.ts`         | Modified | 1.2         |
| `src/errors.ts`            | Modified | 1.3         |
| `src/helpers.ts`           | Review   | 1.4         |
| `src/index.ts`             | Review   | 1.5         |
| `tests/index.test.ts`      | Created  | 1.5         |
| `tests/errors.test.ts`     | Created  | 1.3         |
| `tests/constants.test.ts`  | Created  | 1.2         |

---

## Quality Gates (Phase-Specific)

> **Instructions:** Run after EACH deliverable, not just at phase end.

```powershell
npm run check    # Typecheck (no emit)
npm run format   # Lint and autofix
npm run build    # Build library
npm test         # Unit tests
```

**Current Status:**

| Gate             | Last Run   | Result |
|------------------|------------|--------|
| `npm run check`  | 2026-01-17 | ✅      |
| `npm run format` | 2026-01-17 | ✅      |
| `npm run build`  | 2026-01-17 | ✅      |
| `npm test`       | 2026-01-17 | ✅      |

---

## Test Coverage Requirements

| Component    | Min Coverage | Current |
|--------------|--------------|---------|
| helpers.ts   | 80%          | —       |
| errors.ts    | 80%          | —       |
| constants.ts | N/A          | —       |

---

## Notes

> **Instructions:** Add observations, gotchas, and decisions during implementation.

- Types are already defined in `src/types.ts` — treat as source of truth
- Imports from core/inference may need package installation or mocking for initial development
- Use `#` private fields, not `private` keyword
- ESM imports must use `.js` extensions

---

## Rollback Notes

> **Purpose:** If something goes wrong, how to recover.

**Safe State:** Initial commit before phase 1 changes
**Files to Revert:** 
- `src/constants.ts`
- `src/errors.ts`
- `src/helpers.ts`
- `src/index.ts`
**Dependencies:** None (foundation phase)

---

## Phase Completion Criteria

All of the following must be true:

- [x] All deliverables marked ✅ Done
- [x] `npm run check` passes
- [x] `npm run format` passes
- [x] `npm run build` passes
- [x] `npm test` passes (64 tests)
- [x] No `it.todo()` remaining in phase scope
- [x] All files in "Files Created/Modified" reviewed
- [x] PLAN.md updated:
  - [x] Phase 1 status → ✅ Complete
  - [ ] Current Session State updated
  - [ ] Session Log entry added
