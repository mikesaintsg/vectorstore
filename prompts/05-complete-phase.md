# Prompt: Complete Phase

> **When to use:** When finishing a phase and transitioning to the next one.

---

## Prompt Template

```
Complete Phase [X]: [Phase Name]

**Please:**

1. Read the phase file (phases/[XX]-[name].md)
2. Verify all deliverables are marked ✅ Done
3. Run all quality gates
4. Check for any remaining it.todo() in tests
5. Review the Files Created/Modified section
6. Update PLAN.md:
   - Mark Phase [X] as ✅ Complete
   - Update Current Session State
   - Add Session Log entry
7. Create phases/[X+1]-[name].md for next phase
8. Report completion summary

Do NOT proceed to Phase [X+1] implementation until I confirm.
```

---

## Expected Model Behavior

The model should:

1. **Verify** phase completion:
   ```
   Phase [X] Completion Checklist:
   
   Deliverables:
   - [X].1 [Name] — ✅ Done
   - [X].2 [Name] — ✅ Done
   - [X].3 [Name] — ✅ Done
   
   Quality Gates:
   - npm run check — ✅ Pass
   - npm run format — ✅ Pass
   - npm run build — ✅ Pass
   - npm test — ✅ Pass (X tests, Y% coverage)
   
   Tests:
   - it.todo() remaining: 0
   
   Files Created/Modified:
   - [file1.ts] — reviewed
   - [file2.ts] — reviewed
   ```

2. **Update** PLAN.md with changes shown
3. **Create** next phase file from template
4. **Report** summary:
   ```
   Phase [X] Complete!
   
   Summary:
   - [N] deliverables completed
   - [N] tests added
   - [N] types defined
   
   Next Phase: [X+1] [Name]
   First Deliverable: [X+1].1 [Name]
   
   Ready to proceed to Phase [X+1]?
   ```

---

## Phase Transition Prompts

### Approve and Start Next Phase
```
Phase [X] looks complete. Proceed to Phase [X+1], Deliverable [X+1].1.
```

### Fix Before Completing
```
Before completing Phase [X]:
- [Issue 1 to fix]
- [Issue 2 to fix]

Fix these, then complete the phase.
```

### Skip to Specific Deliverable
```
Phase [X] complete. For Phase [X+1], start with deliverable [X+1].Y instead of [X+1].1.
Reason: [why]
```

### Add Retrospective Note
```
Before moving to Phase [X+1], add this note to the Decisions Log in PLAN.md:

### [Date]: [Decision about Phase X]
**Decision:** [What we learned/decided]
**Rationale:** [Why]
**Impacts:** [What this affects going forward]
```

---

## Pre-Completion Checks

### Verify Test Coverage
```
Before completing Phase [X], show me:
1. Test coverage for all new code
2. Any untested public methods
3. Any edge cases not covered

We need adequate coverage before moving on.
```

### Verify Documentation
```
Before completing Phase [X], verify documentation:
1. All public interfaces have TSDoc
2. All factory functions have TSDoc
3. README.md updated (if applicable)
4. No TODO comments for documentation

Report status.
```

### Verify Exports
```
Before completing Phase [X], verify exports:
1. All new public types exported from src/index.ts
2. All new factory functions exported
3. No accidental internal exports

Show the current barrel export structure.
```

---

## Post-Completion

### Start Next Phase Immediately
```
Phase [X] complete. Begin Phase [X+1], Deliverable [X+1].1.

Read the new phase file and propose your approach.
```

### Take a Break
```
Phase [X] complete. We'll continue with Phase [X+1] in the next session.

Please update PLAN.md Current Session State to reflect:
- Last Action: Completed Phase [X]
- Next Action: Start Phase [X+1], Deliverable [X+1].1
```

### Project Review
```
Phase [X] complete. Before continuing, let's review:

1. Read PLAN.md and show overall project status
2. How many phases remain?
3. Any scope changes needed?
4. Any decisions to document?

Then we'll decide next steps.
```

---

## Handling Incomplete Phases

### Almost Complete
```
Phase [X] is almost complete but:
- [Deliverable Y] is blocked by [reason]
- [Deliverable Z] needs [something]

Should we:
A) Complete what's blocking and finish properly
B) Move blockers to Phase [X+1] and proceed
C) Something else

Waiting for direction.
```

### Major Issues Found
```
During Phase [X] completion review, I found:
- [Critical issue 1]
- [Critical issue 2]

This blocks phase completion. Options:
A) Fix now before proceeding
B) Document as known issues and continue
C) Reassess scope

What would you like to do?
```

---

## Checklist Before Using This Prompt

- [ ] All deliverables implemented
- [ ] All tests written and passing
- [ ] Quality gates run recently
- [ ] Phase file checklist reviewed
- [ ] Ready to define next phase scope
