# Prompt: Analyze

> **When to use:** When you need to understand existing code, find issues, or assess quality.

---

## Prompt Template

```
Analyze [target]: [file, folder, or component]

**Focus areas:**
- [Area 1, e.g., Type safety]
- [Area 2, e.g., Naming conventions]
- [Area 3, e.g., Architecture alignment]

**Please:**
1. Read .github/copilot-instructions.md for standards
2. Read the target code thoroughly
3. Provide a structured analysis
4. Categorize issues by severity (Critical / Warning / Info)
5. Suggest fixes but do NOT implement yet

Output format:
- Summary (1-2 sentences)
- Issues table with severity
- Recommendations prioritized
- Questions if anything is unclear
```

---

## Expected Model Behavior

The model should:

1. **Read** coding standards first
2. **Analyze** code against standards
3. **Report** in structured format:

   ```
   ## Analysis: [target]
   
   **Summary:** [Brief assessment]
   
   ### Issues
   
   | #  | Severity | Location           | Issue                          | Fix                        |
   |----|----------|--------------------|--------------------------------|----------------------------|
   | 1  | Critical | src/core/db/Db.ts  | Uses `any` for query param     | Use `unknown` + type guard |
   | 2  | Warning  | src/core/db/Db.ts  | Type defined in impl file      | Move to src/types.ts       |
   | 3  | Info     | src/core/db/Db.ts  | Missing TSDoc on public method | Add documentation          |
   
   ### Recommendations
   
   1. **Immediate:** Fix critical type safety issues
   2. **Soon:** Extract types to centralized files
   3. **Later:** Add comprehensive documentation
   
   ### Questions
   
   - [Question about unclear intent]
   
   Shall I proceed with fixes?
   ```

4. **Wait** for direction

---

## Analysis Types

### Type Safety Audit
```
Analyze type safety in [target]:

Check for:
- any usage (should be unknown)
- as casts (should narrow from unknown)
- ! assertions (should handle null explicitly)
- Missing readonly on public properties
- Unsafe indexed access without checks
- Type guards that mutate or have side effects

Report all violations with line numbers.
```

### Naming Convention Audit
```
Analyze naming conventions in [target]:

Check against copilot-instructions.md rules:
- Interface naming (Interface suffix for behavioral)
- Method prefixes (get/resolve/is/has/on/set/etc.)
- No abbreviations (except allowed: ID, URL, API, etc.)
- Boolean methods use is/has
- Event subscriptions return cleanup functions

List all violations.
```

### Architecture Alignment
```
Analyze architecture of [target] against PLAN.md:

Check:
- Does implementation match Architecture diagram?
- Are component responsibilities correct?
- Are dependencies in the right direction?
- Is the code in the correct location (src/core/[domain])?

Report misalignments.
```

### Code Organization Audit
```
Analyze code organization in [target]:

Check file placement rules:
- Types in src/types.ts (not in implementation files)
- Helpers in src/helpers.ts
- Constants in src/constants.ts
- Factory functions in src/factories.ts
- No internal type definitions in src/core/

List violations with extraction targets.
```

### Test Coverage Analysis
```
Analyze test coverage for [target]:

Check:
- Do tests exist? (tests/ should mirror src/)
- Are all public methods tested?
- Are edge cases covered?
- Any it.todo() placeholders?
- Are tests testing behavior, not implementation?

Report gaps and suggest test cases.
```

### API Surface Analysis
```
Analyze the public API of [target]:

Document:
- All exported types/interfaces
- All exported functions
- All exported classes
- Entry points (what users import)

Check:
- Is the API minimal and focused?
- Are there redundant exports?
- Is naming consistent?
- Are options orthogonal?

Suggest improvements.
```

### Dependency Analysis
```
Analyze dependencies in [target]:

Check:
- External packages used (should be minimal)
- Internal dependencies (coupling)
- Circular dependencies
- Platform-specific imports in shared code

Report any concerns.
```

---

## Post-Analysis Prompts

### Fix All Issues
```
Please fix all issues from the analysis, starting with Critical severity.
After each fix, run quality gates.
```

### Fix Specific Category
```
Please fix only the [Type Safety / Naming / Organization] issues.
Leave other issues for later.
```

### Create Refactoring Plan
```
Based on this analysis, create a refactoring plan with:
1. Ordered list of changes
2. Files affected
3. Estimated complexity (Low/Medium/High)
4. Dependencies between changes
```

### Add to Phase File
```
Add these issues to the Notes section of the current phase file.
We'll address them after completing the current deliverable.
```

---

## Quick Analysis Commands

### Full Standards Audit
```
Run a complete audit of [file/folder] against copilot-instructions.md.
Check: types, naming, organization, safety, documentation.
Report all violations.
```

### Pre-Commit Check
```
Before committing, analyze all changed files:
1. Check for any violations of coding standards
2. Verify all quality gates pass
3. Confirm tests exist for new code
4. Check for any TODO comments that need addressing

Report any blockers.
```

### Phase Completion Review
```
Review Phase [X] for completion:
1. Are all deliverables marked done?
2. Do all quality gates pass?
3. Is test coverage adequate?
4. Are there any it.todo() remaining?
5. Are all types documented?

Report completion status.
```

---

## Checklist Before Using This Prompt

- [ ] Target exists and is accessible
- [ ] You know what aspect to focus on
- [ ] copilot-instructions.md is in the repo
- [ ] You're prepared to act on findings
