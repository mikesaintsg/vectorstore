# Prompt: Continue Session

> **When to use:** When resuming work after a break, new chat, or context reset.

---

## Prompt Template

```
Continuing work on [Project Name].

**Please:**

1. Read `.github/copilot-instructions.md` for coding standards
2. Read `PLAN.md` — focus on "Current Session State" and "Session Log"
3. Read the active phase file (check the Phases table in PLAN.md)
4. Summarize current status:
   - Which phase are we in?
   - Which deliverable is active?
   - What was the last completed task?
   - What is the next task?
5. Propose how to proceed

Do NOT start coding until you've confirmed the current state with me.
```

---

## Expected Model Behavior

The model should:

1. **Read** all required files
2. **Summarize** in this format:
   ```
   Current status:
   - Phase: [X] of [Y] ([Phase Name])
   - Active deliverable: [X.Y] [Deliverable Name]
   - Checklist progress: [N]/[M] items complete
   - Last completed: [Task description]
   - Next task: [Task description]
   
   Ready to proceed with [next task]. My approach:
   1. [Step 1]
   2. [Step 2]
   3. [Step 3]
   
   Files affected:
   - [file1.ts] (create/modify)
   - [file2.ts] (modify)
   
   Should I proceed?
   ```
3. **Wait** for confirmation before coding

---

## Follow-Up Prompts

### Confirm and Proceed
```
Correct. Please proceed.
```

### Correct the State
```
Actually, we completed [X.Y] last session. The next deliverable is [X.Z].
Please re-read the phase file and proceed with [X.Z].
```

### Check Quality Gates First
```
Before continuing, please run the quality gates:
npm run check; npm run format; npm test

Report any failures before proceeding.
```

### Review Before Continuing
```
Before we continue, please show me:
1. The current state of src/types.ts
2. Any TODO comments in the codebase
3. Any it.todo() in tests

Then we'll decide how to proceed.
```

---

## Quick Resume (Short Form)

If you're confident about the state:

```
Continuing [Project Name]. Resume from where we left off.
Read PLAN.md and the active phase file, confirm status, then proceed.
```

---

## Context Recovery (When Lost)

If the model seems confused:

```
Let's reset context. Please:

1. Read PLAN.md completely
2. Read phases/[XX]-[name].md (the active phase)
3. Read src/types.ts to see what interfaces exist
4. Read src/factories.ts to see what's implemented

Then tell me:
- What exists (implemented and tested)
- What's in progress (partially done)
- What's next (not started)
```

---

## Checklist Before Using This Prompt

- [ ] PLAN.md exists with Current Session State section
- [ ] Active phase file exists
- [ ] You remember approximately where you left off
- [ ] (Optional) You've reviewed recent git commits
