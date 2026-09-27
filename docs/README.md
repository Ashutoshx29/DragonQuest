# DragonQuest Documentation Index

Welcome to the DragonQuest engineering and architecture documentation hub. This index provides a roadmap for developers, contributors, and AI assistants navigating the codebase.

---

## 1. Primary Documentation Directory

| Document | Primary Audience | Description |
| :--- | :--- | :--- |
| **[Architecture Guide](ARCHITECTURE.md)** | Developers, Architects | Complete system topology, offline-first data model, deterministic game engines, timer state machine, and cloud sync protocol. |
| **[Handover Dossier](DRAGONQUEST-HANDOVER.md)** | New Maintainers, Onboarding Engineers | Exhaustive 28-section technical briefing covering design decisions, ADRs, screen walkthroughs, and subsystem implementation details. |
| **[Contributing Guide](../CONTRIBUTING.md)** | Contributors, Open Source | Local setup instructions, 5-gate verification suite, ground rules, and PR guidelines. |
| **[Security Policy](../SECURITY.md)** | Security Researchers, Developers | Security architecture, client secret safety, Row Level Security (RLS) enforcement, and responsible disclosure. |
| **[Agent Workflow Rules](../AGENTS.md)** | AI Agents, Pair Programmers | Mandatory engineering workflow, verification commands, and non-negotiable coding invariants. |
| **[AI Skills Ecosystem](../CLAUDE.md)** | AI Assistants, Tooling | Guidance for AI agent tools, specialized skills orchestration, and prompt standards. |

---

## 2. QA, Audits & Engineering Gates

| Document | Purpose |
| :--- | :--- |
| **[Bug Backlog](../BUG-BACKLOG.md)** | Ranked ledger of open and resolved issues across Auth, Sync, Game Engine, Timer, and UI subsystems. |
| **[Pre-Run Readiness](../PRE-RUN-READINESS.md)** | Pre-run verification gate record documenting verified fixes, test outcomes, and residual risks before release. |
| **[Overengineering Review](../OVERENGINEERING-REVIEW.md)** | Code simplification and architectural discipline audit identifying essential patterns and pruning speculative bloat. |

---

## 3. Quick Navigation by Task

### "I want to understand how the app works without the cloud"
- Read [ARCHITECTURE.md §3 (Offline-First Architecture)](ARCHITECTURE.md#3-offline-first-local-authoritative-data-model).
- Read [DRAGONQUEST-HANDOVER.md §3 (Architecture: Offline-First & Local-Authoritative)](DRAGONQUEST-HANDOVER.md#3-architecture-offline-first--local-authoritative-model).

### "I want to see the database schema and migrations"
- Inspect schema definitions in [`src/data/db/schema.ts`](../src/data/db/schema.ts).
- Inspect migrations in [`src/data/db/drizzle/`](../src/data/db/drizzle/).
- Read [ARCHITECTURE.md §5 (Local Database & Drizzle ORM)](ARCHITECTURE.md#5-local-database--drizzle-orm).

### "I want to understand the Focus Timer and wall-clock drift"
- Read [DRAGONQUEST-HANDOVER.md §8 (The Timer Subsystem)](DRAGONQUEST-HANDOVER.md#8-the-timer-subsystem-deep-specification).
- Inspect [`src/game/engine/timer.ts`](../src/game/engine/timer.ts) and [`src/features/training/components/TrainingSessionModal.tsx`](../src/features/training/components/TrainingSessionModal.tsx).

### "I want to see how cloud synchronization works with Supabase"
- Read [ARCHITECTURE.md §7 (Cloud Synchronization & Supabase)](ARCHITECTURE.md#7-cloud-synchronization--supabase).
- Inspect [`src/services/sync/syncService.ts`](../src/services/sync/syncService.ts), [`src/services/sync/syncEngine.ts`](../src/services/sync/syncEngine.ts), and [`src/services/sync/rowMapping.ts`](../src/services/sync/rowMapping.ts).

### "I want to run the automated tests"
- Follow [CONTRIBUTING.md §4 (Local Quality Gates)](../CONTRIBUTING.md#4-local-quality-gates-the-5-gate-suite).
