# Prompt: Implement Deliverable

> **When to use:** When actively working on a specific deliverable.

---

## Prompt Template

```
Implement deliverable [X.Y]: [Deliverable Name]

**Context:**
- Phase: [X] [Phase Name]
- Requirements: [Brief description or "see phase file"]

**Please follow the standard implementation flow:**

1. Check src/types.ts for required interfaces
2. If types don't exist, create them first
3. Implement in src/core/[domain]/
4. Extract helpers to src/helpers.ts
5. Extract constants to src/constants.ts  
6. Add factory function to src/factories.ts
7. Update barrel export in src/index.ts
8. Create tests in tests/core/[domain]/
9. Run quality gates
10. Update the phase file checklist

Start with step 1 and proceed through each step, showing progress.
```

---

## Expected Model Behavior

The model should:

1. **Check** types.ts first
2. **Create types** if needed, following naming conventions:
   - `[Name]Interface` for behavioral interfaces
   - `[Name]Options` for configuration
   - `[Name]State` for readonly state
   - `[Name]Subscriptions` for event hooks
3. **Implement** in proper location
4. **Extract** to centralized files (NEVER internal definitions)
5. **Test** with real assertions (no placeholders)
6. **Run** quality gates after implementation
7. **Update** phase file with progress

---

## Variations

### Implement with Specific Approach
```
Implement deliverable [X.Y]: [Deliverable Name]

Approach:
- Use [specific pattern]
- Handle [specific edge case] by [approach]
- Integrate with [existing component] via [mechanism]

Proceed with implementation.
```

### Implement Types Only
```
For deliverable [X.Y], implement ONLY the types in src/types.ts.

Include:
- Main interface with all methods
- Options interface
- State interface (if stateful)
- Subscriptions interface (if has events)

Do NOT create the implementation class yet.
```

### Implement Tests First (TDD)
```
For deliverable [X.Y], write the tests FIRST.

1. Create tests/core/[domain]/[FileName].test.ts
2. Write tests for all expected behaviors
3. Use it.todo() for tests you can't implement without the code
4. Show me the test file before implementing

Then implement to make the tests pass.
```

---

## Mid-Implementation Prompts

### Continue After Interruption
```
Continue implementing [X.Y]. You were working on [specific task].
```

### Check Progress
```
What's the current status of deliverable [X.Y]?
Show me the implementation checklist with current state.
```

### Run Quality Gates
```
Run quality gates for the current implementation:
npm run check; npm run format; npm test

Report results and fix any issues.
```

### Complete Deliverable
```
Finish deliverable [X.Y]:
1. Complete any remaining checklist items
2. Run all quality gates
3. Update the phase file
4. Update PLAN.md Current Session State
5. Summarize what was completed
```

---

## Checklist Before Using This Prompt

- [ ] Phase file exists with deliverable details
- [ ] Interface contract is defined in phase file
- [ ] Acceptance criteria are specified
- [ ] Dependencies (Blocked By) are resolved
