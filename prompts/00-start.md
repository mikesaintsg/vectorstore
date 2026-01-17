# Prompt: Start New Project

> **When to use:** At the beginning of a new project, before any code exists.

---

## Prompt Template

```
I'm starting a new TypeScript project: [Project Name]

## Project Overview

**What it does:** [One sentence describing the core functionality]
**Why it matters:** [One sentence describing the value/purpose]
**Environment:** [browser / node / isomorphic]
**Type:** [library / application / cli]

## Initial Scope

The MVP should include:
- [Feature 1]
- [Feature 2]
- [Feature 3]

## Non-Goals (for now)

- [Not building X]
- [Not building Y]

## Known Constraints

- [Constraint 1, e.g., must work offline]
- [Constraint 2, e.g., no external dependencies]

---

**Please:**

1. Read `.github/copilot-instructions.md` to understand my coding standards
2. Create `PLAN.md` following the template in `templates/PLAN.md`
3. Create `phases/01-foundation.md` following `templates/PHASES.md`
4. Propose an initial architecture diagram
5. Identify the key interfaces that should go in `src/types.ts`

Do NOT write any implementation code yet. Focus on planning only.
```

---

## Expected Model Behavior

The model should:

1. **Read** the copilot-instructions.md thoroughly
2. **Create** PLAN.md with:
   - Quick Context filled in
   - Current Session State initialized
   - Vision statement
   - Non-goals from your input
   - Architecture diagram
   - Phase table with at least Foundation and Core API phases
   - Type Inventory with initial interfaces
3. **Create** phases/01-foundation.md with:
   - Session Context initialized
   - Deliverables for types, project structure, tooling
   - Implementation checklist
4. **Propose** architecture with components and interfaces
5. **NOT** write any implementation code

---

## Follow-Up Prompts

After the model creates the plan:

### Approve and Continue
```
The plan looks good. Please proceed with Phase 1, Deliverable 1.1.
```

### Request Changes
```
Before we proceed:
- [Requested change 1]
- [Requested change 2]

Please update the plan accordingly.
```

### Add to Non-Goals
```
Add these to non-goals:
- [Non-goal X]
- [Non-goal Y]

Then proceed with Phase 1.
```

---

## Checklist Before Using This Prompt

- [ ] `.github/copilot-instructions.md` exists in the repo
- [ ] `templates/PLAN.md` exists
- [ ] `templates/PHASES.md` exists
- [ ] You have a clear idea of MVP scope
- [ ] You know the environment (browser/node/isomorphic)
