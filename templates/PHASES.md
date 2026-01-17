# Phase [N]: [Phase Name]

> **Status:** ⏳ Pending | 🔄 In Progress | ✅ Complete
> **Started:** [YYYY-MM-DD]
> **Target:** [YYYY-MM-DD]
> **Depends on:** Phase [N-1] ([Name]) [Status]

---

## Session Context

> **Purpose:** Quick orientation for models starting mid-project.

```
Current Deliverable: [N].[X] [Deliverable Name]
Checklist Progress: [N]/[M] items complete
Last Completed: [Brief description]
Next Task: [Brief description]
Blockers: [None | List blockers]
```

---

## Objective

[What this phase accomplishes. By end of phase, the library should be functional for X use cases.]

---

## Progress Summary

| Metric          | Value     |
|-----------------|-----------|
| Deliverables    | 0/[N]     |
| Checklist Items | 0/[N]     |
| Tests Passing   | —         |
| Quality Gates   | ⏳ Pending |

---

## Deliverables

| #     | Deliverable              | Status    | Assignee | Notes                    |
|-------|--------------------------|-----------|----------|--------------------------|
| [N].1 | [Deliverable 1]          | ⏳ Pending | —        | [Dependencies, blockers] |
| [N].2 | [Deliverable 2]          | ⏳ Pending | —        | —                        |
| [N].3 | [Deliverable 3]          | ⏳ Pending | —        | —                        |
| [N].4 | [Deliverable 4]          | ⏳ Pending | —        | —                        |
| [N].5 | Unit tests for all above | ⏳ Pending | —        | Mirror src/ structure    |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending
- 🚫 Blocked

---

## Type Dependencies

> **Purpose:** Track which types must exist before implementation.

| Deliverable | Required Types                     | Status    |
|-------------|-----------------------------------|-----------|
| [N].1       | [InterfaceName]Interface          | ⏳ Pending |
| [N].2       | [OptionsName]Options              | ⏳ Pending |

---

## Current Focus: [N].[X] [Deliverable Name]

### Requirements

1. [Requirement 1]
2. [Requirement 2]
3. [Requirement 3]

### Interface Contract

```typescript
// From src/types.ts — DO NOT MODIFY without updating this doc
export interface [InterfaceName]Interface {
	[method1](): [ReturnType]
	[method2](): [ReturnType]
}
```

### Implementation Order

> **Reminder:** Types first, then implementation, then tests.

1. `src/types.ts` — Add interface(s) if not present
2. `src/core/[domain]/[FileName].ts` — Implementation
3. `src/helpers.ts` — Add helper functions (if any)
4. `src/constants.ts` — Add constants (if any)
5. `src/factories.ts` — Add factory function
6. `src/index.ts` — Update barrel exports
7. `tests/core/[domain]/[FileName].test.ts` — Unit tests

### Implementation Checklist

> **Instructions:** Check items as completed. Add new items if scope expands.

**Types:**
- [ ] Add interface to `src/types.ts`
- [ ] Add options interface (if needed)
- [ ] Add state interface (if needed)
- [ ] Add subscriptions interface (if needed)

**Implementation:**
- [ ] Create `src/core/[domain]/[FileName].ts`
- [ ] Implement constructor with options
- [ ] Implement [method 1]
- [ ] Implement [method 2]
- [ ] Implement [method 3]
- [ ] Wire up subscription methods (if applicable)
- [ ] Implement `destroy()` cleanup method

**Extraction Reminders:**
- [ ] Extract any helper functions to `src/helpers.ts`
- [ ] Extract any constants to `src/constants.ts`
- [ ] Extract any type guards to `src/helpers.ts`
- [ ] NO internal types in implementation files

**Exports:**
- [ ] Add factory function to `src/factories.ts`
- [ ] Update barrel export in `src/index.ts`

**Tests:**
- [ ] Create `tests/core/[domain]/[FileName].test.ts`
- [ ] Test happy path
- [ ] Test edge cases
- [ ] Test error conditions
- [ ] No `it.todo()` remaining

### Acceptance Criteria

```typescript
// This test must pass before marking [N].[X] complete
describe('[Component]', () => {
	it('[test case 1]', () => {
		// Test implementation
	})

	it('[test case 2]', () => {
		// Test implementation
	})
})
```

### Blocked By

- [Nothing currently. | Deliverable X.Y — reason]

### Blocks

- [N].[Y] ([Deliverable]) — [reason]
- [N].[Z] ([Deliverable]) — [reason]

---

## Files Created/Modified

> **Purpose:** Track all file changes in this phase for review.

| File                                      | Action   | Deliverable |
|-------------------------------------------|----------|-------------|
| `src/types.ts`                            | Modified | [N].1       |
| `src/core/[domain]/[FileName].ts`         | Created  | [N].1       |

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

| Gate          | Last Run     | Result |
|---------------|--------------|--------|
| `npm run check` | —          | ⏳     |
| `npm run format`| —          | ⏳     |
| `npm run build` | —          | ⏳     |
| `npm test`      | —          | ⏳     |

---

## Test Coverage Requirements

| Component              | Min Coverage | Current |
|------------------------|--------------|---------|
| [Component 1]          | 80%          | —       |
| [Component 2]          | 80%          | —       |

---

## Notes

> **Instructions:** Add observations, gotchas, and decisions during implementation.

- [Important implementation note 1]
- [Important implementation note 2]
- Remember: Use `#` private fields, not `private` keyword

---

## Rollback Notes

> **Purpose:** If something goes wrong, how to recover.

**Safe State:** [Describe last known good state]
**Files to Revert:** [List files that could be reverted]
**Dependencies:** [Any external state that might need cleanup]

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
  - [ ] Phase [N] status → ✅ Complete
  - [ ] Current Session State updated
  - [ ] Session Log entry added
