# OVERENGINEERING-REVIEW (Ponytail-equivalent, performed inline per AGENTS.md)

**Scope:** every major subsystem. Rule applied: flag abstraction/duplication/speculative infrastructure; **never** simplify away auth, RLS, offline behavior, persistence, idempotency, validation, or security boundaries.

## Verdict summary
The codebase is **disciplined, not over-engineered**. Architecture is consistent: pure engine (`src/game/engine`) ← config (`src/game/config`) → repositories (`src/data/repositories`) → hooks → screens. No parallel implementations were found. Two prior fixes (idempotent sync, atomic unlocks) set patterns the rest of the code should reuse — this review's concrete suggestions do exactly that (G1/G2 reuse the atomic-insert pattern).

## Findings

### O1 · Keep — pure engine / repo / hook layering
Not speculative: engines are unit-tested in isolation (12 suites, 129 tests run without a device). This layering is *why* the audit could verify streak/attribute/mission math without booting the app. **Keep.**

### O2 · Keep — `xpEvents.ts` pub/sub
Tiny (2 files, ~40 lines), replaces prop-drilling or a state library pre-Phase-7, documented exit path (TanStack Query comment). Not premature. **Keep.**

### O3 · Remove (deferred, safe) — 8 unused dependencies
`expo-glass-effect`, `expo-symbols`, `expo-device`, `expo-web-browser`, `expo-image`, `expo-linking`, `expo-system-ui`, `@expo/ui` — **zero imports** in `src/`, none in `app.json` plugins. Template leftovers. None ship breaking native code, so removal is *not* urgent; it costs one `npm install` + doctor cycle. **Recommend removal in a dedicated dependency-only commit** — not bundled with this audit's correctness fixes (AGENTS.md: no bundling unrelated changes).

### O4 · Simplify (applied in this pass) — journal saveJournalEntry pre-select
The select-then-insert-then-award flow was both racy (G2) and more complex than needed. Replaced with the single atomic `onConflictDoNothing().returning()` pattern already used by achievements — **less** code, correct by constraint. (Implemented in Phase 7.)

### O5 · Keep — `REMOTE_ONLY_COLUMNS` / naturalKey config in sync
These look like "extra config" but are the *securities*: documented drop-list for the RLS ownership column, and the constraint-identity table that prevents the 23505 class. Removing either would trade clarity for a bug class. **Keep.**

### O6 · Keep (documented) — `useAsync` manual data hook
Phase-7-marked for TanStack Query replacement; shape-compatible. Replacing it now would be churn without user value. **Keep until Phase 7.**

### O7 · Flag (do not act) — dual "board changed" channels
`useDailyMissions` subscribes via `onBoardChanged` while `TrainingCard`-style screens also `reload()` imperatively after mutations. Today they can't disagree (both end in `reload()`), but two refresh idioms exist. **Not simplified now** — it is load-bearing for cross-screen consistency; revisit in Phase 7 when Query invalidation unifies it.

### O8 · Keep — per-table error isolation + trigger backoff in sync
This is correctness infrastructure (one bad table must not wedge the pipeline), not gold-plating. **Keep.**

## Dependencies audit (evidence)
Checked every non-obvious dependency for actual imports under `src/`:
- **Used:** expo-router, expo-sqlite, expo-crypto, expo-haptics, expo-splash-screen, expo-linear-gradient, expo-status-bar, @expo/vector-icons, reanimated, worklets, gesture-handler, screens, safe-area-context, web, supabase-js, drizzle-orm.
- **Unused (see O3):** the 8 listed packages.
- No dependency does something Expo/RN already supports natively (Sheet = RN Modal ✅, Input = RN TextInput ✅, charts = hand-rolled with Reanimated ✅ by design).

## Explicit non-simplifications (per the rules)
- RLS + verified-session sync guard — untouched.
- Idempotency layer (natural keys, conflict targets, atomic unlocks) — untouched; extended via G1/G2.
- Offline-first fire-and-forget sync with retries — untouched.
- Migration/generation discipline (CNG, committed drizzle bundle) — untouched.
