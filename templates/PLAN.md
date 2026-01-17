# Project Plan: [Project Name]

> **Status:** Phase [X] of [Y] — [Phase Name]
> **Last Updated:** [YYYY-MM-DD]
> **Next Milestone:** [Description]

---

## Quick Context

> **Purpose:** This section helps models quickly orient when starting a new session.

| Field              | Value                                         |
|--------------------|-----------------------------------------------|
| **Package name**   | `@scope/package-name`                         |
| **Environment**    | `browser` / `node` / `isomorphic`             |
| **Type**           | `library` / `application` / `cli`             |
| **Sandbox folder** | `docs/` / `game/` / `examples/` / `showcase/` |

### Current Session State

```
Phase: [X] of [Y] ([Phase Name])
Active Deliverable: [X.Y] [Deliverable Name]
Checklist Progress: [N]/[M] items complete
Last Action: [Brief description of last completed task]
Next Action: [Brief description of next task]
```

> **Instructions:** Update this section at the END of each session with the model.

---

## Vision

[One paragraph describing what this project does and why it matters. Not how—just what and why.]

---

## Non-Goals

Explicit boundaries. What we are NOT building:

- ❌ [Not building X]
- ❌ [Not building Y]
- ❌ [Not building Z]

---

## Success Criteria

How we know the project is complete:

- [ ] [Criterion 1 — measurable outcome]
- [ ] [Criterion 2 — measurable outcome]
- [ ] [Criterion 3 — measurable outcome]

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  [Layer 1]  │────▶│  [Layer 2]  │────▶│  [Layer 3]  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌─────────┐   ┌─────────┐
              │[Comp A] │   │[Comp B] │
              └─────────┘   └─────────┘
```

### Components

| Component     | Purpose         | Location             |
|---------------|-----------------|----------------------|
| [Component A] | [Brief purpose] | `src/core/[domain]/` |
| [Component B] | [Brief purpose] | `src/core/[domain]/` |

### Key Interfaces

| Interface             | Purpose                          | Depends On                  |
|-----------------------|----------------------------------|-----------------------------|
| [InterfaceA]Interface | [Brief purpose]                  | —                           |
| [InterfaceB]Interface | [Brief purpose]                  | [InterfaceA]Interface       |

---

## Phases

| # | Phase       | Status    | Description                       | File                       |
|---|-------------|-----------|-----------------------------------|----------------------------|
| 1 | Foundation  | ⏳ Pending | Types, project structure, tooling | `phases/01-foundation.md`  |
| 2 | Core API    | ⏳ Pending | [Core functionality]              | `phases/02-core-api.md`    |
| 3 | Integration | ⏳ Pending | [Integration features]            | `phases/03-integration.md` |
| 4 | Polish      | ⏳ Pending | Docs, examples, edge cases        | `phases/04-polish.md`      |

**Status Legend:**
- ✅ Complete
- 🔄 Active
- ⏳ Pending

---

## Type Inventory

> **Purpose:** Track all public types. Update when adding interfaces to `src/types.ts`.

| Type Name                | Category      | Status    | Phase |
|--------------------------|---------------|-----------|-------|
| [InterfaceName]Interface | Behavioral    | ⏳ Pending | 1     |
| [OptionsName]Options     | Options       | ⏳ Pending | 1     |
| [DataName]               | Data          | ⏳ Pending | 1     |

**Categories:**
- **Behavioral** — Interfaces with methods (use `Interface` suffix)
- **Options** — Configuration objects (use `Options` suffix)
- **Data** — Pure data structures (no suffix)
- **Subscriptions** — Event subscription interfaces (use `Subscriptions` suffix)
- **State** — Readonly state snapshots (use `State` suffix)

---

## Decisions Log

> **Instructions:** Log architectural decisions here. Never remove entries.

### [YYYY-MM-DD]: [Decision Title]
**Decision:** [What was decided]
**Rationale:** [Why this approach was chosen]
**Alternatives rejected:** [What was considered but not chosen]
**Impacts:** [Which phases/deliverables this affects]

---

## Open Questions

> **Instructions:** Add questions during work. Resolve with decisions or remove when answered.

- [ ] [Question 1]
- [ ] [Question 2]
- [ ] [Question 3]

---

## Session Log

> **Purpose:** Track work across multiple sessions. Append new entries at the top.

### [YYYY-MM-DD] Session [N]

**Started:** Phase [X], Deliverable [X.Y]
**Completed:**
- [Task 1]
- [Task 2]

**Blockers Discovered:**
- [Blocker 1] → Added to Phase [X] blockers

**Ended:** Phase [X], Deliverable [X.Y] — [status]

---

## References

- [Reference 1](URL)
- [Reference 2](URL)
