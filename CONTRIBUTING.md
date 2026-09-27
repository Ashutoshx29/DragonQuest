# Contributing to DragonQuest

Thank you for your interest in contributing to DragonQuest! We welcome contributions that improve code quality, extend game systems, optimize performance, or fix defects while maintaining the architectural invariants of our offline-first model.

---

## 1. Prerequisites

Before setting up the repository, ensure your environment meets the following requirements:

- **Node.js**: `20.x` or `22.x` LTS
- **Package Manager**: `npm` (uses `package-lock.json`)
- **Mobile Testing**: 
  - Physical device running **Expo Go** (Android or iOS), or
  - Android Studio Emulator / Xcode Simulator configured with Expo tooling.
- **Git**: Working Git CLI with branch support.

---

## 2. Getting Started

### 2.1 Clone and Install
```bash
git clone https://github.com/Ashutoshx29/DragonQuest.git
cd DragonQuest
npm install
```

### 2.2 Environment Configuration (Optional)
DragonQuest is **offline-first by default**. It runs 100% locally with zero cloud configuration.

If you are developing or testing cloud synchronization with Supabase:
```bash
cp .env.example .env.local
```
Fill in your project credentials from your Supabase project dashboard:
```ini
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-publishable-key
```
> [!IMPORTANT]
> Never commit `.env.local` or paste Supabase service-role keys. Row Level Security (RLS) protects data through the publishable anonymous key only.

### 2.3 Starting the Development Server
```bash
npx expo start
```
- Press `a` to open Android Emulator.
- Press `w` to open web preview.
- Or scan the terminal QR code using **Expo Go** on your physical Android or iOS device.

---

## 3. Core Architectural Invariants

Every pull request must uphold the following architectural rules:

1. **Local-First, Offline-Authoritative**:
   - The device's local SQLite database is the single source of truth.
   - UI components and screens interact strictly with local repositories (`src/data/repositories/`) through React hooks.
   - Screen interactions must **never** block on network roundtrips.
2. **Deterministic, Pure Game Engines**:
   - Files in `src/game/engine/` must remain pure TypeScript functions.
   - Game engines must have **zero imports** of React, UI primitives, SQLite, or network clients.
   - All balancing numbers live in `src/game/config/` (never hardcoded inside engine formulas).
3. **Immutable, Append-Only Ledgers**:
   - Tables tracking effort (`xp_transactions`, `daily_completions`, `training_sessions`, `mission_claims`) are strictly append-only.
   - Never update or delete ledger rows; uncompleting an item inserts an inverse correction row.
4. **Idempotent Cloud Synchronization**:
   - Sync push and pull operations must be safe to replay indefinitely without producing duplicate records or inflating XP.
   - Tables with unique business constraints utilize natural-key conflict resolution.
5. **No Type Suppression**:
   - Never use `@ts-ignore`, `@ts-expect-error`, or `any` to bypass TypeScript checks.
   - Resolve types structurally using Drizzle table definitions and domain models.
6. **Continuous Native Generation (CNG)**:
   - Native folders (`/android` and `/ios`) are generated dynamically by Expo.
   - Never create or edit `/android` or `/ios` files directly; configure plugins in `app.json`.

---

## 4. Local Quality Gates (The 5-Gate Suite)

Before submitting a pull request, run the 5 validation gates locally. Every gate must pass cleanly:

```bash
# 1. TypeScript Strict Typecheck
npm run typecheck

# 2. ESLint Flat Configuration Lint
npm run lint

# 3. Database Migration & Constraints Smoke Test
npm run smoke:db

# 4. Jest Unit & Engine Test Suite
npm test

# 5. Production Web Export Verification
npx expo export --platform web
```

---

## 5. Development Workflow

### Adding or Modifying a Screen
- Routes live strictly in `src/app/`. Keep route components thin.
- Extract complex UI components into `src/features/<feature>/components/`.
- Reusable UI primitives belong in `src/design-system/components/`.

### Modifying Database Schema
1. Edit schema definitions in `src/data/db/schema.ts`.
2. Generate migration SQL:
   ```bash
   npx drizzle-kit generate
   ```
3. Update `scripts/sqlite-smoke.mjs` with assertions for any new table or unique constraints.
4. Verify migration validity with `npm run smoke:db`.

### Writing Tests
- Pure engine logic must have unit tests in `src/game/engine/__tests__/`.
- Feature and sync flows belong in `src/services/<service>/__tests__/` or `src/features/<feature>/__tests__/`.
- Run tests in watch mode during development:
   ```bash
   npx jest --watch
   ```

---

## 6. Commit and Pull Request Guidelines

- **Commit Messages**: Use concise, imperative commit messages (e.g., `feat: add recovery breathing cycle timer`, `fix: ensure journal XP cannot be double-awarded`).
- **Single Responsibility**: Keep pull requests focused on a single feature, bug fix, or documentation enhancement. Avoid bundling unrelated dependency updates.
- **Pull Request Checklist**: Fill out the PR template completely, noting which systems were touched and linking relevant issues.
