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
  selectRowsToPull,
  selectRowsToPush,
  type SyncRow,
} from './syncEngine';

const logger = createLogger('sync');

/**
 * Sync service — executes the pure engine's merge plan against SQLite and
 * Supabase. Fire-and-forget by contract: callers never await it in the UI
 * path; failures log and leave the local app fully functional (offline-first).
 *
 * Columns are mirrored 1:1 between SQLite (snake_case) and Postgres, so row
 * transfer is a mechanical map — no per-table logic, no duplicate game rules.
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
  try {
    for (const cfg of SYNC_TABLES) {
      const binding = TABLE_BINDINGS.find((b) => b.name === cfg.name);
      if (!binding) {
        logger.warn(`no local table for ${cfg.name}; skipping`);
        continue;
      }
      const table = binding.table as unknown as {
        id: never;
      };

      // ── Watermarks ────────────────────────────────────────────────────
      const [cursor] = await db
        .select()
        .from(syncCursors)
        .where(eq(syncCursors.tableName, cfg.name))
        .limit(1);
      const lastPushedAt = cursor?.lastPushedAt ?? null;
      const lastPulledAt = cursor?.lastPulledAt ?? null;

      // ── Read local candidates ────────────────────────────────────────
      const localRows = (await db.select().from(table as never)) as unknown as SyncRow[];

      // ── Read remote rows (schema-cached tables are small) ────────────
      const { data: remoteRows, error } = await supabase
        .from(cfg.name)
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;

      // ── Merge plan (pure) ────────────────────────────────────────────
      const pushCandidates = selectRowsToPush(localRows, lastPushedAt);
      const pullCandidates = selectRowsToPull((remoteRows ?? []) as SyncRow[], lastPulledAt);
      const plan = planTableMerge(cfg, pushCandidates, pullCandidates);

      // ── Push (idempotent upserts on client-generated PKs) ────────────
      if (plan.toPush.length > 0) {
        const { error: pushError } = await supabase
          .from(cfg.name)
          .upsert(plan.toPush, { onConflict: 'id', ignoreDuplicates: true });
        if (pushError) throw pushError;
        pushed += plan.toPush.length;
      }

      // ── Pull (upsert into SQLite) ────────────────────────────────────
      for (const row of plan.toApplyLocal) {
        await db
          .insert(table as never)
          .values(row as never)
          .onConflictDoUpdate({ target: table.id, set: row as never });
        pulled += 1;
      }

      // ── Advance cursors ──────────────────────────────────────────────
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
    }
    logger.info(`sync ok (pushed ${pushed}, pulled ${pulled})`);
    return { pushed, pulled, ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('sync failed', message);
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
