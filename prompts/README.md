# Prompts

> **Purpose:** Structured prompts for AI-assisted development across the @mikesaintsg TypeScript ecosystem.

These prompts work with the [templates](../templates/), [guides](../guides/), and [types](../types/) in this repository to enable consistent, trackable development across multiple sessions.

---

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         PROJECT LIFECYCLE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌───────────────────────────────────────────┐  │
│  │  START   │───▶│              PHASE LOOP                   │  │
│  │ (00)     │    │                                           │  │
│  └──────────┘    │  ┌─────────┐  ┌───────────┐  ┌─────────┐  │  │
│                  │  │IMPLEMENT│  │  REFACTOR │  │ ANALYZE │  │  │
│                  │  │  (02)   │◀▶│   (03)    │◀▶│  (04)   │  │  │
│                  │  └────┬────┘  └───────────┘  └─────────┘  │  │
│                  │       │                                    │  │
│                  │       ▼                                    │  │
│                  │  ┌─────────┐       ┌─────────┐             │  │
│                  │  │  DEBUG  │       │COMPLETE │             │  │
│                  │  │  (06)   │       │ PHASE   │             │  │
│                  │  └─────────┘       │  (05)   │             │  │
│                  │                    └────┬────┘             │  │
│                  └─────────────────────────┼─────────────────┘  │
│                                            │                     │
│  ┌──────────┐    ┌──────────┐              │                     │
│  │ CONTINUE │◀───│   END    │◀─────────────┘                     │
│  │  (01)    │    │ SESSION  │                                    │
│  └──────────┘    │  (07)    │                                    │
│                  └──────────┘                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prompt Files

| #  | File                   | When to Use                              |
|----|------------------------|------------------------------------------|
| 00 | `00-start.md`          | Beginning a new project                  |
| 01 | `01-continue.md`       | Resuming after a break or new chat       |
| 02 | `02-implement.md`      | Working on a specific deliverable        |
| 03 | `03-refactor.md`       | Improving code without changing behavior |
| 04 | `04-analyze.md`        | Understanding code or finding issues     |
| 05 | `05-complete-phase.md` | Finishing a phase and starting the next  |
| 06 | `06-debug.md`          | Something isn't working                  |
| 07 | `07-end-session.md`    | Stopping work and saving state           |

---

## Session Pattern

### Typical Session Flow

```
1. START or CONTINUE
   ↓
2. IMPLEMENT (one or more deliverables)
   ↓
   [REFACTOR, ANALYZE, DEBUG as needed]
   ↓
3. END SESSION
```

### Multi-Session Project

```
Session 1:
  START → IMPLEMENT 1.1 → IMPLEMENT 1.2 → END SESSION

Session 2:
  CONTINUE → IMPLEMENT 1.3 → COMPLETE PHASE 1 → END SESSION

Session 3:
  CONTINUE → IMPLEMENT 2.1 → DEBUG → IMPLEMENT 2.1 → END SESSION

...

Session N:
  CONTINUE → IMPLEMENT 4.3 → COMPLETE PHASE 4 → PROJECT COMPLETE
```

---

## Key Principles

### 1. Always Orient First

Never jump into coding. Every session should start with:
- Reading PLAN.md
- Reading the active phase file
- Confirming current state

### 2. Track Everything

The tracking system enables context preservation across sessions:
- **PLAN.md Current Session State**: Quick snapshot for orientation
- **PLAN.md Session Log**: History of all sessions
- **Phase file Session Context**: Per-phase quick orientation
- **Phase file checklists**: Granular progress tracking

### 3. Quality Gates Always

Run quality gates:
- After each deliverable
- Before ending a session
- Before completing a phase

```powershell
npm run check; npm run format; npm test
```

### 4. Propose Before Implementing

For significant changes, the model should:
1. Read context
2. Propose approach
3. Wait for approval
4. Implement
5. Verify

### 5. Update Before Leaving

Never end a session without:
- Updating Current Session State
- Adding a Session Log entry
- Listing files to commit

---

## Cross-Reference

| Document                          | Purpose                              |
|-----------------------------------|--------------------------------------|
| `.github/copilot-instructions.md` | Coding standards (operational)       |
| `PLAN.md`                         | Project overview (strategic)         |
| `phases/*.md`                     | Phase details (tactical)             |
| `prompts/*.md`                    | Workflow prompts (procedural)        |

### Using with @mikesaintsg/guides

When working on an implementation repo, reference the guides repo:

```powershell
# Read the types first
code ../guides/types/[package]/types.ts

# Reference the API guide during implementation
code ../guides/guides/[package].md

# Use the coding standards
code ../guides/.github/copilot-instructions.md
```

---

## Quick Reference

### Starting a New Project
```
Use 00-start.md template
```

### Resuming Work
```
Continuing work on [Project].
Read PLAN.md and the active phase file, confirm status, then proceed.
```

### Implementing
```
Implement deliverable [X.Y]: [Name]
```

### Ending Work
```
End session. Update all tracking files and summarize.
```

---

## Customizing Prompts

These prompts are templates. Customize them for your specific:
- Project domain
- Team conventions
- Tool preferences
- Communication style

The key elements to preserve:
- Reading context before acting
- Proposing before implementing
- Tracking progress explicitly
- Updating state before leaving
