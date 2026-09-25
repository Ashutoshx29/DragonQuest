# DragonQuest — Architecture

> Gamified personal growth & daily routine app. Working title "DragonQuest" — **must be
> renamed before public release** (trademark conflict with Square Enix's Dragon Quest).
> All branding lives in config/assets so the skin is swappable.

## Stack (Phase 1 baseline)

| Layer      | Choice                                   | Notes                                   |
| ---------- | ---------------------------------------- | --------------------------------------- |
| Framework  | Expo SDK 57 (managed) + React Native 0.86 | Windows-friendly; device testing via Expo Go |
| Language   | TypeScript (strict)                      | `@/*` path alias → `src/*`              |
| Navigation | expo-router (file-based)                 | `Tabs` from `expo-router/js-tabs`       |
| Animations | react-native-reanimated 4 (bundled)      | Moti + Lottie planned (Phase 2/9)       |
| Local DB   | expo-sqlite + drizzle-orm (Phase 3)      | Same schema shape as cloud Postgres     |
| UI state   | Zustand (Phase 3)                        | Tiny, no boilerplate                    |
| Backend    | Supabase (Phase 6–7)                     | Postgres + Auth + RLS + Edge Functions  |
| Builds     | EAS Build / Update / Submit              | iOS builds from Windows happen here     |

## Architecture: offline-first, local-source-of-truth, cloud-mirrored

The app never waits on the network. Screens → hooks → **repositories** → local SQLite.
In Phase 7 a sync engine mirrors rows to Supabase (last-write-wins on `updated_at`,
append-only ledgers merge by union). UI code never changes when cloud lands.

```
Presentation (src/app routes + design-system)
    ↓ hooks / stores
Application (src/features/* business logic, src/game/* engine + config)
    ↓ repository interfaces
Data (src/data: sqlite+drizzle now; sync outbox → Supabase in Phase 7)
```

## Ground rules

1. `src/app/` contains **routes only** — thin screens, all logic in features.
2. Features import each other only via their `index.ts` barrel.
3. Every tunable game number lives in `src/game/config/` — rebalancing never touches code.
4. Only repositories may import from `src/data/db/`.
5. Completion dates are **local calendar dates (`YYYY-MM-DD`)**, never UTC timestamps
   (`src/lib/dates.ts` owns day-rollover logic) — streaks depend on it.
6. `daily_completions` + `xp_transactions` are append-only ledgers; all stats are derived.
   (Un-completing inserts a negative correction row; rows are never updated.)

## Data model (entities)

`users` → `profiles` (1:1) → `user_settings` (1:1).
Quest content: `habits`, `routines` (+`routine_items` → habits/tasks), `tasks`, `goals`
(+`milestones`). All content produces rows in `daily_completions` and `xp_transactions`.
`streaks` are derived per-habit + global. Static content: `achievements`, `challenges`,
`quotes`; user progress: `user_achievements`, `user_challenges`. `notifications` is a log.
Full column list lives in the project design doc; schema lands in `src/data/db/schema.ts`.

## Game system

- XP = `base × difficulty multiplier`; level curve `round(100 × n^1.6)` — both in config.
- Daily missions: 3 auto-selected per day; all-3 bonus chest.
- Streaks: multipliers at 7/30/100 days; earnable freeze tokens.
- Achievements: static criteria JSON, evaluated after each completion.
- Challenges: 7/14/30-day programs with checkpoints.

## Phases

1. ✅ **Foundation** — Expo + TS strict + ESLint/Prettier, design tokens, themed
   primitives, root layout + 5 tabs, folder skeleton.
2. ✅ **Design system** — Button/Card/ProgressBar/Badge/Sheet primitives with press
   springs + haptics, SplashGate animated intro, motion presets, logger/haptics/audio
   (stub) services. Today screen showcases the system.
   Phase 9 remains for Lottie ceremonies + real audio + full juice pass.
3. ✅ **Habits/routines/tasks** — SQLite (expo-sqlite) + drizzle schema & hand-written
   reviewed migration, repository layer, habit/task/routine CRUD + completion toggles
   with XP ledger entries, streak engine (pure fns), local-day date utilities,
   quests board screen with quick-add, detail screens with edit/archive/delete.
   Migration SQL verified against drizzle-kit output + node:sqlite smoke test
   (`npm run smoke:db`).
4. ✅ **XP & progression** — level curve engine (base×n^1.6, config-tunable) with
   16 passing unit tests (jest + jest-expo), deterministic daily missions
   (seeded per day, evaluated from completions, idempotent claims via
   mission_claims table), global streak derived from the ledger, XP delta
   toast + level-up ceremony overlay via ProgressionProvider. Today screen is
   now the live dashboard.
5. Full schema & stats — goals, achievements, challenges, quotes, stats screens.
6. Auth — Supabase, email + OAuth, anonymous→account upgrade.
7. Cloud sync — Supabase schema + RLS, outbox sync engine, TanStack Query. ⚠️ hardest
8. Notifications — local reminders first; EAS dev build for push.
9. Animation & juice — ceremonies, sound design, reduced-motion support.
10. Testing & hardening — unit/component/E2E (Maestro), Sentry.
11. Deployment — EAS production builds, Play internal testing, TestFlight, OTA channel.

## Commands

```bash
npm start        # dev server (scan QR with Expo Go on your phone)
npm run check    # eslint + tsc --noEmit
npm run android  # open Android emulator (if installed)
```
