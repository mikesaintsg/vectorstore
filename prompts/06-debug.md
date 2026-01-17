# Prompt: Debug

> **When to use:** When something isn't working and you need help finding/fixing the issue.

---

## Prompt Template

```
Debug: [Brief description of the problem]

**Symptoms:**
- [What's happening]
- [Expected vs actual behavior]
- [When it occurs]

**Context:**
- File(s): [Affected files]
- Deliverable: [X.Y if applicable]
- Last change: [What was recently modified]

**What I've tried:**
- [Attempt 1]
- [Attempt 2]

**Please:**
1. Read the affected code
2. Identify the root cause
3. Propose a fix that follows coding standards
4. Wait for approval before implementing
```

---

## Expected Model Behavior

The model should:

1. **Read** affected files
2. **Analyze** the problem
3. **Report** findings:
   ```
   ## Debug Analysis: [Problem]
   
   **Root Cause:** [What's causing the issue]
   
   **Evidence:**
   - [Code snippet or behavior that confirms]
   - [Line numbers where issue occurs]
   
   **Proposed Fix:**
   - [Step 1]
   - [Step 2]
   
   **Files to modify:**
   - [file1.ts]: [change description]
   
   **Risk:** [Low/Medium/High] — [why]
   
   Shall I implement this fix?
   ```
4. **Wait** for approval

---

## Debug Scenarios

### Type Error
```
Debug: TypeScript error

Error message:
```
[Paste exact error]
```

File: [path]
Line: [number]

Please identify the type issue and propose a fix that maintains type safety.
```

### Test Failure
```
Debug: Test failure

Test: [test name]
File: tests/[path]

Error:
```
[Paste test output]
```

Is this a test issue or an implementation issue? Propose a fix.
```

### Runtime Error
```
Debug: Runtime error

Error:
```
[Paste error and stack trace]
```

Steps to reproduce:
1. [Step 1]
2. [Step 2]

Please identify the issue and propose a fix.
```

### Quality Gate Failure
```
Debug: Quality gate failure

Command: [npm run check / format / build / test]

Output:
```
[Paste output]
```

Please identify all issues and propose fixes.
```

### Logic Bug
```
Debug: Unexpected behavior

Expected: [What should happen]
Actual: [What actually happens]

To reproduce:
```typescript
// Code that demonstrates the issue
```

Please trace through the logic and identify where it goes wrong.
```

---

## Investigation Prompts

### Trace Execution
```
Trace the execution path for:
```typescript
// Example usage that causes the issue
```

Show each step and where the problem occurs.
```

### Compare Expected vs Actual
```
For [function/method]:

Input: [input value]
Expected output: [expected]
Actual output: [actual]

Trace through and find where they diverge.
```

### Check Dependencies
```
The issue might be in a dependency. Check:
1. src/types.ts — are interfaces correct?
2. src/helpers.ts — are helpers working correctly?
3. Related tests — do they pass?

Report what you find.
```

### Review Recent Changes
```
The issue started after recent changes. Please:
1. Identify what was changed (check git or Files Created/Modified)
2. Check if changes introduced the bug
3. Propose whether to fix forward or revert

Report findings.
```

---

## Post-Debug Prompts

### Implement Fix
```
The analysis looks correct. Implement the fix:
1. Make the changes
2. Run quality gates
3. Verify the issue is resolved
4. Add a regression test if appropriate
```

### Add Regression Test
```
The fix works. Please add a test to prevent regression:
1. Add test case that would have caught this bug
2. Place in appropriate test file
3. Verify it passes now
```

### Document Root Cause
```
Add a note to the phase file about this issue:
- What went wrong
- Root cause
- How it was fixed
- How to prevent similar issues
```

### Skip for Now
```
We'll address this later. Please:
1. Add a TODO comment at the problem location
2. Add to Notes in the phase file
3. Continue with the original task
```

---

## Quick Debug Commands

### Run and Report
```
Run the quality gates and report any failures:
npm run check; npm run format; npm test

For each failure, show the error and proposed fix.
```

### Check Specific File
```
Something seems wrong with [file]. Please:
1. Read the file
2. Check against coding standards
3. Look for obvious bugs
4. Report findings
```

### Validate Types
```
I think there's a type issue. Please:
1. Read src/types.ts
2. Read the implementation
3. Check if implementation matches interface
4. Report any mismatches
```

---

## Checklist Before Using This Prompt

- [ ] You can describe the symptoms
- [ ] You know which files are involved
- [ ] You've tried basic troubleshooting
- [ ] Error messages are captured
