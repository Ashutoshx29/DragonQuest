# DRAGONQUEST — DEFINITIVE PROJECT HANDOVER DOSSIER

> **Single Source of Truth & Engineering Onboarding Dossier**  
> **Repository:** `DragonQuest` · **Development Host:** Windows 11 · **Date of Handover:** September 2026  
> **Current Git HEAD:** Commit `2ae77f0` on branch `main` (with active working tree hardening diffs)  
> **Application Version:** `0.1.0` · **Framework:** Expo SDK 57 (Managed) / React Native 0.86.3 / React 19.2.3  

---

## ⚠️ CRITICAL TRADEMARK NOTICE (MUST READ FIRST)

> [!WARNING]
> **MANDATORY APP RENAMING BEFORE PUBLIC STORE RELEASE:**  
> The working title **"DragonQuest"** is an internal engineering placeholder. It has an unavoidable, fatal trademark conflict with Square Enix’s globally registered *Dragon Quest* video game franchise. **The application MUST be renamed before public release to Google Play or Apple App Store.**  
> 
> **Architectural Safeguard:**  
> All branding strings and public app display names have been isolated in:
> - [`src/constants/index.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/constants/index.ts) (`APP_NAME = 'DragonQuest'`)
> - [`app.json`](file:///c:/Users/ashut/Documents/DragonQuest/app.json) (`expo.name`, `expo.slug`, `expo.scheme`)
> - [`src/design-system/tokens.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/design-system/tokens.ts) (Visual tokens and glossary)
>
> Rebranding the app requires zero refactoring of underlying SQLite databases, tables, game engines, repositories, or sync protocols.

---

## Table of Contents

1. [Executive Summary & Product Vision](#1-executive-summary--product-vision)
2. [Technology Stack & Dependency Matrix](#2-technology-stack--dependency-matrix)
3. [Architecture: Offline-First & Local-Authoritative Model](#3-architecture-offline-first--local-authoritative-model)
4. [Repository Structure & Codebase Map](#4-repository-structure--codebase-map)
5. [Navigation Architecture (Expo Router)](#5-navigation-architecture-expo-router)
6. [Core Product & Screen-by-Screen Walkthrough](#6-core-product--screen-by-screen-walkthrough)
7. [The Training Subsystem (Dojo Architecture)](#7-the-training-subsystem-dojo-architecture)
8. [The Timer Subsystem (Deep Specification)](#8-the-timer-subsystem-deep-specification)
9. [Physical Training & Workout Logging (Navigation Trap Solution)](#9-physical-training--workout-logging-navigation-trap-solution)
10. [Game Engine & Deterministic RPG Progression](#10-game-engine--deterministic-rpg-progression)
11. [Local Data Architecture (SQLite + Drizzle ORM)](#11-local-data-architecture-sqlite--drizzle-orm)
12. [Cloud Synchronization & Supabase Architecture](#12-cloud-synchronization--supabase-architecture)
13. [Authentication & Session Lifecycle](#13-authentication--session-lifecycle)
14. [Design System & Theming Tokens](#14-design-system--theming-tokens)
15. [Animation & Performance Engineering (Reanimated 4)](#15-animation--performance-engineering-reanimated-4)
16. [Audio & Haptics Feedback Services](#16-audio--haptics-feedback-services)
17. [Developer Telemetry & Leveled Logging](#17-developer-telemetry--leveled-logging)
18. [Automated Testing Strategy & Verification Gates](#18-automated-testing-strategy--verification-gates)
19. [Build, Export & Execution Commands](#19-build-export--execution-commands)
20. [Environment Configuration Reference](#20-environment-configuration-reference)
21. [Current Working Tree & Git Status](#21-current-working-tree--git-status)
22. [Project Phase & Roadmap History](#22-project-phase--roadmap-history)
23. [Known Bug Backlog & Residual Risks](#23-known-bug-backlog--residual-risks)
24. [Technical Debt & Code Gardening Items](#24-technical-debt--code-gardening-items)
25. [Non-Negotiable Architectural Invariants](#25-non-negotiable-architectural-invariants)
26. [Future Development & Engineering Protocol](#26-future-development--engineering-protocol)
27. [Architectural Decision Records (ADRs)](#27-architectural-decision-records-adrs)
28. [New Engineer Onboarding Checklist](#28-new-engineer-onboarding-checklist)

---

## 1. Executive Summary & Product Vision

### 1.1 What is DragonQuest?
DragonQuest is an offline-first, gamified personal growth and daily training companion built for mobile (iOS & Android). It transforms standard productivity tracking (habits, tasks, routines, fitness, meditation, journaling) into an immersive training-arc RPG.

Users do not just "complete to-dos" — they train an avatar whose character stats (**Power**, **Focus**, **Discipline**, **Mind**, **Energy**) dynamically grow from proof-of-effort ledgers:
- Physical workouts feed **Power**.
- Timed focus sessions and deep-work objectives feed **Focus**.
- Daily habit consistency and mission streaks feed **Discipline**.
- Guided mind training (meditation) and reflective daily journaling feed **Mind**.
- Recovery breathing exercises and morning/evening rituals feed **Energy**.

### 1.2 Core Architectural Identity
- **Offline-First / Local-Authoritative:** The device's local SQLite database is the undisputed, single source of truth for the active session. All writes, progress queries, leveling math, and streaks are computed locally and instantly. The UI never awaits network round-trips to update state.
- **Derived Progression:** Totals, levels, attribute scores, and active streaks are never mutated as raw numbers. They are pure, deterministic functions of append-only ledgers (`xp_transactions`, `daily_completions`, `training_sessions`).
- **Cloud-Mirrored via Supabase:** An optional cloud synchronization engine mirrors local SQLite rows to PostgreSQL running on Supabase. Synchronization is asynchronous, idempotent, and non-blocking. If cloud credentials are missing or the device is offline, the app operates with 100% feature completeness locally.

---

## 2. Technology Stack & Dependency Matrix

All versions are extracted directly from [`package.json`](file:///c:/Users/ashut/Documents/DragonQuest/package.json) and verified against installed modules:

| Subsystem | Technology | Version | Architectural Role |
| :--- | :--- | :--- | :--- |
| **Runtime / Core** | React | `19.2.3` | UI library |
| | React Native | `0.86.3` | Mobile foundation |
| | React DOM / Web | `19.2.3` / `0.21.0` | Web export support |
| **Framework** | Expo SDK | `~57.0.25` | Managed workflow with Continuous Native Generation (CNG) |
| **Language** | TypeScript | `~6.0.3` | Strict type checking (`strict: true`, path aliases `@/*`) |
| **Navigation** | Expo Router | `~57.0.23` | File-based routing; utilizes `js-stack` and `js-tabs` |
| **Local Database** | Expo SQLite | `~57.0.3` | Synchronous SQLite driver (`openDatabaseSync`) |
| | Drizzle ORM | `^0.45.3` | Type-safe schema definition and querying |
| | Drizzle Kit | `^0.31.11` | Schema migration generator (driver: `expo`) |
| **Cloud & Backend** | Supabase JS Client | `^2.117.2` | Cloud Postgres, Auth, and Storage interop |
| | Postgres / PostgREST | Remote | Remote cloud store with strict Row Level Security (RLS) |
| **Animation** | React Native Reanimated | `4.5.1` | Native thread UI animations, shared values, and gestures |
| | React Native Worklets | `0.10.1` | Background thread worklet execution |
| **Device & Primitives** | Expo Haptics | `~57.0.3` | Semantic tactile feedback |
| | Expo Crypto | `~57.0.3` | Native UUID generation (`randomUUID()`) |
| | Expo Linear Gradient | `~57.0.2` | Hero background gradients |
| | Expo Safe Area Context | `~5.7.0` | Safe area inset management |
| | Expo Screens | `~4.26.0` | Native view hierarchy container |
| | Expo Splash Screen | `~57.0.9` | Startup splash orchestration |
| | Expo Vector Icons | `^15.0.2` | Ionicons glyph icon set |
| **Build & Tooling** | Babel Plugin Inline Import | `^3.0.0` | Inlines `.sql` migration files into the JS bundle |
| | Metro Bundler | Built-in | Metro bundler with `.wasm` and `.sql` asset extensions |
| | ESLint / Prettier | `^9.39.2` / `^3.7.4` | Flat configuration linting and formatting |
| | Jest / Jest-Expo | `~29.7.0` / `~57.0.5` | Unit and engine test runners |

---

## 3. Architecture: Offline-First & Local-Authoritative Model

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                              │
│  src/app (Thin Routes)  +  src/design-system (Tokens, Atoms, Overlays)  │
└────────────────────────────────────▲───────────────────────────────────┘
                                     │ Hooks & Observers
┌────────────────────────────────────▼───────────────────────────────────┐
│                        APPLICATION LAYER                               │
│  src/features/* (Domain Workflows, Auth Context, Progression Provider)  │
│  src/services/* (Audio, Haptics, Logger, DevPerf, Sync Triggers)       │
└────────────────────────────────────▲───────────────────────────────────┘
                                     │ Pure Invocations
┌────────────────────────────────────▼───────────────────────────────────┐
│                    DETERMINISTIC GAME ENGINES                          │
│  src/game/engine/* (Levels, XP, Streaks, Missions, Attributes, Timer)  │
│  src/game/config/* (Balancing Constants, Tiers, Achievements, Quests)  │
└────────────────────────────────────▲───────────────────────────────────┘
                                     │ Repository Interface
┌────────────────────────────────────▼───────────────────────────────────┐
│                         DATA LAYER                                     │
│  src/data/repositories/* (CRUD, Ledger Inserts, Atomic Transactions)   │
│  src/data/db/client.ts + schema.ts (expo-sqlite + drizzle-orm)          │
│  Local SQLite Database ("dragonquest.db") = SINGLE SOURCE OF TRUTH      │
└────────────────────────────────────▲───────────────────────────────────┘
                                     │ Background Mirroring
┌────────────────────────────────────▼───────────────────────────────────┐
│                    CLOUD SYNCHRONIZATION ENGINE                        │
│  src/services/sync/syncService.ts + syncEngine.ts + rowMapping.ts       │
│  Supabase Cloud Postgres (RLS Scoped: auth.uid() = user_id)            │
└────────────────────────────────────────────────────────────────────────┘
```

### Architectural Principles:
1. **Zero Network Wait in UI:** Screens interact exclusively with local repositories. Local queries read directly from SQLite on-device. Mutations commit to SQLite immediately.
2. **Ledger Immutability:** XP transactions, daily habit completions, training timer records, and mission claims are strictly append-only. Stats are aggregated on read. Uncompleting an item inserts an inverse correction row; records are never mutated or wiped.
3. **Pure Engine Isolation:** All game formulas (`computeTrainingXpPure`, `levelFromTotalXp`, `computeStreakFromDays`, `deriveTimerState`) are pure TypeScript functions with zero imports of React, SQLite, or network dependencies.
4. **Cloud Mirroring without Coupling:** The sync engine is an outbox/inbox pipeline. Pushes and pulls run in the background with exponential retry backoff. If Supabase is unreachable or unconfigured, the app operates silently and flawlessly.

---

## 4. Repository Structure & Codebase Map

```
DragonQuest/
├── .cursor/                         # IDE rules and contextual workflows
├── assets/                          # Static icon and splash graphic assets
├── docs/                            # Architectural design documents
│   ├── ARCHITECTURE.md              # Historical Phase 1 foundation spec
│   └── DRAGONQUEST-HANDOVER.md      # THIS DOCUMENT (Master Engineering Dossier)
├── scripts/                         # Build, migration, and verification scripts
│   └── sqlite-smoke.mjs             # In-memory node:sqlite constraint smoke test
├── src/
│   ├── app/                         # EXPO ROUTER ROUTE DEFINITIONS (Thin Screens)
│   │   ├── (auth)/                  # Auth modal routes
│   │   │   └── sign-in.tsx          # Sign-in and account creation screen
│   │   ├── (tabs)/                  # Main 5-tab application container
│   │   │   ├── _layout.tsx          # Bottom tab bar configuration (Ionicons)
│   │   │   ├── index.tsx            # Home Tab (Dashboard / Daily Training)
│   │   │   ├── training.tsx         # Training Tab (Dojo Center, Timers, Programs)
│   │   │   ├── journal.tsx          # Journal Tab (Daily Log, Mood/Energy, History)
│   │   │   ├── progress.tsx         # Progress Tab (Stats, Charts, Attributes)
│   │   │   └── profile.tsx          # Profile Tab (Character Sheet, Medals, Account)
│   │   ├── goal/                    # Goal dynamic routes
│   │   │   └── [id].tsx             # Goal detail & milestone management
│   │   ├── habit/                   # Habit dynamic routes
│   │   │   └── [id].tsx             # Habit detail & edit/archive screen
│   │   ├── routine/                 # Routine dynamic routes
│   │   │   └── [id].tsx             # Routine detail & item sequencer
│   │   ├── task/                    # Task dynamic routes
│   │   │   └── [id].tsx             # Task detail & completion editor
│   │   ├── _layout.tsx              # Root Stack Layout (Providers & Error Boundaries)
│   │   ├── +not-found.tsx           # 404 Fallback screen
│   │   ├── missions.tsx             # Full Mission Board screen (All Quests)
│   │   └── settings.tsx             # App Settings screen (Audio, Haptics, DevPerf)
│   ├── constants/                   # Application-wide constants & branding strings
│   ├── data/                        # DATA ACCESS LAYER
│   │   ├── content/                 # Static content (quotes, default seeds)
│   │   ├── db/                      # Database configuration & ORM
│   │   │   ├── client.ts            # expo-sqlite connection & migration runner
│   │   │   ├── DbGate.tsx           # Startup gate blocking UI until DB is ready
│   │   │   ├── schema.ts            # Drizzle schema (15 SQLite tables)
│   │   │   └── drizzle/             # Generated SQL migrations & bundle
│   │   │       ├── 0000_init.sql    # Base schema tables
│   │   │       ├── 0001_training_redesign.sql # Journal & training_sessions tables
│   │   │       ├── 0002_sync_cursors.sql      # Local sync cursor watermarks
│   │   │       └── migrations.js    # Drizzle Expo inlined JS migration bundle
│   │   └── repositories/            # Repository pattern implementations
│   │       ├── achievements.ts      # Unlocks, progress evaluation, atomic claims
│   │       ├── challenges.ts        # Multi-day challenge programs & runs
│   │       ├── globalStreak.ts      # App-wide training streak derivation
│   │       ├── goals.ts             # Grand quests & milestone operations
│   │       ├── habits.ts            # Habit definitions & completion toggles
│   │       ├── journal.ts           # Training log entries & atomic XP claims
│   │       ├── missions.ts          # Daily missions selection & claims
│   │       ├── progress.ts          # Aggregated dashboard metrics
│   │       ├── progression.ts       # Unified Progression Snapshot engine
│   │       ├── routines.ts          # Morning/Evening rituals & item ordering
│   │       ├── settings.ts          # Key-value persistent app settings
│   │       ├── tasks.ts             # One-off task creation & toggles
│   │       └── training.ts          # Training session logging & history queries
│   ├── design-system/               # ATOMIC DESIGN SYSTEM
│   │   ├── components/              # 25+ reusable UI components & primitives
│   │   ├── motion.ts                # Reanimated spring & timing presets
│   │   ├── theme.ts                 # Semantic color mappings
│   │   └── tokens.ts                # Primitive palette, typography, spacing scales
│   ├── features/                    # FEATURE LOGIC & STATE CONTAINERS
│   │   ├── auth/                    # AuthProvider & useSyncStatus hooks
│   │   ├── goals/                   # useGoals business logic hook
│   │   ├── habits/                  # useHabits, HabitCard, HabitForm
│   │   ├── journal/                 # useJournal, JournalEditor
│   │   ├── progression/             # ProgressionProvider, MissionCard, event buses
│   │   ├── routines/                # useRoutines, RoutineCard, RoutineForm
│   │   ├── tasks/                   # useTasks, TaskCard, TaskForm
│   │   └── training/                # TrainingSessionModal, WorkoutLogSheet
│   ├── game/                        # DETERMINISTIC GAME ENGINES & CONFIG
│   │   ├── config/                  # Economy rules, level curves, definitions
│   │   │   ├── achievements.ts      # 15 static achievement definitions
│   │   │   ├── attributes.ts        # Attribute definitions, tiers (E..S), source maps
│   │   │   ├── challenges.ts        # 7/14/30-day program definitions
│   │   │   ├── levels.ts            # Level curve formula, max level 100, rank titles
│   │   │   ├── missions.ts          # Daily mission pool definitions
│   │   │   ├── streaks.ts           # Streak tier thresholds & multipliers
│   │   │   ├── training.ts          # Training duration presets & XP rates
│   │   │   └── xp.ts                # Base XP & difficulty multipliers
│   │   └── engine/                  # Pure computational engines
│   │       ├── achievements.ts      # Evaluates unlocks from stats
│   │       ├── attributes.ts        # Computes attribute scores from ledger rows
│   │       ├── challenges.ts        # Computes day-by-day challenge progress
│   │       ├── missions.ts          # FNV-1a seeded daily mission rotation
│   │       ├── progression.ts       # Core XP balance & level resolution
│   │       ├── sessionHistory.ts    # Groups raw sessions into readable summaries
│   │       ├── streaks.ts           # Consecutive calendar-day streak algorithm
│   │       ├── timer.ts             # Wall-clock timestamp timer derivations
│   │       └── workout.ts           # Input detection & draft validation
│   ├── hooks/                       # Shared utility hooks (useAsync)
│   ├── lib/                         # Low-level utilities
│   │   ├── dates.ts                 # Local calendar date calculations (YYYY-MM-DD)
│   │   ├── id.ts                    # Native UUID generator wrapper
│   │   ├── schedule.ts              # Habit frequency parsing
│   │   └── supabase.ts              # Lazy Supabase client with localStorage auth
│   └── services/                    # CROSS-CUTTING SERVICES
│       ├── audio.ts                 # Semantic sound effects service
│       ├── devPerf.tsx              # __DEV__ FPS profiling badge
│       ├── haptics.ts               # Semantic tactile feedback service
│       ├── logger.ts                # Structured leveled logging & secret redaction
│       └── sync/                    # Cloud synchronization subsystem
│           ├── rowMapping.ts        # Drizzle TS key <-> Cloud SQL column mapper
│           ├── syncEngine.ts        # Pure merge planner (LWW & Union)
│           ├── syncService.ts       # Sync execution against SQLite & Supabase
│           └── syncTriggers.ts      # AppState, mutation, and retry triggers
├── supabase/                        # SUPABASE INFRASTRUCTURE
│   └── migrations/
│       └── 0001_init.sql            # Cloud Postgres schema, triggers & RLS policies
├── app.json                         # Expo configuration manifest
├── babel.config.js                  # Babel configuration with SQL inline plugin
├── drizzle.config.ts                # Drizzle kit generator configuration
├── eslint.config.js                 # Flat ESLint configuration
├── jest.config.js                   # Jest test configuration with transform ignores
├── metro.config.js                  # Metro bundler config (.wasm & .sql support)
├── package.json                     # Dependency manifests & project scripts
└── tsconfig.json                    # Strict TypeScript configuration
```

---

## 5. Navigation Architecture (Expo Router)

The application uses **Expo Router v57** with file-based routing. Navigators use JavaScript-based stacks (`expo-router/js-stack`) and tabs (`expo-router/js-tabs`) to ensure flawless cross-platform rendering and avoid native fragment crashes on certain Android devices.

```
                              ┌────────────────────────┐
                              │      ROOT LAYOUT       │
                              │   src/app/_layout.tsx  │
                              └───────────┬────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
      ┌───────────────────────┐                       ┌───────────────────────┐
      │      (TABS) SHELL     │                       │     STACK SCREENS     │
      │src/app/(tabs)/_layout │                       │  (Modals / Sub-pages) │
      └───────────┬───────────┘                       └───────────┬───────────┘
                  │                                               │
  ┌──────────┬────┴─────┬───────────┬───────────┐                 ├─ (auth)/sign-in.tsx
  ▼          ▼          ▼           ▼           ▼                 ├─ settings.tsx
Index    Training    Journal    Progress     Profile              ├─ missions.tsx
(Home)    (Dojo)     (Log)       (Stats)    (Character)           ├─ habit/[id].tsx
                                                                  ├─ task/[id].tsx
                                                                  ├─ routine/[id].tsx
                                                                  ├─ goal/[id].tsx
                                                                  └─ +not-found.tsx
```

### 5.1 Provider Hierarchy ([`src/app/_layout.tsx`](file:///c:/Users/ashut/Documents/DragonQuest/src/app/_layout.tsx))
1. `SafeAreaProvider`: Manages screen inset boundaries.
2. `ThemeProvider`: Supplies `DarkTheme` styled with design tokens.
3. `StatusBar`: Enforces `style="light"`.
4. `DbGate`: Intercepts startup; runs pending SQLite migrations before allowing screens to mount.
5. `SplashGate`: Controls the animated branded startup experience.
6. `AuthProvider`: Restores Supabase session via SQLite `localStorage`.
7. `ProgressionProvider`: Centralizes XP, level state, and overlay ceremonies.
8. `AppEffects`: Initializes `useSyncTriggers()` and renders the dev FPS badge.
9. `Stack` (`expo-router/js-stack`): Contains all routes.

### 5.2 Core Route Definitions

| Route Path | Screen Identity | Purpose & UX Flow | Presentation / Modality |
| :--- | :--- | :--- | :--- |
| `/(tabs)/index` | **Home** | Command dashboard: Character status, Daily missions, Primary TRAIN CTA, Daily quote, Today's gains. | Tab screen |
| `/(tabs)/training` | **Training Center** | The Training Dojo: Recommended session card, quick timer chips, active challenge programs, today's session log. | Tab screen |
| `/(tabs)/journal` | **Journal** | Daily reflective log: 1..5 rating scales (Mood, Energy, Discipline), reflections, month history grid. | Tab screen |
| `/(tabs)/progress` | **Progress** | Analytics: 5 Attribute cards, Level progression bar, 7-day training minutes chart, Activity chart, Achievements. | Tab screen |
| `/(tabs)/profile` | **Profile** | Character sheet: Avatar, Rank title, Total XP, Lifetime records, Medals cabinet, Account/Sync panel. | Tab screen |
| `/missions` | **Mission Board** | Complete quest catalog: Tabs for Missions (Habits), Rituals (Routines), Objectives (Tasks), and Grand Quests (Goals). Quick add bar. | Full screen |
| `/settings` | **Settings** | Toggles for sound effects, haptic feedback, cloud sync status, and dev performance monitor. | Stack screen |
| `/(auth)/sign-in` | **Sign In / Up** | Email/Password auth modal for cross-device sync. Offline bypass supported. | Modal |
| `/habit/[id]` | **Habit Detail** | Edit habit title, difficulty (1..5), schedule, archive or delete. | Stack screen |
| `/task/[id]` | **Task Detail** | Edit task title, priority, due day, notes, or delete. | Stack screen |
| `/routine/[id]` | **Routine Detail** | Edit routine items, ordering, time-of-day, and active weekdays. | Stack screen |
| `/goal/[id]` | **Goal Detail** | Edit goal, manage progressive milestones, complete grand quest. | Stack screen |
| `+not-found` | **404 Void** | Fallback screen for unmapped routes. | Stack screen |

---

## 6. Core Product & Screen-by-Screen Walkthrough

### 6.1 Home Screen ([`src/app/(tabs)/index.tsx`](file:///c:/Users/ashut/Documents/DragonQuest/src/app/%28tabs%29/index.tsx))
- **Character Header:** Displays current Level, Rank Title (`Initiate` through `Transcendent`), Current Streak with at-risk indicator, and Today's XP.
- **Today's Training (Daily Missions):** Displays 3 daily missions deterministically selected for today. Claiming completed missions grants +50 XP and feeds **Discipline**.
- **All Clear Bonus:** If all 3 daily missions are completed, unlocks the Bonus Chest for +75 XP.
- **⚡ BEGIN TRAINING CTA:** High-contrast gradient button directing directly to the recommended training session in the Training Center.
- **Today's Gains:** Real-time attribute chip list showing XP earned today across stats.
- **Daily Quote:** Displays a stoic/motivational quote deterministic for the day.

### 6.2 Training Center ([`src/app/(tabs)/training.tsx`](file:///c:/Users/ashut/Documents/DragonQuest/src/app/%28tabs%29/training.tsx))
- **Next Training Hero Card:** Recommends the discipline trained least today (Focus > Mind > Workout > Breath).
- **Quick Training Chips:** Instant entry into Focus (25m), Mind (10m), Physical Workout (Sheet), or Recovery Breathing (5m).
- **Training Programs (Challenges):** Multi-day programs (7, 14, 30 days) with daily checkpoint hit tracking.
- **Today's Logged Sessions:** Displays completed sessions collapsed by discipline (e.g. "Focus Training ×2 · 50 min · +300 XP").
- **Minimized Session Bar:** Docked at top of screen if a timer session is running in the background.

### 6.3 Journal Screen ([`src/app/(tabs)/journal.tsx`](file:///c:/Users/ashut/Documents/DragonQuest/src/app/%28tabs%29/journal.tsx))
- **Today's Reflection:** Daily log editor containing 1..5 rating pills for Mood, Energy, Discipline, and 4 text inputs: Accomplishments, Challenges, Learnings, Tomorrow's Intent.
- **Atomic XP Reward:** Saving the first entry of the day awards +30 Mind XP atomically. Subsequent edits update the record without re-awarding XP.
- **Calendar History:** 14-day history dot grid visualizing logged days.

### 6.4 Progress Screen ([`src/app/(tabs)/progress.tsx`](file:///c:/Users/ashut/Documents/DragonQuest/src/app/%28tabs%29/progress.tsx))
- **Attribute RPG Sheet:** 5 interactive attribute cards displaying current mastery tier (E, D, C, B, A, S), progress bar to next tier, and today's gain.
- **Level & Streak Summary:** Total XP, level progress bar, training days active in last 14 days, and all-time training days.
- **Training Minutes Chart:** 7-day bar chart showing daily minutes trained.
- **Achievements Gallery:** Progress cards for all 15 achievements.

### 6.5 Profile Screen ([`src/app/(tabs)/profile.tsx`](file:///c:/Users/ashut/Documents/DragonQuest/src/app/%28tabs%29/profile.tsx))
- **Identity Hero:** Character avatar, Rank Title, Level Badge, XP bar, Streak badge.
- **Lifetime Records Grid:** Total XP, Longest Streak, Lifetime Training Days, Total Training Sessions.
- **Medals Showcase:** Badges for unlocked achievements.
- **Account & Cloud Sync:** Shows user email/id, manual "Sync now" button, and two-tap safe sign-out.

---

## 7. The Training Subsystem (Dojo Architecture)

The Training subsystem is the operational core of DragonQuest. It unites focused meditation, deep work, physical training, and respiratory recovery into a unified gamified reward pipeline.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER INITIATES TRAINING                         │
│  User selects Focus (25m), Mind (10m), Breath (5m), or Workout Log     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│     TIMED TRAINING MODAL     │              │      WORKOUT LOG SHEET       │
│  TrainingSessionModal.tsx    │              │     WorkoutLogSheet.tsx      │
│  - Start sequence (3s beat)  │              │  - Form validation           │
│  - Timestamp countdown       │              │  - Safe discard alert        │
│  - Minimize / Background     │              │  - Sets / Reps / Notes       │
└──────────┬───────────────────┘              └──────────────┬───────────────┘
           │ Completion / Finish Early                       │ Save Workout
           └────────────────────────┬────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      REPOSITORIES: COMPLETE SESSION                    │
│  completeTrainingSession() in src/data/repositories/training.ts        │
│  1. Insert row into `training_sessions` table (SQLite)                 │
│  2. Insert XP ledger row into `xp_transactions` table (SQLite)         │
│  3. Return session DTO with computed xpAwarded                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        PROGRESSION NOTIFICATION                        │
│  ProgressionProvider.refresh() receives notifyXpChanged()              │
│  - Re-evaluates total XP, level state, and rank title                  │
│  - Enqueues Level-Up overlay if level increased                        │
│  - Evaluates checkAndUnlockAchievements() atomically                   │
│  - Triggers RewardOverlay (XP gain, Attribute surge, Streak count)     │
└────────────────────────────────────────────────────────────────────────┘
```

### Training Disciplines & Economic Values:
- **Focus Training (`focus`):** 25 min default (1500s). Awards 6 XP/min = 150 Focus XP.
- **Mind Training (`mind`):** 10 min default (600s). Awards 6 XP/min = 60 Mind XP.
- **Recovery Breathing (`breath`):** 5 min default (300s). Awards 6 XP/min = 30 Energy XP.
- **Physical Training (`workout`):** Logged form. Flat reward = 50 Power XP.

---

## 8. The Timer Subsystem (Deep Specification)

The timer system is specified in [`src/game/engine/timer.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/engine/timer.ts) and executed in [`src/features/training/components/TrainingSessionModal.tsx`](file:///c:/Users/ashut/Documents/DragonQuest/src/features/training/components/TrainingSessionModal.tsx).

### 8.1 Invariant: Wall-Clock Timestamp Authority
The timer **NEVER** relies on incrementing interval counters (which drift, freeze when the device sleeps, or skew when the app is backgrounded).
- When training begins, `startedAt = Date.now()`.
- The countdown uses the pure formula:
  $$\text{endTime} = \text{startedAt} + \text{durationSec} \times 1000$$
  $$\text{remainingMs} = \max(0, \text{endTime} - \text{now})$$
  $$\text{remainingSec} = \lceil\text{remainingMs} / 1000\rceil$$
  $$\text{elapsedSec} = \min(\text{durationSec}, \text{durationSec} - \text{remainingSec})$$
- A `setInterval` ticks every 250ms simply to sample `Date.now()`. If the phone is locked for 10 minutes and unlocked, the next tick reads the wall-clock and immediately self-corrects to the exact elapsed duration.

### 8.2 Start Sequence Beats
Before the session starts, an audio-tactile countdown plays over the already-mounted ring:
- `READY` (700ms) $\rightarrow$ `3` (600ms) $\rightarrow$ `2` (600ms) $\rightarrow$ `1` (600ms) $\rightarrow$ `TRAIN` (500ms). Total: 3000ms.
- Haptic tick fires on each beat; `sfx.play('complete')` sounds on `TRAIN`.
- Timer countdown remains pinned at 0 elapsed and full duration until the sequence completes, preventing time jumping.

### 8.3 True Circular Progress Ring by Construction
The circular progress ring is built with **zero external SVG dependencies** using a pure React Native dual-clipping border technique:
1. `onTimerZoneLayout` measures the available container width and height.
2. An **even integer** ring size is enforced: `ringSize = Math.max(220, Math.floor(rawRing / 2) * 2)`. This eliminates subpixel rounding seams on Android.
3. Two semi-circular clipping windows (left half and right half) host rotating square borders:
   - Right half rotates from $-135^\circ$ to $+45^\circ$ for 0% to 50% progress.
   - Left half rotates from $-135^\circ$ to $+45^\circ$ for 50% to 100% progress.
4. Sweeps clockwise ($12 \rightarrow 3 \rightarrow 6 \rightarrow 9 \rightarrow 12$) with zero overdraw.

### 8.4 Final Stretch Tension (Last 10 Seconds)
When `remainingSec <= 10`:
- The countdown text color transitions to `palette.warning` (amber).
- A 1Hz periodic tick fires haptic feedback (`tap`) and sound effect (`xp`) once per second.

### 8.5 Anti-Exploit Minimum Duration (Finish Early)
- If a user completes at least 1 rounded minute ($\ge 30$ seconds), **Finish Early** awards partial XP:
  $$\text{partialXp} = \text{computeTrainingXpPure}(\text{kind}, \text{trainedMinutes} \times 60)$$
- **Zero-Second Exploit Prevention (T2 fix):** If a user taps "Finish early" within the first 30 seconds, no XP is awarded. It routes directly to safe modal closure without writing to SQLite or the XP ledger, preventing XP farming.

### 8.6 Abort & Confirmation Flow
- The **Abort Session** button is styled with `variant="danger"` to visually warn of reward destruction.
- Tapping Abort displays an in-modal confirmation card ("Abort session? No XP will be awarded").
- Android hardware back button and modal backdrop gestures are intercepted:
  - If a session is active, pressing back prompts for abort confirmation.
  - If abort confirmation is showing, pressing back dismisses the confirmation.
  - If submitting or completed, back navigation is locked to protect persistence.

### 8.7 Double-Completion Protection (Idempotency)
- Two layers of protection prevent duplicate records:
  1. `completedRef.current` inside `TrainingSessionModal.tsx` ensures `onComplete` is invoked exactly once per session mount.
  2. `completionInFlightRef.current` in [`src/app/(tabs)/training.tsx`](file:///c:/Users/ashut/Documents/DragonQuest/src/app/%28tabs%29/training.tsx) locks the handler during local database persistence.

### 8.8 Local Persistence Failure Resilience
- If the local SQLite write fails, the timer modal does **not** close silently or freeze on "Saving...".
- `persistError` displays an honest banner: *"Could not save this session. Your training is kept — retry the save."*
- A **Retry save** button re-invokes `completeTimer(lastElapsedRef.current)` with the exact same elapsed duration.

---

## 9. Physical Training & Workout Logging (Navigation Trap Solution)

Physical workouts are logged via [`src/features/training/components/WorkoutLogSheet.tsx`](file:///c:/Users/ashut/Documents/DragonQuest/src/features/training/components/WorkoutLogSheet.tsx).

### 9.1 Form Inputs
- **Workout Title:** (Required) e.g., "Heavy Deadlifts & Core"
- **Sets:** (Optional, numeric) e.g., "5"
- **Reps:** (Optional, numeric) e.g., "5"
- **Notes:** (Optional, multiline) e.g., "RPE 8, felt explosive"

### 9.2 The Navigation Trap Solution
In earlier builds, opening the workout log created a navigation trap: back presses would discard entered user notes without warning, or would trap users with an unescapable form.

**Current Verified Safe Exit Architecture:**
1. **Input Detection Engine:** Evaluated via pure function `hasWorkoutInput(draft)` in [`src/game/engine/workout.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/engine/workout.ts):
   ```typescript
   export function hasWorkoutInput(draft: WorkoutDraft): boolean {
     return Boolean(
       (draft.title && draft.title.trim().length > 0) ||
       (draft.sets && draft.sets.trim().length > 0) ||
       (draft.reps && draft.reps.trim().length > 0) ||
       (draft.notes && draft.notes.trim().length > 0)
     );
   }
   ```
2. **Clean Form Exit:** If the user has not entered any text, tapping the top-left Back button, tapping the backdrop, or pressing Android hardware back **immediately closes the sheet with zero friction**.
3. **Dirty Form Exit:** If the user has entered any data, attempting to navigate away triggers a native alert:
   - *"Discard workout? Your entered workout data will be lost."*
   - Options: `Keep Editing` (retains inputs) or `Discard` (`style: 'destructive'`, closes and wipes draft).
4. **Error Resilience:** Input state is only cleared when the sheet visibility transitions from open to closed (`prevVisible !== visible`). If the database save fails, the form remains open and inputs are preserved.

---

## 10. Game Engine & Deterministic RPG Progression

All RPG progression logic resides in pure TypeScript modules under [`src/game/engine/`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/engine/) and tuning configs under [`src/game/config/`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/config/).

### 10.1 The XP Economy ([`src/game/config/xp.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/config/xp.ts))
- **Base XP:** Habit = 20 XP, Task = 15 XP, Routine Item = 10 XP, Journal Entry = 30 XP, Workout = 50 XP, Timed Sessions = 6 XP / min.
- **Difficulty Multipliers:**
  - D1 (Easy) = $0.5\times$
  - D2 (Light) = $0.75\times$
  - D3 (Normal) = $1.0\times$
  - D4 (Hard) = $1.5\times$
  - D5 (Extreme) = $2.0\times$
- **Streak Multipliers:**
  - 7+ days = $1.1\times$
  - 30+ days = $1.25\times$
  - 100+ days = $1.5\times$
- **Formula:**
  $$\text{awardedXp} = \text{round}(\text{baseXp} \times \text{difficultyMult} \times \text{streakMult})$$

### 10.2 Level Curve & Rank Titles ([`src/game/config/levels.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/config/levels.ts))
- **Formula:** XP required to advance from Level $n$ to $n+1$:
  $$\text{xpForLevel}(n) = \text{round}(100 \times n^{1.6})$$
- **Max Level:** 100.
- **Rank Titles:**
  - Level 1: Initiate
  - Level 3: Apprentice
  - Level 6: Adept
  - Level 10: Disciple
  - Level 15: Warrior
  - Level 22: Champion
  - Level 30: Master
  - Level 40: Grandmaster
  - Level 55: Ascendant
  - Level 75: Transcendent

### 10.3 The Attribute Stat Model ([`src/game/config/attributes.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/config/attributes.ts))
Attributes are **derived on read** from the `xp_transactions` ledger:
$$\text{Attribute XP} = \sum \text{amount where source maps to attribute}$$

| Attribute | XP Ledger Sources | Core Training Meaning | Mastery Tiers |
| :--- | :--- | :--- | :--- |
| **Power** | `workout` | Physical fitness, resistance training, strength | Tier E: 0 XP<br>Tier D: 250 XP<br>Tier C: 750 XP<br>Tier B: 1500 XP<br>Tier A: 3000 XP<br>Tier S: 6000 XP |
| **Focus** | `task`, `focus_session` | Deep work, deliberate study, concentration | Same |
| **Discipline** | `habit`, `mission`, `bonus`, `manual` | Daily consistency, routine adherence, streak survival | Same |
| **Mind** | `mind_training`, `journal` | Meditation, reflection, mental resilience | Same |
| **Energy** | `routine_item`, `breath_training` | Recovery, breathwork, healthy structure | Same |

### 10.4 Consecutive Calendar-Day Streaks ([`src/game/engine/streaks.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/engine/streaks.ts))
- Computed from unique local completion dates (`YYYY-MM-DD`).
- Sorts unique days lexicographically. If the gap between the latest completion and today is $> 1$ day, the active streak is broken ($0$).
- If completed yesterday and not yet today, streak is maintained and flagged as `atRisk: true`.
- Evaluates longest consecutive run all-time (`best`).

### 10.5 Deterministic Daily Missions ([`src/game/engine/missions.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/engine/missions.ts))
- Three missions are chosen every day using an FNV-1a hash of the local date string (`YYYY-MM-DD`).
- Guarantees all users with the same date see the identical 3 daily missions; line-up never reshuffles during the day.
- Mission kinds: `any_three` (complete 3 quests), `perfect_day` (complete all scheduled habits), `routine_run` (complete a ritual).

### 10.6 Atomic Challenge Claim Engine ([`src/data/repositories/challenges.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/data/repositories/challenges.ts))
- Programs span 7, 14, or 30 days. Daily completion counts determine if a day is "hit".
- **Race Condition Immunity (G1 fix):** Completing a program updates status atomically:
  ```sql
  UPDATE user_challenges SET status='completed', finished_day=?
  WHERE id=? AND status='active' RETURNING id;
  ```
  Only if `returning()` contains the row ID is the challenge reward inserted into `xp_transactions`. Rapid double-taps can never double-award XP.

### 10.7 Atomic Achievement Unlock Engine ([`src/data/repositories/achievements.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/data/repositories/achievements.ts))
- 15 achievements evaluated on every progression snapshot update.
- Unlocks insert via:
  ```sql
  INSERT INTO user_achievements (id, achievement_id, unlocked_at)
  VALUES (?, ?, ?) ON CONFLICT(achievement_id) DO NOTHING RETURNING id;
  ```
  XP is awarded **only** if the insert committed. Duplicate unlocks from pulled cloud rows or simultaneous triggers are silent no-ops.

---

## 11. Local Data Architecture (SQLite + Drizzle ORM)

### 11.1 Schema Map ([`src/data/db/schema.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/data/db/schema.ts))
The local database consists of **15 SQLite tables**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              LOCAL SCHEMA                              │
├──────────────────────┬─────────────────────────────────────────────────┤
│ Habits & Quests      │ habits, tasks, routines, routine_items          │
│ Long-term Goals      │ goals, milestones                               │
│ Append-Only Ledgers  │ daily_completions, xp_transactions             │
│ Missions & Meta      │ mission_claims, user_achievements, user_challs  │
│ Training Redesign    │ training_sessions, journal_entries              │
│ Local Bookkeeping    │ app_settings, sync_cursors                      │
└──────────────────────┴─────────────────────────────────────────────────┘
```

#### Detailed Table Specifications:
1. `habits`: id (PK), name, notes, icon, color, difficulty (1..5), schedule_json, reminder_time, archived_at, created_at, updated_at.
2. `tasks`: id (PK), title, notes, due_day (YYYY-MM-DD), priority (0..2), completed_at, habit_id (FK), deleted_at, created_at, updated_at.
3. `routines`: id (PK), name, icon, time_of_day, active_days_json, reminder_time, archived_at, created_at, updated_at.
4. `routine_items`: id (PK), routine_id (FK cascade), habit_id (FK), task_id (FK), order_index, created_at.
5. `daily_completions`: id (PK), entity_type, entity_id, day (YYYY-MM-DD), completed_at, xp_awarded, bonus_multiplier.  
   *Unique Index:* `(entity_type, entity_id, day)` enforces once-per-day completion.
6. `xp_transactions`: id (PK), amount, source, ref_id, reason, created_at. (Append-only XP ledger).
7. `mission_claims`: id (PK), day (YYYY-MM-DD), kind, xp_awarded, claimed_at.  
   *Unique Index:* `(day, kind)` prevents double-claims.
8. `goals`: id (PK), title, description, category, target_day, status, xp_reward, completed_at, created_at, updated_at.
9. `milestones`: id (PK), goal_id (FK cascade), title, completed_at, order_index, created_at.
10. `user_achievements`: id (PK), achievement_id, unlocked_at.  
    *Unique Index:* `(achievement_id)` prevents duplicate unlocks.
11. `user_challenges`: id (PK), challenge_id, started_day, status, finished_day, created_at.
12. `app_settings`: key (PK), value. (Local key-value store for audio/haptics/perf toggles).
13. `journal_entries`: id (PK), day (YYYY-MM-DD), mood, energy, discipline, accomplished, challenged, learned, tomorrow_intent, created_at, updated_at.  
    *Unique Index:* `(day)` enforces one reflection entry per calendar day.
14. `training_sessions`: id (PK), kind, title, duration_sec, completed_at, day, xp_awarded, payload_json.
15. `sync_cursors`: id (PK), table_name, last_pulled_at, last_pushed_at.  
    *Unique Index:* `(table_name)`. Purely local watermarks, never synced to cloud.

### 11.2 Migration Lifecycle & Metro Integration
- Migrations are generated via `npx drizzle-kit generate` into [`src/data/db/drizzle/`](file:///c:/Users/ashut/Documents/DragonQuest/src/data/db/drizzle/).
- Drizzle's generated `migrations.js` bundle is committed directly to source control.
- `babel-plugin-inline-import` inlines `.sql` files as string literals.
- `metro.config.js` registers `sql` as a source extension and `wasm` as an asset extension.
- At app launch, [`DbGate.tsx`](file:///c:/Users/ashut/Documents/DragonQuest/src/data/db/DbGate.tsx) calls `runMigrations()` from [`src/data/db/client.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/data/db/client.ts), applying any pending migrations before the application renders.

---

## 12. Cloud Synchronization & Supabase Architecture

### 12.1 Client Architecture ([`src/lib/supabase.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/lib/supabase.ts))
- Configured with environment variable names:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Graceful Fallback:** If variables are missing, `isCloudConfigured` evaluates to `false`, and `getSupabase()` returns `null`. The app runs completely locally with zero exceptions.
- **Session Persistence:** Configured using `expo-sqlite/localStorage/install`, storing tokens across launches using native SQLite storage without extra dependencies.
- **Token Refresh:** Scoped to `AppState.addEventListener`: active $\rightarrow$ `startAutoRefresh()`; background $\rightarrow$ `stopAutoRefresh()`.

### 12.2 Sync Engine Decision Rules ([`src/services/sync/syncEngine.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/services/sync/syncEngine.ts))
13 tables are synced in strict dependency order:
1. `habits` (LWW)
2. `tasks` (LWW)
3. `routines` (LWW)
4. `routine_items` (LWW)
5. `goals` (LWW)
6. `milestones` (LWW)
7. `daily_completions` (Union Merge on natural key: `entity_type, entity_id, day`)
8. `xp_transactions` (Union Merge by ID)
9. `mission_claims` (Union Merge on natural key: `day, kind`)
10. `training_sessions` (Union Merge by ID)
11. `journal_entries` (LWW on `updated_at`)
12. `user_achievements` (Union Merge on natural key: `achievement_id`)
13. `user_challenges` (LWW on `created_at`)

### 12.3 Solution to Postgres Error 23505 (Natural Key Unique Constraints)
**Root Cause:**
In append-only tables, remote Postgres enforces natural uniqueness beyond primary keys (e.g. `user_achievements` has a unique constraint on `(user_id, achievement_id)`). If a user earned an achievement offline on Device A (uuid-1) and also on Device B (uuid-2), pushing uuid-2 with standard ID-conflict handling triggered a fatal `23505 unique_violation`.

**Architectural Remediation:**
1. In `syncEngine.ts`, `naturalKey` is declared for append-only tables.
2. `remoteConflictTarget(cfg)` dynamically returns the constraint's true target:
   ```typescript
   export function remoteConflictTarget(cfg: SyncTableConfig): string {
     if (!cfg.appendOnly || !cfg.naturalKey) return 'id';
     return ['user_id', ...cfg.naturalKey].join(',');
   }
   ```
3. `syncService.ts` executes an upsert with `onConflict: remoteConflictTarget(cfg)` and `ignoreDuplicates: true`. A twin row under a fresh UUID is absorbed as an idempotent no-op instead of throwing.

### 12.4 Solution to PostgREST PGRST204 (DTO Row Mapping)
**Root Cause:**
Drizzle queries return TypeScript camelCase properties (`durationSec`, `payloadJson`, `scheduleJson`), whereas PostgreSQL columns are snake_case (`duration_sec`, `payload_json`). Pushing camelCase keys to Supabase failed with `PGRST204: Could not find the column in the schema`.

**Architectural Remediation:**
[`src/services/sync/rowMapping.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/services/sync/rowMapping.ts) uses runtime introspection (`getTableColumns(table)`) to derive two-way mapping dictionaries:
- `toCloudRow(table, row)`: Translates TS keys $\rightarrow$ SQL column names before push.
- `toLocalRow(table, row)`: Translates SQL column names $\rightarrow$ TS keys before local SQLite upsert.
- `REMOTE_ONLY_COLUMNS`: Automatically strips `user_id` when pulling into SQLite (SQLite is single-user and has no `user_id` column).

### 12.5 Per-Table Error Isolation
In [`src/services/sync/syncService.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/services/sync/syncService.ts), sync iterates through each table inside its own `try/catch`. If one table fails due to a network glitch or payload issue, its failure is logged, its cursor is not advanced, and the remaining 12 tables continue syncing uninterrupted.

### 12.6 Sync Triggers & Backoff ([`src/services/sync/syncTriggers.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/services/sync/syncTriggers.ts))
1. **On Sign-In:** Immediate initial push/pull pass.
2. **On Foreground:** When `AppState` transitions to `'active'`, triggers a background sync.
3. **Debounced Post-Mutation:** Subscribes to `onXpChanged` and `onBoardChanged`; debounces by 2000ms before pushing local writes.
4. **Exponential Retry Backoff:** On error, schedules retries at:
   $$\text{delayMs} = \min(300000, 5000 \times 2^{\max(0, \text{attempt} - 1)})$$

### 12.7 Cloud Database & RLS ([`supabase/migrations/0001_init.sql`](file:///c:/Users/ashut/Documents/DragonQuest/supabase/migrations/0001_init.sql))
- Every table has `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`.
- RLS enabled on all 14 remote tables:
  ```sql
  create policy "table_own" on public.table
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  ```
- Anonymous access is explicitly revoked: `revoke all on all tables in schema public from anon;`.

---

## 13. Authentication & Session Lifecycle

Implemented in [`src/features/auth/AuthProvider.tsx`](file:///c:/Users/ashut/Documents/DragonQuest/src/features/auth/AuthProvider.tsx).

### 13.1 Authentication Philosophy
Authentication is **strictly additive**:
- New users can use 100% of DragonQuest features immediately without ever creating an account.
- Account creation exists solely to back up records and synchronize across devices.
- Unauthenticated users store all records in local SQLite. When they sign in, `countLocalRowsForPreview()` informs them of local items ready to sync, and the initial push uploads all local data into their newly linked Supabase account.

### 13.2 Session Flows
- **Sign In:** `signInWithPassword(email, password)` authenticates with Supabase; session is saved in SQLite `localStorage`.
- **Sign Up:** `signUp(email, password)` requires email verification. `needsConfirmation: true` routes the user to check their email inbox.
- **Two-Tap Sign Out:** Located in Profile $\rightarrow$ Account. The first tap flips the button to `variant="danger"` with the label *"Tap again to confirm"* (resets after 3 seconds). The second tap clears credentials and resets auth state.
- **Session Restorations:** At boot, `supabase.auth.getSession()` and `onAuthStateChange()` restore active credentials without blocking UI rendering.

---

## 14. Design System & Theming Tokens

Located in [`src/design-system/`](file:///c:/Users/ashut/Documents/DragonQuest/src/design-system/).

### 14.1 Color Tokens ([`tokens.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/design-system/tokens.ts))
- **Backgrounds (Dark Training Dimension):**
  - `void`: `#07080C` (deep canvas background)
  - `night`: `#0C0E14` (card & surface background)
  - `slate`: `#12151D` (elevated surface)
  - `steel`: `#1A1E29` (chip & inactive container)
  - `line`: `#2C3242` (structural borders & dividers)
- **Accents:**
  - `aura`: `#00E5FF` (primary electric cyan)
  - `power`: `#FF6B35` (secondary orange energy)
  - `gold`: `#FFC94D` (achievement currency & medals)
  - `success`: `#4ADE80` (completion green)
  - `danger`: `#F87171` (destructive actions)
  - `warning`: `#FBBF24` (amber alert)
  - `ember`: `#FF8C42` (training streak fire)
- **Attribute Palette:**
  - `attrPower`: `#FF6B35`
  - `attrFocus`: `#00E5FF`
  - `attrDiscipline`: `#FFC94D`
  - `attrMind`: `#A78BFA`
  - `attrEnergy`: `#4ADE80`

### 14.2 Layout Scales
- **Spacing (4pt grid):** `xxs: 2`, `xs: 4`, `sm: 8`, `md: 12`, `lg: 16`, `xl: 24`, `xxl: 32`, `xxxl: 48`.
- **Radius:** `sm: 8`, `md: 12`, `lg: 16`, `xl: 24`, `round: 999`.
- **Typography:** Display (34/42/800), Title (26/34/800), Heading (20/28/700), Subheading (16/22/600), Body (15/22/400), Label (13/18/600), Caption (12/16/500), Mono (13/18/600).

### 14.3 Component Library Index ([`src/design-system/components/index.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/design-system/components/index.ts))
- Core Primitives: `Screen`, `Card`, `Button`, `IconButton`, `Input`, `Badge`, `ProgressBar`, `SegmentedControl`, `Sheet`, `EmptyState`, `ThemedText`, `ThemedView`, `SplashGate`.
- Training-RPG Primitives: `CharacterAvatar`, `CharacterHeader`, `AttributeCard`, `AchievementCard`, `CalendarHistory`, `DailyQuoteCard`, `LevelBadge`, `ProgressChart`, `RewardOverlay`, `StreakBadge`, `TrainingCard`, `XPBar`.

---

## 15. Animation & Performance Engineering (Reanimated 4)

### 15.1 Configuration
- Uses `react-native-reanimated` version `4.5.1` with `react-native-worklets` `0.10.1`.
- In Expo SDK 57, `babel-preset-expo` automatically registers `react-native-worklets/plugin`.
- ESLint rule `'react-hooks/immutability': 'off'` is set in `eslint.config.js` to accommodate Reanimated's sanctioned `.value` assignments.

### 15.2 Strict Architectural Rules
1. **No Shared Value Reads During React Render:** Shared values must **never** be read (`sv.value`) during the render phase of a component. They must only be referenced inside `useAnimatedStyle`, event handlers, or `useEffect`.
2. **Worklets for Complex Transforms:** All style animations execute on the UI thread via `useAnimatedStyle`.
3. **Accessibility (Reduced Motion):** Components query `useReducedMotion()`. If enabled by the operating system:
   - Infinite breathing aura animations (`withRepeat`) are disabled and replaced with static low-opacity backgrounds.
   - Timing transitions drop to calm 80ms springs.
   - Pop animations remain at scale `1`.

---

## 16. Audio & Haptics Feedback Services

### 16.1 Audio Service ([`src/services/audio.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/services/audio.ts))
- Call sites use semantic intent rather than raw file loading:
  - `'complete'`: Quests checked off, training beat reached
  - `'xp'`: Small XP tick, final-stretch timer countdown seconds
  - `'levelUp'`: Level advancement stinger, training timer natural completion
  - `'achievement'`: Achievement unlocked
  - `'streak'`: Streak milestone hit
  - `'fail'`: Abandoned challenge, error
- Phase 2 stub logs `sfx:${effect}`. Phase 9 is scheduled to route these to `expo-audio` players loading assets from `src/assets/audio/`.
- Muting is controlled globally via `sfx.setEnabled(boolean)` backed by persistent `app_settings`.

### 16.2 Haptic Feedback ([`src/services/haptics.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/services/haptics.ts))
- Powered by `expo-haptics`:
  - `'tap'`: `Haptics.ImpactFeedbackStyle.Light`
  - `'success'`: `Haptics.NotificationFeedbackType.Success`
  - `'warning'`: `Haptics.NotificationFeedbackType.Warning`
  - `'error'`: `Haptics.NotificationFeedbackType.Error`
  - `'levelUp'`: Double-impact surge: Heavy impact followed by a 120ms pause, then Medium impact.
- Globally toggleable via `setHapticsEnabled(boolean)`.

---

## 17. Developer Telemetry & Leveled Logging

### 17.1 Structured Leveled Logger ([`src/services/logger.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/services/logger.ts))
- Levels: `debug`, `info`, `warn`, `error`.
- In `__DEV__`, minimum level is `debug`; in release builds, info/debug are discarded, and only `warn`/`error` are emitted.
- **Safe Structured Serialization (`serializeForLog`):**
  - PostgREST errors are plain JavaScript objects, not `Error` instances. `serializeForLog` extracts `message`, `code`, `details`, `hint`, and `status`, preventing `[object Object]` log output.
  - Recursion depth is capped at 4; array items at 30; string lengths at 600.
  - **Secret Redaction:** Keys matching `/pass(word)?|passphrase|token|secret|api_?key|authorization|cookie|credential/i` preserve key names for structural debugging while their values are permanently replaced with `[redacted]`.

### 17.2 Dev Performance FPS Badge ([`src/services/devPerf.tsx`](file:///c:/Users/ashut/Documents/DragonQuest/src/services/devPerf.tsx))
- A lightweight, corner-docked FPS badge.
- Gated behind `__DEV__` (completely compiled out of release builds).
- Default is OFF so manual testing is unobstructed. Can be toggled live in `settings.tsx` without app restart.

---

## 18. Automated Testing Strategy & Verification Gates

### 18.1 Test Inventory (141 Passed Tests Across 13 Test Suites)
Run via `npm test` with Jest and `jest-expo`:

1. [`src/game/engine/__tests__/timer.test.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/engine/__tests__/timer.test.ts) — Derived countdown math, timestamp precision, start sequence beat resolution, background recovery.
2. [`src/game/engine/__tests__/workout.test.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/engine/__tests__/workout.test.ts) — Workout draft input detection, safe navigation guard assertions.
3. [`src/game/engine/__tests__/levels.test.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/engine/__tests__/levels.test.ts) — Level curve progression formula, boundary values, rank titles up to level 100.
4. [`src/game/engine/__tests__/attributes.test.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/engine/__tests__/attributes.test.ts) — Attribute derivation from ledger sources, tier calculations (E..S), soft cap math.
5. [`src/game/engine/__tests__/streaks.test.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/engine/__tests__/streaks.test.ts) — Consecutive days streak algorithm, leap years, broken streaks, at-risk calculations.
6. [`src/game/engine/__tests__/progression.test.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/engine/__tests__/progression.test.ts) — XP balance, transaction rollups, level-up threshold detection.
7. [`src/game/engine/__tests__/missions.test.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/engine/__tests__/missions.test.ts) — Deterministic FNV-1a mission rotation, daily stat evaluations, bonus chest criteria.
8. [`src/game/engine/__tests__/achievements.test.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/engine/__tests__/achievements.test.ts) — Achievement evaluation rules across all 15 definitions, new unlock filtering.
9. [`src/game/config/__tests__/training.test.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/config/__tests__/training.test.ts) — Training XP formulas for focus, mind, breath, and workout; partial reward calculations.
10. [`src/game/engine/__tests__/sessionHistory.test.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/engine/__tests__/sessionHistory.test.ts) — Aggregating and grouping training session lists into human-readable views.
11. [`src/game/engine/__tests__/challenges.test.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/game/engine/__tests__/challenges.test.ts) — Multi-day challenge program tracking, hit days, failure and completion calculations.
12. [`src/services/sync/__tests__/syncEngine.test.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/services/sync/__tests__/syncEngine.test.ts) — LWW resolution, union merge logic, natural-key conflict targets, watermark advancement, 23505 regression suite.
13. [`src/services/sync/__tests__/rowMapping.test.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/services/sync/__tests__/rowMapping.test.ts) — Drizzle camelCase to Postgres snake_case translation across all 13 synced tables; stripping `user_id` on pull.
14. [`src/services/__tests__/logger.test.ts`](file:///c:/Users/ashut/Documents/DragonQuest/src/services/__tests__/logger.test.ts) — Leveled log filtering, error-like object flattening, secret key value redaction.

### 18.2 Database Smoke Test ([`scripts/sqlite-smoke.mjs`](file:///c:/Users/ashut/Documents/DragonQuest/scripts/sqlite-smoke.mjs))
Run via `npm run smoke:db` using `node:sqlite` in-memory:
- Verifies generation of [`0000_init.sql`](file:///c:/Users/ashut/Documents/DragonQuest/src/data/db/drizzle/0000_init.sql).
- Enforces unique constraint `completions_unique_day` on `(entity_type, entity_id, day)`.
- Enforces cascade delete from `routines` to `routine_items`.
- Enforces cascade delete from `goals` to `milestones`.
- Enforces unique index on `user_achievements (achievement_id)`.
- Enforces natural-key twin absorption (`INSERT OR IGNORE` no-op test).

---

## 19. Build, Export & Execution Commands

### 19.1 Development Commands
```bash
# Start Expo development server (scan QR code in Expo Go)
npm start
# or: npx expo start

# Clear Metro cache and restart server
npx expo start --clear

# Run in Web browser
npm run web

# Run on connected Android device / emulator
npm run android

# Run on iOS simulator (requires macOS / EAS)
npm run ios
```

### 19.2 Verification Commands (Pre-Commit Standard)
```bash
# Typecheck TypeScript codebase (0 errors required)
npm run typecheck
# or: npx tsc --noEmit

# Lint JavaScript and TypeScript files (0 errors/warnings required)
npm run lint
# or: npx eslint .

# Run complete Jest test suite (141 tests)
npm test

# Run local SQLite migration and constraint smoke test
npm run smoke:db

# Run full code & style check
npm run check

# Diagnose Expo configuration and dependencies
npx expo-doctor
```

### 19.3 Build & Export Commands
```bash
# Export static production bundle for Web
npx expo export --platform web

# Export production bundle for Android
npx expo export --platform android

# Run EAS build for development profile
npx eas build --profile development --platform android

# Run EAS production build
npx eas build --profile production --platform all
```

---

## 20. Environment Configuration Reference

All environment variables are declared in [`.env.example`](file:///c:/Users/ashut/Documents/DragonQuest/.env.example). Local development copies them to `.env.local` (which is git-ignored).

> [!CAUTION]
> **NEVER HARDCODE OR COMMIT SECRETS:**  
> Only variable **names** are documented below. Row Level Security in Supabase protects tables when using the public publishable key.

### Variable Reference:
| Variable Name | Required? | Purpose | Notes |
| :--- | :--- | :--- | :--- |
| `EXPO_PUBLIC_SUPABASE_URL` | Optional | Supabase Project REST/Auth Endpoint URL | When omitted, app runs 100% locally with zero cloud features. |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional | Supabase Public / Anon API Key | Safe to bundle in client app; RLS strictly restricts access. |

### EAS Configuration ([`app.json`](file:///c:/Users/ashut/Documents/DragonQuest/app.json)):
- `owner`: `ashutoshx29`
- `eas.projectId`: `9779b86f-15fa-4672-a149-3bf6318a849f`
- `bundleIdentifier` (iOS): `com.dragonquest.app`
- `package` (Android): `com.dragonquest.app`

---

## 21. Current Working Tree & Git Status

### 21.1 Commit Context
- **Branch:** `main`
- **Current HEAD Commit:** `2ae77f0` — *"Phase 6: Supabase auth & cloud sync foundation"*
- **Preceding Commits:**
  - `d3bed64` Phase 5: goals, achievements, challenges, stats, settings
  - `4090358` Phase 4: XP progression, levels, daily missions
  - `942f0c7` Phase 3: local database, habits/routines/tasks
  - `437aa0e` Phase 2: design system + services
  - `45bd146` Phase 1: project foundation
  - `a7df71e` Initial commit

### 21.2 Working Tree Modifications (Uncommitted Hardening)
The working tree contains vital data-integrity and UI resilience fixes implemented following Phase 6:

```
Changes not staged for commit:
  modified:   .gitignore
  modified:   AGENTS.md
  modified:   CLAUDE.md
  modified:   app.json
  modified:   scripts/sqlite-smoke.mjs
  modified:   src/app/(auth)/sign-in.tsx
  modified:   src/app/(tabs)/journal.tsx
  modified:   src/app/(tabs)/profile.tsx
  modified:   src/app/(tabs)/training.tsx
  modified:   src/app/_layout.tsx
  modified:   src/app/settings.tsx
  modified:   src/data/repositories/achievements.ts
  modified:   src/data/repositories/challenges.ts
  modified:   src/data/repositories/journal.ts
  modified:   src/data/repositories/settings.ts
  modified:   src/design-system/components/Sheet.tsx
  modified:   src/design-system/components/TrainingCard.tsx
  modified:   src/features/progression/ProgressionProvider.tsx
  modified:   src/features/training/components/TrainingSessionModal.tsx
  modified:   src/features/training/components/WorkoutLogSheet.tsx
  modified:   src/game/engine/__tests__/timer.test.ts
  modified:   src/services/logger.ts
  modified:   src/services/sync/__tests__/syncEngine.test.ts
  modified:   src/services/sync/syncEngine.ts
  modified:   src/services/sync/syncService.ts
  modified:   src/services/sync/syncTriggers.ts

Untracked files:
  BUG-BACKLOG.md
  OVERENGINEERING-REVIEW.md
  PRE-RUN-READINESS.md
  src/game/engine/__tests__/workout.test.ts
  src/game/engine/workout.ts
  src/services/__tests__/logger.test.ts
  src/services/devPerf.tsx
  src/services/sync/__tests__/rowMapping.test.ts
  src/services/sync/rowMapping.ts
```

---

## 22. Project Phase & Roadmap History

| Phase | Milestone Name | Status | Key Deliverables & Architecture |
| :---: | :--- | :---: | :--- |
| **1** | **Foundation** | ✅ COMPLETED | Strict TypeScript, ESLint Flat Config, Prettier, Design tokens, 5-tab shell layout, `@/*` path mapping. |
| **2** | **Design System** | ✅ COMPLETED | UI Primitives (Button, Card, Badge, ProgressBar, Sheet), SplashGate intro, Reanimated motion presets, Audio/Haptics stubs. |
| **3** | **Local Database & Quests** | ✅ COMPLETED | `expo-sqlite` + `drizzle-orm`, schema & initial migrations, Habit/Task/Routine CRUD, streak engine, `smoke:db` runner. |
| **4** | **Progression Engine** | ✅ COMPLETED | Level curve engine ($100 \times n^{1.6}$), deterministic daily missions (FNV-1a), mission claims, Level-up & XP ceremonies. |
| **5** | **Goals & Achievements** | ✅ COMPLETED | Goals & milestones, 15 achievement definitions, 7/14/30-day challenge programs, Character sheet on Profile, settings store. |
| **6** | **Auth & Cloud Sync Foundation** | ✅ COMPLETED | Supabase integration, `profiles` trigger, 13-table cloud mirror with RLS, push/pull sync engine, watermarking cursors. |
| **7** | **Sync Hardening & Status** | 🔄 IN PROGRESS | PostgREST error flattening, 23505 natural key conflict fix, DTO row mapping, unified sync status module, TanStack Query migration. |
| **8** | **Notifications** | ⏳ NOT STARTED | Local reminders for daily missions & routine items; EAS push notification service. |
| **9** | **Animation Polish & Real Audio** | ⏳ NOT STARTED | Replacing audio stub with `expo-audio` players and sound files in `src/assets/audio/`; Lottie reward animations. |
| **10** | **E2E Testing & Hardening** | ⏳ NOT STARTED | Maestro E2E test scripts, Sentry mobile error reporting integration. |
| **11** | **Deployment & Release** | ⏳ NOT STARTED | App rebranding (renaming from DragonQuest), App Store & Google Play metadata, EAS production builds. |

---

## 23. Known Bug Backlog & Residual Risks

Extracted from verified findings in [`BUG-BACKLOG.md`](file:///c:/Users/ashut/Documents/DragonQuest/BUG-BACKLOG.md) and [`PRE-RUN-READINESS.md`](file:///c:/Users/ashut/Documents/DragonQuest/PRE-RUN-READINESS.md):

| Bug ID | Severity | Subsystem | Issue Summary | Status | Root Cause & Resolution |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **G1** | **P0** | Game / Challenges | Double-awarding challenge XP on rapid taps | ✅ FIXED | Check-then-act race. Resolved by atomic conditional update: `UPDATE user_challenges SET status='completed' WHERE id=? AND status='active' RETURNING id`. |
| **G2** | **P1** | Game / Journal | Double-awarding daily journal +30 XP on double-save | ✅ FIXED | Race on day lookup. Resolved by atomic `INSERT ... ON CONFLICT(day) DO NOTHING RETURNING id`. XP is awarded only if insert committed. |
| **T2** | **P2** | Training / Timer | Finish Early at 0s elapsed awarded 1 min XP | ✅ FIXED | Minute floor `Math.max(1, ...)` was applied at 0s. Resolved by requiring $\ge 30$ seconds trained before awarding XP. |
| **U1** | **P2** | Training / Modal | Abort button styled as ghost button | ✅ FIXED | Abort had same weight as cancel. Resolved by setting `variant="danger"`. |
| **U2** | **P2** | Journal / UI | Silent save failure led to text loss on remount | ✅ FIXED | Unhandled rejection and premature remount. Wrapped in `try/catch` with inline retry warning; text is preserved. |
| **U8** | **P2** | Profile / UI | Instant sign-out on accidental single tap | ✅ FIXED | Destructive immediate sign-out. Added two-tap confirmation with 3-second timeout. |
| **A1** | **P2** | Auth / Sign-in | Unhandled rejection on transport-level network errors | ✅ FIXED | Offline DNS/fetch threw before Supabase error object existed. Added `catch` in `submit()` to show inline network error. |
| **P2** | **P2** | Progression | Refresh ran full pipeline on every single XP notify | ✅ FIXED | Evaluated achievements repeatedly during sync pulls. Coalesced refreshes using `refreshRunningRef` and `refreshQueuedRef`. |
| **S1** | **P3** | Cloud Sync / UI | Failure banner in Profile reflects only manual sync | ⏳ DEFERRED | Background trigger results do not feed Profile banner. Safe; background retries are automatic. Requires Phase 7 shared status module. |
| **A2** | **P3** | Auth / UI | Raw Supabase error strings shown to user | ⏳ DEFERRED | Technical strings shown on auth errors. Friendly copy mapping deferred to copy pass. |
| **P4** | **P3** | Dependencies | 8 unused template packages in `package.json` | ⏳ DEFERRED | `expo-glass-effect`, `expo-symbols`, `expo-device`, `expo-web-browser`, `expo-image`, `expo-linking`, `expo-system-ui`, `@expo/ui`. Tree-shaken; deferred to dedicated dependency commit. |

---

## 24. Technical Debt & Code Gardening Items

Based on [`OVERENGINEERING-REVIEW.md`](file:///c:/Users/ashut/Documents/DragonQuest/OVERENGINEERING-REVIEW.md):

1. **Unused Dependencies Cleanup:**  
   - 8 packages remain from the Expo template with zero imports in `src/`: `expo-glass-effect`, `expo-symbols`, `expo-device`, `expo-web-browser`, `expo-image`, `expo-linking`, `expo-system-ui`, `@expo/ui`.  
   - *Recommendation:* Remove via a single dependency-only commit, followed by `npx expo-doctor`.
2. **Ledger Aggregation Query Scaling:**  
   - Computing attributes, total XP, and streaks performs full-table scans over `daily_completions` and `xp_transactions`.  
   - *Impact:* Sub-10ms today on personal datasets; will degrade as users accumulate thousands of rows over multiple years.  
   - *Recommendation:* Introduce periodic watermark summary tables or indexed sums during Phase 7.
3. **Dual Refresh Idioms:**  
   - `useDailyMissions` subscribes via `onBoardChanged`, while certain screens also call imperative `reload()`.  
   - *Recommendation:* Consolidate into TanStack Query cache invalidation during Phase 7.
4. **Data Hook Migration (`useAsync`):**  
   - Custom `useAsync.ts` handles component data fetching.  
   - *Recommendation:* Replace with TanStack Query (`useQuery`) during Phase 7 cloud sync hardening.

---

## 25. Non-Negotiable Architectural Invariants

Any engineer or AI agent working on DragonQuest MUST follow these rules:

1. **SQLite is the Undisputed Local Source of Truth:** The app must never block or wait on network I/O to perform user actions. Local writes commit to SQLite first.
2. **Ledgers are Strictly Append-Only:** Never update or delete rows in `daily_completions`, `xp_transactions`, `mission_claims`, or `training_sessions`. Uncompleting an item inserts an inverse correction row.
3. **Timestamp Authority for Timers:** Never implement incrementing interval counters for timer countdowns. Authoritative time derives strictly from wall-clock timestamps (`Date.now()`).
4. **Pure Engines for Game Logic:** Never write game balance, leveling, streak, or XP formulas inside React UI components or database repositories. All game logic belongs in `src/game/engine/`.
5. **Thin Route Files:** Files in `src/app/` must remain thin presentation wrappers. Domain logic belongs in `src/features/`, and data access belongs in `src/data/repositories/`.
6. **Row Level Security (RLS) is Non-Negotiable:** Never weaken or bypass Supabase RLS policies to make tests or sync features pass.
7. **Idempotent Synchronization:** Sync push and pull operations must be safe to replay indefinitely without creating duplicate records or inflating XP.
8. **No TypeScript Suppression:** Never use `@ts-ignore`, `@ts-expect-error`, or `any` to hide typing problems.

---

## 26. Future Development & Engineering Protocol

### How to Implement a New Feature:
1. **Locate the Domain Subsystem:**
   - Visual Component $\rightarrow$ `src/design-system/components/`
   - Route Screen $\rightarrow$ `src/app/`
   - Business Logic & Hooks $\rightarrow$ `src/features/<feature>/`
   - Database Table & Queries $\rightarrow$ `src/data/db/schema.ts` & `src/data/repositories/`
   - Game Mechanics & Tuning $\rightarrow$ `src/game/config/` & `src/game/engine/`
2. **Plan Dataflow:**
   Ensure data moves from UI $\rightarrow$ Hook $\rightarrow$ Pure Engine $\rightarrow$ Repository $\rightarrow$ SQLite $\rightarrow$ Background Sync.
3. **Write Pure Engine Tests First:**
   Add unit tests in `src/game/engine/__tests__/` to verify formulas and state transitions in isolation.
4. **Verify Schema Migrations:**
   If modifying `schema.ts`, run `npx drizzle-kit generate`, inspect the generated SQL in `src/data/db/drizzle/`, update `scripts/sqlite-smoke.mjs`, and run `npm run smoke:db`.
5. **Run the 5-Gate Verification Suite:**
   ```bash
   npm run typecheck
   npm run lint
   npm test
   npm run smoke:db
   npx expo export --platform android
   ```

---

## 27. Architectural Decision Records (ADRs)

### ADR-001: Local-First, Offline-Authoritative Architecture
- **Decision:** The local SQLite database is the primary source of truth. Cloud sync mirrors state in the background.
- **Rationale:** A daily routine and training app must be instantaneously responsive and reliable in zero-connectivity environments (gyms, flight mode, outdoors).
- **Consequence:** Network latency is completely removed from the user experience; sync conflict resolution must use last-write-wins and union merging.

### ADR-002: Timestamp-Derived Timer Engine
- **Decision:** All timer calculations derive from `startedAt` and wall-clock timestamps (`Date.now()`).
- **Rationale:** Mobile operating systems throttle or pause JavaScript interval timers when apps are backgrounded or screens are locked.
- **Consequence:** Timer countdowns self-correct immediately upon foregrounding with zero drift.

### ADR-003: Pure React Native Progress Arc (No SVG)
- **Decision:** Built circular timer rings using twin semi-circular clipping windows and rotating borders in pure React Native.
- **Rationale:** Avoids adding `react-native-svg` native dependencies, keeping native binary footprint minimal and Expo Go compatible.
- **Consequence:** Enforces an even integer constraint on ring dimensions (`Math.floor(size / 2) * 2`) to prevent subpixel antialiasing seams on Android.

### ADR-004: Natural-Key Cloud Conflict Resolution for Append-Only Tables
- **Decision:** Injected `naturalKey` targets (e.g. `user_id, achievement_id`) into PostgREST upsert conflict specifications.
- **Rationale:** Surrogate UUIDs generated independently across devices violate remote unique constraints, triggering fatal Postgres `23505` errors.
- **Consequence:** Pulled and pushed records converge seamlessly across multiple devices without duplicate XP awards.

### ADR-005: Runtime Drizzle Column Introspection for DTO Mapping
- **Decision:** Created `rowMapping.ts` utilizing Drizzle's `getTableColumns` to mechanically map TypeScript camelCase keys to SQL snake_case column names.
- **Rationale:** PostgREST rejected camelCase properties with `PGRST204` column not found errors.
- **Consequence:** Schema changes automatically update mapping logic without requiring manual synchronization of dictionary constants.

---

## 28. New Engineer Onboarding Checklist

When taking over this repository, complete the following checklist in sequence:

- [ ] **Read this entire document (`docs/DRAGONQUEST-HANDOVER.md`).**
- [ ] **Read [`AGENTS.md`](file:///c:/Users/ashut/Documents/DragonQuest/AGENTS.md)** to internalize project ground rules and tool requirements.
- [ ] **Verify Node & Runtime Environment:** Ensure Node 20+ and npm are active on your workstation.
- [ ] **Install Dependencies:** Run `npm install`.
- [ ] **Verify Database Constraints:** Run `npm run smoke:db` (Must report `SMOKE PASSED`).
- [ ] **Run Test Suite:** Run `npm test` (Must pass all 141 tests across 13 suites).
- [ ] **Run TypeScript Check:** Run `npm run typecheck` (Must report 0 errors).
- [ ] **Run ESLint:** Run `npm run lint` (Must report 0 warnings/errors).
- [ ] **Optional Cloud Setup:** Copy `.env.example` to `.env.local` and provide Supabase credentials if testing cloud sync. (Skip to test offline mode).
- [ ] **Start Expo Dev Server:** Run `npx expo start --clear`.
- [ ] **Test on Mobile Device via Expo Go:**
  - Open Training Center $\rightarrow$ Start a Focus or Mind timer.
  - Test the start sequence, background the app for 10 seconds, and verify wall-clock recovery.
  - Open Physical Training $\rightarrow$ Test input detection and discard confirmation alert.
  - Open Journal $\rightarrow$ Complete today's reflection and verify +30 Mind XP award.
  - Open Profile $\rightarrow$ Verify two-tap sign-out confirmation.
- [ ] **Review [`BUG-BACKLOG.md`](file:///c:/Users/ashut/Documents/DragonQuest/BUG-BACKLOG.md)** before picking up Phase 7 tasks.

---

*Document compiled and verified against the actual repository source code.*  
*DragonQuest Engineering Team — September 2026*
