## Summary
A clear and concise summary of the changes made in this pull request and the rationale behind them.

## Subsystems Touched
- [ ] `src/app/` (Routes & Navigation)
- [ ] `src/features/` (Domain feature workflows)
- [ ] `src/game/` (Pure game engines & tuning constants)
- [ ] `src/data/` (SQLite schema & repositories)
- [ ] `src/services/` (Sync engine, logger, haptics, audio)
- [ ] `src/design-system/` (Design tokens & UI primitives)
- [ ] `docs/` (Architecture & project documentation)

## Quality & Verification Gates
Before submitting, verify that all 5 quality gates pass locally:

- [ ] **TypeScript Typecheck**: `npm run typecheck` passes with 0 errors
- [ ] **ESLint Linting**: `npm run lint` passes with 0 errors/warnings
- [ ] **Database Constraints Smoke**: `npm run smoke:db` outputs `SMOKE PASSED`
- [ ] **Unit Tests**: `npm test` passes all tests cleanly
- [ ] **Web Export Test**: `npx expo export --platform web` bundles cleanly

## Security & Architecture Safeguards
- [ ] No secrets, keys, or credentials committed or modified in `.env.local`
- [ ] Local database remains primary source of truth (zero blocking network calls in UI)
- [ ] Append-only ledgers remain immutable (no updating XP transactions or habit history)
- [ ] Supabase Row Level Security (RLS) policies preserved
- [ ] No TypeScript suppression (`@ts-ignore`, `@ts-expect-error`, or `any`) added

## Visual / Device Verification (for UI changes)
- [ ] Tested on physical device (iOS or Android) or verified in emulator
- [ ] Verified safe area insets and virtual navigation bar padding
- [ ] Screenshots/videos attached for visual changes (if applicable)
