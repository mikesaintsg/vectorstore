# Prompt: Refactor

> **When to use:** When code works but needs improvement, or when applying coding standards to existing code.

---

## Prompt Template

```
Refactor [target]: [file or component name]

**Reason:** [Why refactoring is needed]

**Goals:**
- [Goal 1, e.g., Extract types to src/types.ts]
- [Goal 2, e.g., Apply naming conventions]
- [Goal 3, e.g., Improve encapsulation]

**Constraints:**
- Do NOT change public API behavior
- All existing tests must continue to pass
- Follow .github/copilot-instructions.md standards

**Please:**
1. Read the current implementation
2. Identify all issues relative to coding standards
3. Propose the refactoring plan (do NOT start yet)
4. Wait for approval before making changes
```

---

## Expected Model Behavior

The model should:

1. **Read** the target file(s)
2. **Identify** issues categorized by type:
   - Types in wrong location
   - Naming convention violations
   - Missing encapsulation (`#` private fields)
   - Unsafe type patterns (`any`, `as`, `!`)
   - Missing documentation
3. **Propose** changes without implementing:
   ```
   Refactoring plan for [target]:
   
   1. Types extraction:
      - Move [Interface] to src/types.ts
      - Move [Type] to src/types.ts
   
   2. Naming fixes:
      - Rename [oldName] → [newName] (reason)
      - Add Interface suffix to [Name]
   
   3. Encapsulation:
      - Convert private → # for [fields]
   
   4. Type safety:
      - Replace any with unknown in [location]
      - Remove unsafe cast in [location]
   
   Files affected:
   - src/types.ts (add types)
   - src/core/[domain]/[File].ts (modify)
   - tests/[File].test.ts (update imports)
   
   Shall I proceed?
   ```
4. **Wait** for approval

---

## Refactoring Types

### Extract Types
```
Extract all types from src/core/[domain]/[File].ts to src/types.ts.

Remember:
- ALL types go to types.ts, even "internal" ones
- Update imports in the original file
- Update any test imports
- Run quality gates after
```

### Apply Naming Conventions
```
Review and fix naming conventions in [file/folder]:

Check for:
- Interface suffix on behavioral interfaces
- Options/State/Subscriptions suffixes
- Method prefix conventions (get/resolve/is/has/on/etc.)
- No abbreviations (except ID, URL, API, etc.)

Show violations first, then fix.
```

### Improve Type Safety
```
Improve type safety in [file]:

Look for:
- any → replace with unknown + type guards
- as casts → replace with proper narrowing
- ! assertions → replace with explicit checks
- Missing readonly on public properties

Show each issue and its fix.
```

### Encapsulation Audit
```
Audit encapsulation in [class/file]:

Check for:
- private keyword → should be # private fields
- Public mutable state → should be private with getters
- Exposed internal collections → should return readonly copies
- Missing destroy() method on stateful classes

Propose changes without breaking public API.
```

---

## Post-Refactor Prompts

### Verify No Behavior Change
```
Refactoring complete. Please:
1. Run all quality gates: npm run check; npm run format; npm test
2. Confirm all tests still pass
3. List any API changes (there should be none for pure refactoring)
```

### Document Changes
```
Update the Notes section in the phase file with refactoring changes:
- What was refactored
- Why
- Any follow-up needed
```

---

## Common Refactoring Scenarios

### Convert to System Hooks Pattern
```
Refactor [Component] to use the System Hooks Pattern.

Create:
1. [Component]State interface (readonly snapshot)
2. [Component]Subscriptions interface (on* methods)
3. [Component]Options interface (extends SubscriptionToHook)
4. [Component]Interface (extends Subscriptions)

Then update the implementation to match.
```

### Consolidate Helpers
```
Review all src/core/[domain]/*.ts files for:
- Inline helper functions
- Type guards
- Utility functions

Extract ALL of them to src/helpers.ts.
Show each extraction.
```

### Standardize Error Handling
```
Review error handling in [file/folder]:

Ensure:
- All errors are typed (not plain Error)
- Error messages are in constants.ts
- get() returns undefined (not throws)
- resolve() throws NotFoundError
- Result pattern only for external operations

Fix any deviations.
```

---

## Checklist Before Using This Prompt

- [ ] Code is working (refactoring, not bug fixing)
- [ ] Tests exist to verify behavior
- [ ] Clear goal for refactoring
- [ ] Understand that pure refactoring = no API changes
