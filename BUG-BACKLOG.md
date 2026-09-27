# BUG-BACKLOG — Pre-Run Production/QA Audit

**Audit date:** 2026-09-27 · **Auditor:** Buffy (Freebuff). GSD / Context7 / Vibes Plug / Ponytail / CodeRabbit equivalents were performed **inline per AGENTS.md** — no external plugin is callable from this environment and **no plugin results are fabricated**. External re-run scope is listed in `PRE-RUN-READINESS.md`.

**Baseline at audit start:** Expo SDK 57 (`~57.0.25`), RN 0.86.3, Reanimated 4.5.1 + worklets 0.10.1, Supabase JS 2.117.2, drizzle-orm 0.45.3, React 19.2.3. Baseline verification: `tsc` 0 errors · `expo lint` clean · 129/129 tests · `smoke:db` PASSED.

**Note on prior work:** the working tree already contains the completed 23505-sync-idempotency fix, timer-ring fix, dev-FPS-badge, logger hardening, and TrainingCard Reanimated fix — all previously verified. They are listed here only where this audit found **residual** issues.

Severity legend: **P0** crash/data-loss/security/correctness · **P1** major functional bug · **P2** significant UX/perf issue · **P3** polish/dev warning.

---

## 1. AUTH

### A1 · P2 · Unhandled sign-in promise rejection can crash the app in dev (redbox in prod fatal path)
- **File:** `src/app/(auth)/sign-in.tsx` (`submit`), `src/features/auth/AuthProvider.tsx`
- **Observed behavior:** `submit()` awaits `signInWithPassword`/`signUp` inside `try { … } finally { … }` with **no `catch`**. The providers already map Supabase errors to strings, but any *unexpected* rejection (network timeout, offline DNS failure thrown before Supabase returns an error object, `fetch` failure) propagates out of the pressable as an unhandled rejection → RN redbox in dev, crash-log noise in release; the user sees a dead "Sign in" press with no message.
- **Likely root cause:** error mapping covers *Supabase-returned* errors only; transport-level exceptions are uncaught.
- **Evidence:** `sign-in.tsx` lines 27–43 (`try`/`finally`, no `catch`); `AuthProvider.signInWithPassword` returns `{ error }` only for `supabase.auth` errors.
- **Proposed fix:** add `catch` in `submit()` → `setError('Network error — check your connection and try again.')`. Smallest change, keeps provider contract.
- **Verification:** airplane-mode sign-in attempt on device shows inline error, no redbox; `tsc` + lint.

### A2 · P3 · Offline first sign-in shows a confusing Supabase raw message
- **File:** `sign-in.tsx` (error rendering), `AuthProvider.tsx`
- **Observed behavior:** offline sign-in surfaces Supabase's internal message (e.g. `TypeError: Network request failed` / fetch text) verbatim in the danger caption.
- **Root cause:** raw `error.message` is user-facing text.
- **Proposed fix:** map well-known auth failures (`Invalid login credentials`, `Email not confirmed`, network) to friendly copy; keep the raw text in the logger. **Product-copy decision → deferred to manual phase unless approved.**
- **Verification:** manual matrix: bad password, unconfirmed email, offline.

### A3 · P3 · Session-expiry recovery is implicit only
- **File:** `AuthProvider.tsx`, `syncTriggers.ts`
- **Observed behavior:** an expired/refresh-failed session drops to `signedOut` via `onAuthStateChange`; sync guard returns `no-session`. Correct, but the UI shows nothing until the user visits Profile. Not a bug — recorded as accepted behavior. **No action.**

## 2. SYNC

### S1 · P1 · Stale sync-failure banner persists after a successful manual sync in the same session edge case
- **File:** `src/features/auth/useSyncStatus.ts`
- **Observed behavior:** the Profile banner reads `syncStatus.lastResult`, which is **only set by the manual `sync()` button**. The background trigger's results never reach it; if a background pass failed and a later background pass succeeded, Profile (if already showing `lastResult.ok === false`) keeps displaying the failure copy until the user taps "Sync now".
- **Root cause:** two sources of truth for sync outcome (trigger-local counters vs hook state).
- **Proposed fix (smallest):** in `useSyncStatus.sync()`, always refresh `lastResult` (already does) AND render the failure copy only when `syncing === false` — acceptable as-is; real fix is a shared status module. Chosen: **defer (P3-cost)** — banner copy is honest ("will retry") and background retries are automatic; note for Phase 7 status module.
- **Verification:** manual: fail sync offline → reconnect → banner clears after next foreground pass (verify on device).

### S2 · ✅ Verified correct (no action) — the prior 23505 fix
Natural-key union merge (`user_achievements_unique` etc.), `user_id`-injected `onConflict: 'user_id,achievement_id'` DO NOTHING push, `onConflictDoNothing` ledger pull, per-table error isolation, verified-session guard (`session.user.id !== userId`), RLS untouched. Tests pin all of it (`syncEngine.test.ts` 23505 regression suite, `rowMapping.test.ts` user_id tests, smoke twin-absorption). **No residual finding.**

## 3. GAME ENGINE

### G1 · P0 (data-integrity) → fix now · Challenge reward race can double-award XP on rapid double-tap
- **File:** `src/data/repositories/challenges.ts` (`rewardCompletedRun`), `src/features/training/hooks/useChallenges.ts` (`syncRewards`), `src/app/(tabs)/training.tsx` (`startProgram`)
- **Observed behavior:** `rewardCompletedRun` does read (`status==='active'`) → update(`completed`) → insert XP. It is guarded by UI (`busy === def.id` disables one button) but `syncRewards` iterates the **stale memoized `board`**; two overlapping calls (double-tap on BEGIN → two `start()`s… more precisely: `syncRewards` runs on program start, and can be re-entered by another start while a previous one is mid-loop, or the button re-enabled while `reload()` is in flight since `busy` clears in `finally` before `reload()`'s async board refresh lands) can both read `status==='active'` before either update commits → **two XP ledger rows for one challenge**. Local-only (SQLite is single-connection JS, so truly-simultaneous awaits interleave only at await points — but the two-await window here is real).
- **Likely root cause:** check-then-act without an atomic conditional update.
- **Evidence:** `challenges.ts` `rewardCompletedRun` (select → update → insert); `useChallenges.syncRewards` loop over memoized `board`.
- **Proposed fix (smallest, atomic):** replace read-then-update with a **conditional update first**: `UPDATE user_challenges SET status='completed', finished_day=? WHERE id=? AND status='active'` and check drizzle `.returning()`/`changes` — insert XP only when the conditional update actually transitioned the row. Same pattern already proven in `achievements.ts`. No schema change; idempotent by the row's own status.
- **Verification:** unit-style smoke via node sqlite (conditional-update guard), manual double-tap test, full suite.

### G2 · P1 → fix now · Journal double-save race awards the +30 XP twice
- **File:** `src/data/repositories/journal.ts` (`saveJournalEntry`)
- **Observed behavior:** save = select(`day`) → if none: insert + insert XP. The editor's save button is disabled while `saving`, but the same day can be saved **twice via two quick invocations from the effect path** (`useJournal.save` guarded by `saving` state — a `setSaving(true)` is async state; two calls in the same tick both read `saving===false`). If both pass the select-before-insert, both insert XP rows (+60 XP for one entry). Also, `save()` awaited twice from a rerender race is plausible on slow devices.
- **Root cause:** check-then-act; uniqueness exists (`journal_entries_unique_day`) but the XP insert is not conditioned on the entry insert.
- **Proposed fix (smallest, atomic):** use `INSERT … ON CONFLICT(day) DO NOTHING .returning()`; **award XP only when `returning()` is non-empty** (first insert of the day). If empty → it was an update → `xpAwarded: 0` and perform the update branch. Same proven pattern as achievements. Removes the pre-select entirely (also simpler — Ponytail-approved).
- **Verification:** new smoke assertion (`INSERT OR IGNORE`-style guard on `journal_entries_unique_day`), manual double-save, suite.

### G3 · ✅ Verified correct — XP totals/attributes/streaks/achievements
`getXpTotals` bounds "today" via local-midnight ISO (correct lexicographic compare); attributes derive from ledger with unknown-source + non-positive guards; achievement unlock is atomic since the prior fix (`onConflictDoNothing().returning()` gates XP). **No action.**

## 4. TRAINING / TIMER

### T1 · ✅ Verified correct — timer lifecycle
Timestamp-derived countdown (`startedAt + duration`), self-correcting after background (pinned by `timer.test.ts`), completion fired once via `completedRef` + host `completionInFlightRef` double-guard, keyed remount per session, minimize keeps wall clock. Ring is a measured square (`onLayout`, width===height from one variable). **No action.**

### T2 · P2 → fix now · `Finish early` on an idle/timer-not-started state can award ≥1 minute for ~0 seconds
- **File:** `src/features/training/components/TrainingSessionModal.tsx` (`partialPreview`, `handleFinishEarly`), `src/game/config/training.ts`
- **Observed behavior:** during the start sequence ("READY 3 2 1 TRAIN", ~3s) the footer is replaced by the beat display — good — but **`handleFinishEarly` is reachable in the same tick the sequence ends** with `elapsedForDisplay = 0`; `computeTrainingXpPure(kind, max(1, round(0/60))*60)` floors to 1 minute → a user tapping Finish Early immediately after TRAIN gets 1 minute of XP for 0 seconds trained. Minor but wrong-direction economy leak; visible only via quick taps.
- **Root cause:** the partial-XP formula's `Math.max(1, …)` minute floor is applied even when elapsed is 0.
- **Proposed fix (smallest):** in `handleFinishEarly`, early-return (no reward) when `elapsedForDisplay < 1`; guard `partialPreview` display the same way. Timer logic itself untouched.
- **Verification:** unit: `computeTrainingXpPure(kind,0)` unchanged (pure layer stays); UI: start → TRAIN → instant Finish Early → "no XP" path (abort-confirm behavior) on device.

## 5. DATABASE

### D1 · ✅ Verified correct
Migrations bundle committed & imported (`drizzle/migrations.js` + journal); smoke covers the unique constraints incl. the twin-absorption; uuids via `expo-crypto.randomUUID()`; nullable fields match remote DDL; row mapping derived from schema (`getTableColumns`) so drift is impossible by construction; `REMOTE_ONLY_COLUMNS` documented for `user_id`. **No action.**

## 6. UI / UX (Vibes-Plug-equivalent)

### U1 · P2 → fix now · Destructive "Abort" button has no danger styling and sits next to "Finish early"
- **File:** `TrainingSessionModal.tsx` footer
- **Observed behavior:** Abort uses `variant="ghost"` — same visual weight as a cancel action; adjacent to the secondary "Finish early" button. The confirm dialog exists (good), but the *entry* to a reward-destroying action should be visually distinguished. Small-screen: both buttons fit (flex row, sm size).
- **Fix:** `variant="danger"` for Abort. One-token change, no layout shift.
- **Verification:** visual on device; a11y role unchanged.

### U2 · P2 → fix now · Journal editor save gives no disabled/loading distinction and loses unsaved text on remount
- **File:** `src/app/(tabs)/journal.tsx`, `src/features/journal/components/JournalEditor.tsx` (keyed by `journal.todayEntry?.id`)
- **Observed behavior:** `key={journal.todayEntry?.id ?? 'new-draft'}` remounts the editor when the fetched entry id changes (e.g. after save → reload returns the new id). Any keystrokes typed between typing and the save reload landing are preserved **only if** the save succeeded (entry round-trips). If the save *fails* (disk/IO error), the editor remounts to the stale entry and the user's text is lost silently — no error state is rendered anywhere in the journal flow (`useJournal.save` rethrows; `handleSave` awaits unguarded → unhandled rejection, same class as A1).
- **Fix (smallest):** wrap `handleSave` in try/catch → set a visible error line ("Couldn't save — try again"); keep text (do not remount on failure: only keyed by id when an entry actually exists AND save succeeded — achieved by not changing state on failure). 
- **Verification:** manual: save offline (web export with DB working — IO failure path is hard to force; at minimum verify no unhandled rejection in console on forced error) + suite.

### U3 · P3 · Mission Board/Home dual-claim state is consistent (verified) — `notifyBoardChanged` bridge works; no action.
### U4 · P3 · `RewardOverlay` self-dismisses at 2600ms and `onDone`/`onDismiss` both clear state — no duplicate ceremony risk found (single `key`-less render guarded by `reward` null-check). **No action.**
### U5 · P3 · Tap targets: `Button` sm = 36px height (below 44px Apple HIG for standalone targets, acceptable inside 48px rows); `IconButton` is 44×44 ✅; segmented mode buttons on sign-in have ≥44px touch rows ✅. **No action (recorded).**
### U6 · P3 · iPad/large-screen: layouts are flex/percent-based, ring bounded at 340, hero cards stretch gracefully; `supportsTablet: true` in app.json with no layout that hard-codes phone width. **No action (recorded).**
### U7 · P3 · Safe areas: `Screen` defaults to top edge; tab bar covers bottom (tab navigator); modals use explicit `edges={['top','bottom','left','right']}`. **No action.**
### U8 · P2 → fix now · Profile "Sign out" has no confirmation
- **File:** `src/app/(tabs)/profile.tsx`
- **Observed behavior:** single tap signs out immediately. Sync is idempotent so no data risk, but a pocket-tap ends the session and (on next launch) requires re-auth — an annoying, irreversible-in-the-moment action with zero friction.
- **Fix (smallest):** two-tap confirm using existing state (label flips to "Tap again to confirm", resets after 3s). No new modal component needed.
- **Verification:** manual.

## 7. PERFORMANCE (Reanimated/render audit — prior cleanup re-verified)

### P1 · ✅ Gone — the render-scope shared-value read in `TrainingCard` was fixed last session (`glowStyle` worklet); audit re-checked all 13 animated components: zero render-scope `.value` reads/writes remain; `babel-preset-expo` auto-registers the worklets plugin (verified in installed SDK source `babel-preset-expo/build/configs/expo.js:96-100`), so worklets transform is active. **No action.**

### P2 · P2 → fix now · `ProgressionProvider.refresh()` runs achievement evaluation on EVERY xp event, and xp events fire per completion + per sync pull
- **File:** `src/features/progression/ProgressionProvider.tsx`
- **Observed behavior:** every `notifyXpChanged()` triggers `getProgressionSnapshot()` (≈4 queries incl. full-ledger attribute scan) **plus** `checkAndUnlockAchievements()` (another full stats build incl. streak recompute over all completion rows). During a sync pull that touches many rows, `notifyXpChanged` fires once per pass — acceptable — but during habit-toggle bursts each toggle runs the full pipeline twice (mutation + board notify). Personal-scale data keeps this sub-100ms today; it is the single biggest avoidable main-thread cost and will degrade with data volume.
- **Fix (smallest, no behavior change):** coalesce refreshes with a microtask/idle guard — if a refresh is already scheduled/running, skip scheduling another (dedupe), preserving "at least one refresh after the last notify". ~10 lines in the provider; no API change.
- **Verification:** suite + manual burst-toggle on device; console timing optional.

### P3 · P3 · `useAsync` deps spread (`[...deps, tick]`) is a lint-disabled pattern but correct here (documented, deliberate). **No action.**
### P4 · P3 · 7 installed-but-unused template dependencies (`expo-glass-effect`, `expo-symbols`, `expo-device`, `expo-web-browser`, `expo-image`, `expo-linking`, `expo-system-ui`, `@expo/ui`) — verified zero imports in `src/`. They bloat installs but none ship native code that breaks CNG/Expo Go. **Removal deferred** (needs one `npm install` cycle + doctor re-run; do not bundle with correctness fixes). Recorded in OVERENGINEERING-REVIEW.md.

## 8. CONTEXT7 / DOC VALIDATION (Phase 2 results)

All version-sensitive APIs verified against **installed** sources/docs — no deprecated usage found:

| API | Verified against | Result |
|---|---|---|
| `expo-router/js-stack` import | installed `expo-router@57.0.23` ships `js-stack.js` → `build/layouts/JSStack` | ✅ valid in SDK 57 |
| Reanimated worklets transform | `babel-preset-expo` auto-registers `react-native-worklets/plugin` when installed (SDK 57 source, lines 96–100); manual plugin correctly absent from `babel.config.js` | ✅ correct config |
| Reanimated 4.5.1 ↔ RN 0.86 ↔ worklets 0.10.1 | Reanimated 4.x compatibility table (fetched) | ✅ supported matrix |
| `useSharedValue` render rules | Reanimated 4.x docs (fetched) — "don't read/modify during render" | ✅ codebase compliant after prior fix |
| Supabase auth (`signInWithPassword`/`signUp`/`signOut`, `onAuthStateChange`, sqlite localStorage persistence, AppState-scoped autoRefresh) | Expo "Using Supabase" guide pattern (doc fetch of supabase.com blocked by sandbox DNS; verified against official Expo guide already linked in `src/lib/supabase.ts` comments and SDK typings) | ✅ correct shape; external Context7 re-run recommended |
| expo-sqlite `openDatabaseSync` + drizzle expo driver/migrator | installed SDK 57 packages | ✅ |

**No P2+/doc-drift findings.** (Supabase docs page unreachable from this sandbox — flagged for external Context7 pass, not a code finding.)

---

## Priority-ordered fix list (Phase 7 batches)

| Batch | Finding | Severity |
|---|---|---|
| 1 — data integrity | G1 challenge reward race | P0-class integrity |
| 1 — data integrity | G2 journal double-XP race | P1 |
| 2 — training correctness | T2 zero-second finish-early XP | P2 |
| 3 — UI/UX | U1 abort danger styling · U2 journal save error handling · U8 sign-out confirm | P2 |
| 4 — performance | P2 progression refresh coalescing | P2 |
| Deferred | A2 copy mapping · S1 status module · P4 unused deps · A3 | P3 |

No P0 crash/security finding exists in the current tree; G1 is P0-class **data integrity** (double XP = corrupted economy, matches the user's earlier "no duplicate XP" acceptance bar).
