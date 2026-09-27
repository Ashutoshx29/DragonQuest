/**
 * Row mapping between the local SQLite (drizzle) layer and the cloud schema.
 *
 * ROOT CAUSE of the Phase 6 training sync failure: drizzle's `db.select()`
 * returns rows keyed by the TypeScript property names (camelCase —
 * `durationSec`, `payloadJson`, `scheduleJson`, `completedAt`…), while the
 * Supabase tables mirror the SQL column names (snake_case — `duration_sec`,
 * `payload_json`…). Pushing drizzle rows verbatim sent camelCase keys to
 * PostgREST, which rejected every push with PGRST204 ("Could not find the
 * 'X' column of 'training_sessions' in the relationship schema"). Training
 * was the first flow users completed, so `training_sessions` was the first
 * table to surface the error.
 *
 * The cloud columns are MIRRORED 1:1 by SQL name with SQLite (both
 * snake_case); only drizzle's TS property names differ. So the map is
 * mechanical: for each bound table, translate local rows TS-key → SQL
 * column before push, and remote rows (already SQL-named) SQL column →
 * TS key before writing into SQLite. No game logic lives here — the cloud
 * never computes progression (see syncEngine.ts).
 *
 * The per-table column lists are derived FROM the drizzle schema objects at
 * runtime (getTableColumns: TS key → SQL name), so a schema change cannot
 * silently desynchronize this map — a new column starts syncing with no
 * edit here.
 */

import { getTableColumns } from 'drizzle-orm';

import {
  dailyCompletions,
  goals,
  habits,
  journalEntries,
  milestones,
  missionClaims,
  routines,
  routineItems,
  tasks,
  trainingSessions,
  userAchievements,
  userChallenges,
  xpTransactions,
} from '@/data/db/schema';
import { createLogger } from '@/services/logger';

const logger = createLogger('sync-map');

/**
 * Synced tables keyed by their remote (== local SQL) name, bound to the
 * drizzle objects. Order matches SYNC_TABLES (parents before children).
 * Columns are introspected from the schema — see deriveColumnMap below.
 */
const TABLE_OBJECTS = {
  habits,
  tasks,
  routines,
  routine_items: routineItems,
  goals,
  milestones,
  daily_completions: dailyCompletions,
  xp_transactions: xpTransactions,
  mission_claims: missionClaims,
  training_sessions: trainingSessions,
  journal_entries: journalEntries,
  user_achievements: userAchievements,
  user_challenges: userChallenges,
} as const;

export type SyncTableName = keyof typeof TABLE_OBJECTS;

/**
 * TS key → SQL column name per table, derived from the drizzle schema
 * (getTableColumns: { tsKey: { name: sqlName } }) so the map can never
 * drift from the real local schema.
 */
const COLUMN_MAPS = Object.fromEntries(
  (Object.entries(TABLE_OBJECTS) as [SyncTableName, object][]).map(([name, table]) => {
    const map: Record<string, string> = {};
    for (const [tsKey, col] of Object.entries(
      getTableColumns(table as never) as Record<string, { name: string }>
    )) {
      map[tsKey] = col.name;
    }
    return [name, map];
  })
) as Record<SyncTableName, Record<string, string>>;

/** Inverted maps (SQL column → TS key) for the pull direction. */
const REVERSE_COLUMN_MAPS: Record<SyncTableName, Record<string, string>> =
  Object.fromEntries(
    (Object.entries(COLUMN_MAPS) as [SyncTableName, Record<string, string>][]).map(
      ([name, map]) => [
        name,
        Object.fromEntries(Object.entries(map).map(([tsKey, sql]) => [sql, tsKey])),
      ]
    )
  ) as Record<SyncTableName, Record<string, string>>;

/**
 * Remote-only cloud columns, dropped on pull BY DESIGN (never a schema
 * drift warning). `user_id` exists on every cloud table for RLS ownership
 * (`auth.uid() = user_id`) but NOT in SQLite: local rows are single-user by
 * construction (one device database) and the engine's union/LWW merge keys
 * on id / natural identity — reconciliation NEVER reads user_id. Reads stay
 * scoped remotely: syncService pulls with `.eq('user_id', userId)` where
 * userId is verified against the live session (auth.uid()), and RLS is the
 * hard boundary. Dropping it here is therefore safe AND required — pushing
 * it back would be a no-op at best (auth.uid() default) and a cross-account
 * write attempt at worst.
 */
const REMOTE_ONLY_COLUMNS: Partial<Record<SyncTableName, string[]>> = {
  // Every synced table has the RLS ownership column; nothing else is remote-only today.
  ...Object.fromEntries(
    (Object.keys(TABLE_OBJECTS) as SyncTableName[]).map((name) => [name, ['user_id']])
  ),
} as Partial<Record<SyncTableName, string[]>>;

/** True when a table has a camelCase ↔ snake_case mismatch to map. */
export function tableNeedsMapping(name: string): boolean {
  const map = COLUMN_MAPS[name as SyncTableName];
  if (!map) return false;
  return Object.entries(map).some(([tsKey, sqlName]) => tsKey !== sqlName);
}

/**
 * Local (drizzle) row → cloud DTO: TS property names → SQL column names.
 * `id` is always kept. Unknown keys are dropped (they cannot be stored
 * remotely); the logger surfaces them in dev so schema drift is visible.
 */
export function toCloudRow(tableName: string, row: Record<string, unknown>): Record<string, unknown> {
  const map = COLUMN_MAPS[tableName as SyncTableName];
  if (!map) return row;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const sqlName = map[key];
    if (sqlName === undefined) {
      logger.debug(`push: dropping unknown local key ${tableName}.${key}`);
      continue;
    }
    out[sqlName] = value;
  }
  if (!('id' in out)) out.id = row.id;
  return out;
}

/**
 * Cloud row → local (drizzle) shape: SQL column names → TS property names,
 * so the row can be upserted into SQLite via drizzle. `id` is always kept.
 */
export function toLocalRow(tableName: string, row: Record<string, unknown>): Record<string, unknown> {
  const reverse = REVERSE_COLUMN_MAPS[tableName as SyncTableName];
  if (!reverse) return row;
  const remoteOnly = REMOTE_ONLY_COLUMNS[tableName as SyncTableName] ?? [];
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    // Remote-only ownership columns (user_id) are dropped by design — see
    // REMOTE_ONLY_COLUMNS — silently and without a drift warning.
    if (remoteOnly.includes(key)) continue;
    const tsKey = reverse[key];
    if (tsKey === undefined) {
      logger.debug(`pull: dropping unknown remote key ${tableName}.${key}`);
      continue;
    }
    out[tsKey] = value;
  }
  if (!('id' in out)) out.id = row.id;
  return out;
}
