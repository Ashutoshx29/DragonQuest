import { eq, sql } from 'drizzle-orm';

import { db } from '@/data/db/client';
import {
  dailyCompletions,
  goals,
  habits,
  journalEntries,
  milestones,
  missionClaims,
  routines,
  routineItems,
  syncCursors,
  tasks,
  trainingSessions,
  userAchievements,
  userChallenges,
  xpTransactions,
} from '@/data/db/schema';
import { createLogger } from '@/services/logger';
import { getSupabase } from '@/lib/supabase';
import {
  SYNC_TABLES,
  advanceCursor,
  planTableMerge,
  remoteConflictTarget,
  selectRowsToPull,
  selectRowsToPush,
  type SyncRow,
} from './syncEngine';
import { toCloudRow, toLocalRow } from './rowMapping';

const logger = createLogger('sync');

/**
 * Sync service — executes the pure engine's merge plan against SQLite and
 * Supabase. Fire-and-forget by contract: callers never await it in the UI
 * path; failures log and leave the local app fully functional (offline-first).
 *
 * Columns are mirrored 1:1 between SQLite and Postgres by SQL name, so row
 * transfer is a mechanical map — no per-table logic, no duplicate game rules.
 * Drizzle rows (camelCase TS keys) are translated to SQL column names before
 * push and back after pull — see rowMapping.ts for the root-cause story.
 */

export interface SyncResult {
  pushed: number;
  pulled: number;
  ok: boolean;
  error?: string;
}

/**
 * Synced tables in push/pull dependency order, bound to their drizzle
 * objects (named imports keep static analysis and the linter happy).
 */
const TABLE_BINDINGS: { name: string; table: unknown }[] = [
  { name: 'habits', table: habits },
  { name: 'tasks', table: tasks },
  { name: 'routines', table: routines },
  { name: 'routine_items', table: routineItems },
  { name: 'goals', table: goals },
  { name: 'milestones', table: milestones },
  { name: 'daily_completions', table: dailyCompletions },
  { name: 'xp_transactions', table: xpTransactions },
  { name: 'mission_claims', table: missionClaims },
  { name: 'training_sessions', table: trainingSessions },
  { name: 'journal_entries', table: journalEntries },
  { name: 'user_achievements', table: userAchievements },
  { name: 'user_challenges', table: userChallenges },
];

let syncing = false;

/** One sync pass: push → pull → advance cursors. Serialized app-wide. */
export async function syncNow(userId: string): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { pushed: 0, pulled: 0, ok: false, error: 'not-configured' };
  if (syncing) return { pushed: 0, pulled: 0, ok: true }; // already running
  syncing = true;

  let pushed = 0;
  let pulled = 0;
  /** Per-table failures — one bad table must not stall the other twelve. */
  const tableErrors: string[] = [];
  try {
    // Auth at sync time: never run a pass without a live session, and never
    // let a stale caller id diverge from the token's user (RLS relies on
    // auth.uid() to fill/verify user_id). 'no-session' is permanent until the
    // auth state changes — the trigger re-runs on sign-in/foreground.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user || session.user.id !== userId) {
      return { pushed: 0, pulled: 0, ok: false, error: 'no-session' };
    }

    for (const cfg of SYNC_TABLES) {
      const binding = TABLE_BINDINGS.find((b) => b.name === cfg.name);
      if (!binding) {
        logger.warn(`no local table for ${cfg.name}; skipping`);
        continue;
      }
      const table = binding.table as unknown as {
        id: never;
      };

      // Per-table isolation: a failure here is recorded and the loop moves
      // on, so a single unhealthy table can never wedge the whole pipeline
      // (its cursor simply stays put and its rows retry next pass).
      try {
        // ── Watermarks ──────────────────────────────────────────────────
        const [cursor] = await db
          .select()
          .from(syncCursors)
          .where(eq(syncCursors.tableName, cfg.name))
          .limit(1);
        const lastPushedAt = cursor?.lastPushedAt ?? null;
        const lastPulledAt = cursor?.lastPulledAt ?? null;

        // ── Read local candidates ──────────────────────────────────────
        const rawLocalRows = (await db.select().from(table as never)) as unknown as SyncRow[];
        // Drizzle returns camelCase TS keys; the remote schema is SQL-named.
        const localRows = rawLocalRows.map((row) => toCloudRow(cfg.name, row) as SyncRow);

        // ── Read remote rows (schema-cached tables are small) ──────────
        // Scoped to the verified caller (RLS also enforces auth.uid()).
        const { data: remoteRows, error } = await supabase
          .from(cfg.name)
          .select('*')
          .eq('user_id', userId);
        if (error) throw error;

        // ── Merge plan (pure) ──────────────────────────────────────────
        const pushCandidates = selectRowsToPush(localRows, lastPushedAt);
        const pullCandidates = selectRowsToPull((remoteRows ?? []) as SyncRow[], lastPulledAt);
        const plan = planTableMerge(cfg, pushCandidates, pullCandidates);

        // ── Push (idempotent upserts) ──────────────────────────────────
        if (plan.toPush.length > 0) {
          // Append-only ledgers: DO NOTHING makes replayed pushes no-ops —
          // and DO NOTHING on the constraint's REAL columns (user_id +
          // natural key via remoteConflictTarget) is what turns a
          // fresh-uuid twin of an already-synced row into a no-op instead of
          // the 23505 that used to kill the whole pass
          // (user_achievements_unique). user_id is injected from the
          // VERIFIED session — it never travels through the merge plan —
          // and RLS `with check (auth.uid() = user_id)` rejects any row
          // whose user_id is not the caller's, so the injection cannot
          // cross accounts. Mutable tables need a REAL upsert — with
          // ignoreDuplicates a local LWW win over an existing remote row
          // would be silently skipped, the cursor would advance past it,
          // and the edit would never sync.
          const payload = cfg.naturalKey
            ? plan.toPush.map((row) => ({ ...row, user_id: userId }))
            : plan.toPush;
          const { error: pushError } = await supabase.from(cfg.name).upsert(payload, {
            onConflict: remoteConflictTarget(cfg),
            ignoreDuplicates: cfg.appendOnly,
          });
          if (pushError) throw pushError;
          pushed += plan.toPush.length;
        }

        // ── Pull (upsert into SQLite) ──────────────────────────────────
        for (const row of plan.toApplyLocal) {
          // Remote rows are SQL-named; drizzle expects TS keys.
          const local = toLocalRow(cfg.name, row) as never;
          if (cfg.appendOnly) {
            // Ledgers: plain insert-or-ignore. Absorbs BOTH a replayed id
            // and a natural-key twin (remote row under a different
            // surrogate id — the mirror image of the 23505 case) without
            // throwing on the local unique index, and never mutates
            // already-stored rows.
            await db
              .insert(table as never)
              .values(local)
              .onConflictDoNothing();
          } else {
            // Mutable tables: real LWW upsert keyed on the PK.
            await db
              .insert(table as never)
              .values(local)
              .onConflictDoUpdate({ target: table.id, set: local });
          }
          pulled += 1;
        }

        // ── Advance cursors ────────────────────────────────────────────
        // Rows are SQL-named here, so their watermark timestamps are
        // created_at / updated_at — not camelCase.
        const nextPush = advanceCursor(lastPushedAt, plan.toPush);
        const nextPull = advanceCursor(lastPulledAt, plan.toApplyLocal);
        if (nextPush !== lastPushedAt || nextPull !== lastPulledAt) {
          await db
            .insert(syncCursors)
            .values({
              id: `${cfg.name}`,
              tableName: cfg.name,
              lastPushedAt: nextPush,
              lastPulledAt: nextPull,
            })
            .onConflictDoUpdate({
              target: syncCursors.tableName,
              set: { lastPushedAt: nextPush, lastPulledAt: nextPull },
            });
        }
      } catch (tableErr) {
        // Supabase rejects with plain PostgrestError objects (not Error
        // instances) — flatten to their real message/code for the log.
        const msg =
          tableErr instanceof Error
            ? tableErr.message
            : typeof (tableErr as { message?: unknown } | null)?.message === 'string'
              ? ((tableErr as { message: string }).message as string)
              : JSON.stringify(tableErr);
        tableErrors.push(`${cfg.name}: ${msg}`);
        logger.error(`table ${cfg.name} failed; continuing with the rest`, {
          operation: 'syncNow',
          table: cfg.name,
          error: tableErr,
        });
      }
    }

    if (tableErrors.length > 0) {
      // Partial success: healthy tables synced (their cursors advanced), the
      // failed ones retry on the next trigger. Reported as not ok so the
      // trigger's backoff keeps retrying — but the app and the other tables
      // are unaffected either way (offline-first contract).
      logger.error('sync failed', {
        operation: 'syncNow',
        pushed,
        pulled,
        failedTables: tableErrors,
      });
      return { pushed, pulled, ok: false, error: tableErrors.join('; ') };
    }
    logger.info(`sync ok (pushed ${pushed}, pulled ${pulled})`);
    return { pushed, pulled, ok: true };
  } catch (err) {
    // Supabase rejects with PLAIN PostgrestError objects (not Error
    // instances) — String(err) used to yield "[object Object]" and hide the
    // real failure. The logger now flattens error-like objects into their
    // actual fields (name/message/code/details/hint/status).
    const message =
      err instanceof Error
        ? err.message
        : typeof (err as { message?: unknown } | null)?.message === 'string'
          ? ((err as { message: string }).message as string)
          : typeof err === 'object'
            ? JSON.stringify(err)
            : String(err);
    logger.error('sync failed', {
      operation: 'syncNow',
      pushed,
      pulled,
      error: err,
    });
    return { pushed, pulled, ok: false, error: message };
  } finally {
    syncing = false;
  }
}

/** Count local rows for the first-login migration preview. */
export async function countLocalRowsForPreview(): Promise<{
  habits: number;
  tasks: number;
  routines: number;
  goals: number;
  journalEntries: number;
  trainingSessions: number;
  completions: number;
  xpTransactions: number;
}> {
  const count = async (table: unknown): Promise<number> => {
    const [row] = (await db
      .select({ n: sql<number>`count(*)` })
      .from(table as never)) as unknown as { n: number }[];
    return Number(row?.n ?? 0);
  };
  return {
    habits: await count(habits),
    tasks: await count(tasks),
    routines: await count(routines),
    goals: await count(goals),
    journalEntries: await count(journalEntries),
    trainingSessions: await count(trainingSessions),
    completions: await count(dailyCompletions),
    xpTransactions: await count(xpTransactions),
  };
}
