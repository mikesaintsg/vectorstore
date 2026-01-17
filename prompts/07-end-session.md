# Prompt: End Session

> **When to use:** At the end of a working session, before closing the chat.

---

## Prompt Template

```
End session for [Project Name].

**Please:**

1. Run final quality gates: npm run check; npm run format; npm test
2. Update the phase file:
   - Check off completed items
   - Update Session Context
   - Add any notes
3. Update PLAN.md:
   - Update Current Session State
   - Add Session Log entry
4. Summarize:
   - What was completed
   - What's next
   - Any blockers or questions
5. List any files that should be committed

Do NOT start new work.
```

---

## Expected Model Behavior

The model should:

1. **Run** quality gates
2. **Update** phase file with diffs shown:
   ```diff
   - Current Deliverable: 2.1 EngineInterface
   + Current Deliverable: 2.2 Engine implementation
   ```
3. **Update** PLAN.md with diffs shown
4. **Summarize**:
   ```
   ## Session End Summary
   
   **Completed this session:**
   - ✅ Deliverable 2.1: EngineInterface (types defined)
   - ✅ Started Deliverable 2.2: Engine implementation
     - Implemented constructor
     - Implemented start/stop methods
   
   **Next session:**
   - Continue Deliverable 2.2
     - Implement createSession
     - Implement destroySession
     - Wire subscriptions
   
   **Blockers:** None
   
   **Files to commit:**
   - src/types.ts (modified)
   - src/core/engine/Engine.ts (created)
   - tests/core/engine/Engine.test.ts (created)
   - phases/02-core-api.md (updated)
   - PLAN.md (updated)
   
   Quality gates: ✅ All passing
   ```

5. **Not** start any new work

---

## Quick End Session

For a fast session end:

```
End session. Update all tracking files and summarize.
```

---

## Variations

### End with Uncommitted Work
```
End session. There's uncommitted work:
- [Description of incomplete work]

Please:
1. Add appropriate TODO comments
2. Update tracking to show in-progress state
3. Document what to pick up next
```

### End with Blocker
```
End session. We're blocked on:
- [Blocker description]

Please:
1. Add to Blocked By section in phase file
2. Update tracking
3. Note the blocker in Session Log
```

### End Phase
```
End session AND complete Phase [X].
Follow both the session end and phase completion procedures.
```

### Emergency End
```
End session immediately.
Just update Current Session State in PLAN.md with:
- Last Action: [what was happening]
- Next Action: [what to continue]
- Blockers: [any issues]

Skip detailed updates.
```

---

## Session Log Entry Format

The model should add to PLAN.md Session Log:

```markdown
### [YYYY-MM-DD] Session [N]

**Started:** Phase 2, Deliverable 2.1
**Completed:**
- Defined EngineInterface in types.ts
- Defined EngineOptions and EngineState
- Created Engine class skeleton
- Implemented constructor

**In Progress:**
- Deliverable 2.2 — Engine implementation (60% complete)

**Blockers Discovered:**
- None

**Ended:** Phase 2, Deliverable 2.2 — in progress
```

---

## Current Session State Format

The model should update in PLAN.md:

```markdown
### Current Session State

```
Phase: 2 of 4 (Core API)
Active Deliverable: 2.2 Engine implementation
Checklist Progress: 3/7 items complete
Last Action: Implemented Engine constructor and start/stop
Next Action: Implement createSession method
```
```

---

## Post-Session Checklist

After the model completes session end:

- [ ] Quality gates passing
- [ ] PLAN.md Current Session State updated
- [ ] PLAN.md Session Log entry added
- [ ] Phase file checklists accurate
- [ ] All files listed for commit
- [ ] No work in progress without TODO
- [ ] Clear on what to do next session

---

## Starting Next Session

When you return, use the continue prompt:

```
Continuing work on [Project Name].
Read PLAN.md and the active phase file, confirm status, then proceed.
```

The model will read the updated tracking and know exactly where to resume.
