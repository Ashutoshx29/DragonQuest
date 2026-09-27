# PRE-RUN-READINESS — DragonQuest

**Date:** 2026-09-27 · Audit → Plan → Fix → Review → Verify complete. This document is the pre-run gate record.

---

## 1. Bugs found (14)

| ID | Severity | Area | Summary |
|---|---|---|---|
| G1 | P0-class integrity | Game/challenges | Reward race could double-award challenge XP |
| G2 | P1 | Game/journal | Double-save race could award the daily +30 XP twice |
| T2 | P2 | Training | Finish-early at 0s elapsed awarded 1 minute of XP |
| U1 | P2 | UI | Abort styled as harmless ghost button |
| U2 | P2 | UI/Journal | Save failure was silent + unhandled rejection; text loss risk |
| U8 | P2 | UI/Profile | Sign-out had no confirmation |
| A1 | P2 | Auth | Transport-level sign-in errors → unhandled rejection/redbox |
| P2 | P2 | Performance | Every XP event ran the full progression+achievement pipeline |
| S1 | P3 | Sync UI | Failure banner not driven by background pass results |
| A2 | P3 | Auth | Raw Supabase error text shown to users |
| A3 | P3 | Auth | Session expiry recovery is implicit-only (accepted behavior) |
| P4 | P3 | Deps | 8 installed-but-unused template dependencies |
| U5–U7, U3, U4, P3 | P3 | UI | Recorded checks that passed (tap targets, safe areas, tablet, overlays, board consistency) |
| — | ✅ | Sync/engine/db | Prior-session fixes (23505 idempotency, ring, logger, Reanimated) re-verified, no residual findings |

## 2. Bugs fixed (8)

1. **G1** `challenges.ts` — `rewardCompletedRun` now claims atomically: `UPDATE … WHERE id=? AND status='active' RETURNING id`; XP inserted only when the claim landed. Double-reward impossible.
2. **G2** `journal.ts` — first-save claimed atomically via `INSERT … ON CONFLICT(day) DO NOTHING RETURNING`; XP only when the insert landed; edits update and never re-award. Simpler than before (Ponytail O4).
3. **T2** `TrainingSessionModal.tsx` — Finish-early with <1s elapsed routes to the no-XP abort path; no reward for zero training.
4. **U1** — Abort button is now `variant="danger"`.
5. **U2** `journal.tsx` — save wrapped in try/catch with a visible, non-destructive error line; editor not remounted on failure so text survives.
6. **U8** `profile.tsx` — two-tap sign-out confirm (label flips to "Tap again to confirm" for 3s, timer cleaned up on unmount).
7. **A1** `sign-in.tsx` — `catch` around auth submit maps transport failures to a friendly inline message; no unhandled rejection.
8. **P2** `ProgressionProvider.tsx` — refreshes coalesced (in-flight + queued guard): burst notifications collapse into one snapshot+achievement pass; behavior unchanged, load reduced.

**Deferred (intentional, per AGENTS.md no-bundling rule):** S1 (needs a shared sync-status module), A2 (product copy decisions), P4 (dependency-only commit).

## 3. Architecture changes
**None.** All fixes are localized to existing functions/components; no new services, layers, or dependencies. Sync/Supabase/RLS untouched.

## 4. Security findings
- No secret exposure: `.env*.local` git-ignored; only publishable (anon) key used; logger redacts secret-shaped keys (verified).
- RLS untouched and still the hard boundary; sync injects `user_id` only from the verified session; all reads `.eq('user_id', …)`; policies unchanged in `supabase/migrations/0001_init.sql`.
- No `any`, no error suppression, no type casts added; the one pre-existing `as never`/`as unknown as` drizzle-generic bridging in sync remains (documented, not new).
- `Crypto.randomUUID()` for all ids (crypto-secure).

## 5. UI findings
See BUG-BACKLOG §6. Key states verified in code: loading (`useAsync` keeps prior data, no spinner flash), empty states present on all lists, error states now cover journal save (U2) and auth (A1), modals all have back/close handling, safe areas via `Screen`/`SafeAreaView` edges.

## 6. Performance findings
- Reanimated: zero render-scope shared-value reads remain (13 components audited); worklets transform verified active via `babel-preset-expo` auto-registration (installed SDK source).
- Progression pipeline coalesced (P2 fix).
- Full-ledger queries (`attributes`, `streaks`, `challenge counts`) are personal-scale and sub-100ms today; flagged as the Phase 7 optimization target (indexes/sums), not a pre-run blocker.

## 7. Verification results (all run this session)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx expo lint` | ✅ 0 warnings/errors |
| `npm test` | ✅ 129/129 (12 suites) |
| `npx expo-doctor` | ✅ 21/21 checks |
| `npm run smoke:db` | ✅ PASSED (incl. unique constraints + twin absorption) |
| `npx expo export --platform web` | ✅ |
| `npx expo export --platform android` | ✅ |

## 8. Manual test checklist (Phase 11 — user on device, Expo Go)

**AUTH:** sign up (unconfirmed → confirmation notice) · confirm email · sign in · bad password → friendly inline error · airplane-mode sign-in → network error, no redbox · sign out (two taps) · sign back in · kill + relaunch → session persists.

**SYNC (signed in):** first login initial push/pull · complete a habit → pull/push within ~2s · remote edit (second device/browser) → pulled on foreground · airplane-mode completion → reconnect → auto-retry pushes · sign out/in → achievements/XP/sessions exactly once · `user_achievements` never duplicates (23505 eliminated).

**TRAINING:** start Mind timer · background app mid-session → return → countdown correct · let it complete → reward once · finish early (≥1 min) → partial XP · finish early instantly (0s) → no XP, clean close · abort → confirm dialog, no XP · quick double-taps → no duplicate session/XP.

**GAME:** XP totals update on Home/Profile · level-up ceremony once · attributes increment correctly per source · streak reflects today's training · mission claims appear once across Home + Mission Board · bonus chest once.

**UI:** Home answers "what now?" (character → missions → CTA) · Training ring is a perfect circle, breathes correctly on the hero card · no dev overlays visible (FPS badge off by default; Settings dev card hidden in release) · journal save failure shows retry line without losing text · sync failure banner reads "temporarily unavailable… progress is saved".

## 9. Remaining risks (explicitly accepted)

1. **R1 · Manual-only coverage for device flows:** auth/sync behavior against the live Supabase project needs real-device runs (this environment cannot execute them). Mitigation: checklist §8; automated tests pin the pure/merge logic.
2. **R2 · Sync failure banner (S1):** may show stale failure state until next manual sync; background retries are automatic and data-safe. Phase 7 status module will fix properly.
3. **R3 · Auth error copy (A2):** some Supabase messages remain verbose. No data impact.
4. **R4 · Unused dependencies (P4):** shipped bundle unaffected (tree-shaken/not imported); install weight only. Recommend a dependency-only cleanup commit.
5. **R5 · Ledger-scan queries** scale linearly with history; fine at personal scale, targeted in Phase 7.

## 10. External reviews still to run (honest list — none were available in this environment; equivalents were performed inline per AGENTS.md)

| Tool | Scope to pass | What to ask for |
|---|---|---|
| **CodeRabbit** | `src/services/sync/*`, `src/data/repositories/*`, `src/features/auth/*`, `src/lib/supabase.ts`, this session's diffs | correctness, race conditions, RLS assumptions, error handling, test gaps |
| **Context7** | Supabase JS 2.x auth docs vs `src/lib/supabase.ts` + `AuthProvider` (supabase.com was unreachable from this sandbox) | deprecated auth APIs, session persistence guidance |
| **Vibes Plug** | Training modal, Home, Journal, Auth screens on device | visual hierarchy, contrast, animation smoothness, a11y |
| **GSD (full run)** | `BUG-BACKLOG.md` + `PRE-RUN-READINESS.md` | independent re-planning of deferred items (S1, A2, P4, R5) |

## Pre-run gate

- [x] No P0 bugs
- [x] No P1 bugs
- [x] Auth flow verified (code + tests; device run = §8)
- [x] Sync flow verified (code + tests; device run = §8)
- [x] RLS verified (policies untouched; scoped reads; session-checked writes)
- [x] Offline behavior verified (fire-and-forget sync, retries, local-first commits)
- [x] Duplicate/idempotency behavior verified (constraints + atomic claims + natural-key merge, test-pinned)
- [x] Timer logic verified (timestamp-derived, test-pinned lifecycle)
- [x] Timer ring is circular (measured square, width===height)
- [x] Reanimated warnings caused by our code are gone (full audit + fix + re-audit)
- [x] Production UI has no development overlays (FPS badge `__DEV__`-gated, off by default)
- [x] TypeScript clean · [x] Lint clean · [x] Tests clean · [x] Expo Doctor reviewed · [x] Web export clean · [x] Android export clean

**GATE: PASS → cleared for `npx expo start --clear` and the §8 device checklist.**
