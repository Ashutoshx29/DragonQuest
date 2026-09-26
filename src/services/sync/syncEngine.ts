/**
 * Sync engine (pure) — the decision layer for local ⇄ cloud row exchange.
 * No DB, network, or React imports: everything is plain data in → data out,
 * which keeps the merge rules unit-testable and the service layer thin.
 *
 * Merge rules (Decision C):
 * - Append-only ledgers (completions, xp, claims, sessions, achievements):
 *   UNION merge — a row exists in both or it doesn't; replays are no-ops.
 * - Mutable tables (habits, tasks, journal, …): last-write-wins per row on
 *   `updated_at` (or an equivalent timestamp).
 * - Deletes are tombstones (soft-delete columns), so they converge naturally.
 *
 * The cloud NEVER stores or computes progression (XP totals, levels,
 * streaks, mission state). Those are derived on-device by the local game
 * engine from the merged ledgers — there is no duplicate logic by design.
 */

/** Generic synced row: everything is mirrored by column name. */
export interface SyncRow {
  id: string;
  updated_at?: string | null;
  created_at?: string | null;
  [column: string]: unknown;
}

export interface SyncTableConfig {
  /** Local SQLite table name == remote Postgres table name. */
  name: string;
  /** True for append-only ledgers (union merge; push selection by created_at). */
  appendOnly: boolean;
  /** Timestamp column used for watermarking / LWW. */
  timestampColumn: 'updated_at' | 'created_at';
}

/** The synced tables in push/pull dependency order (parents before children). */
export const SYNC_TABLES: SyncTableConfig[] = [
  { name: 'habits', appendOnly: false, timestampColumn: 'updated_at' },
  { name: 'tasks', appendOnly: false, timestampColumn: 'updated_at' },
  { name: 'routines', appendOnly: false, timestampColumn: 'updated_at' },
  { name: 'routine_items', appendOnly: false, timestampColumn: 'created_at' },
  { name: 'goals', appendOnly: false, timestampColumn: 'updated_at' },
  { name: 'milestones', appendOnly: false, timestampColumn: 'created_at' },
  { name: 'daily_completions', appendOnly: true, timestampColumn: 'created_at' },
  { name: 'xp_transactions', appendOnly: true, timestampColumn: 'created_at' },
  { name: 'mission_claims', appendOnly: true, timestampColumn: 'created_at' },
  { name: 'training_sessions', appendOnly: true, timestampColumn: 'created_at' },
  { name: 'journal_entries', appendOnly: false, timestampColumn: 'updated_at' },
  { name: 'user_achievements', appendOnly: true, timestampColumn: 'created_at' },
  { name: 'user_challenges', appendOnly: false, timestampColumn: 'created_at' },
];

/** Which side a merge favors. 'same' = identical timestamps (in sync, no ops). */
export type MergeDecision = 'local' | 'remote' | 'same';

/**
 * Last-write-wins for one mutable row (pure).
 * Missing timestamps fall back to 'local' (never clobber unknown remote state).
 * Identical timestamps mean the row already synced round-trip → 'same'.
 */
export function lwwWinner(
  local: SyncRow | undefined,
  remote: SyncRow | undefined
): MergeDecision | null {
  if (!local && !remote) return null;
  if (!remote) return 'local';
  if (!local) return 'remote';

  const lt = local.updated_at ?? local.created_at ?? null;
  const rt = remote.updated_at ?? remote.created_at ?? null;
  if (!lt || !rt) return 'local';
  const lMs = new Date(lt).getTime();
  const rMs = new Date(rt).getTime();
  if (lMs === rMs) return 'same'; // already converged
  return rMs > lMs ? 'remote' : 'local';
}

/** Rows to push: everything newer than the watermark (pure). */
export function selectRowsToPush(
  localRows: SyncRow[],
  lastPushedAt: string | null
): SyncRow[] {
  if (!lastPushedAt) return localRows;
  const watermark = new Date(lastPushedAt).getTime();
  return localRows.filter((row) => {
    const ts = row.updated_at ?? row.created_at;
    if (!ts) return true; // no timestamp → always safe to (re)push
    return new Date(ts).getTime() > watermark;
  });
}

/** Rows to pull: remote rows newer than the watermark (pure). */
export function selectRowsToPull(
  remoteRows: SyncRow[],
  lastPulledAt: string | null
): SyncRow[] {
  if (!lastPulledAt) return remoteRows;
  const watermark = new Date(lastPulledAt).getTime();
  return remoteRows.filter((row) => {
    const ts = row.updated_at ?? row.created_at;
    if (!ts) return true;
    return new Date(ts).getTime() > watermark;
  });
}

export interface MergePlan {
  /** Local rows that win and must be written to the remote. */
  toPush: SyncRow[];
  /** Remote rows that win and must be written to the local DB. */
  toApplyLocal: SyncRow[];
}

/**
 * Full merge for one table (pure): union for append-only ledgers, LWW for
 * mutable rows. Idempotent — merging the same data twice yields no ops.
 */
export function planTableMerge(
  cfg: SyncTableConfig,
  localRows: SyncRow[],
  remoteRows: SyncRow[]
): MergePlan {
  const localById = new Map(localRows.map((r) => [r.id, r]));
  const remoteById = new Map(remoteRows.map((r) => [r.id, r]));

  if (cfg.appendOnly) {
    // Union: push rows the remote lacks, apply rows the local DB lacks.
    const toPush = localRows.filter((r) => !remoteById.has(r.id));
    const toApplyLocal = remoteRows.filter((r) => !localById.has(r.id));
    return { toPush, toApplyLocal };
  }

  const toPush: SyncRow[] = [];
  const toApplyLocal: SyncRow[] = [];
  for (const row of localRows) {
    if (lwwWinner(row, remoteById.get(row.id)) === 'local') toPush.push(row);
  }
  for (const row of remoteRows) {
    if (lwwWinner(localById.get(row.id), row) === 'remote') toApplyLocal.push(row);
  }
  // Ties ('same') produce no ops — the row already converged on both sides.
  return { toPush, toApplyLocal };
}

/** Advance a watermark to the newest timestamp seen (pure). */
export function advanceCursor(current: string | null, rows: SyncRow[]): string | null {
  let newest = current ? new Date(current).getTime() : 0;
  for (const row of rows) {
    const ts = row.updated_at ?? row.created_at;
    if (!ts) continue;
    const t = new Date(ts).getTime();
    if (t > newest) newest = t;
  }
  return newest > 0 ? new Date(newest).toISOString() : current;
}

export interface MigrationPreviewCounts {
  habits: number;
  tasks: number;
  routines: number;
  goals: number;
  journalEntries: number;
  trainingSessions: number;
  completions: number;
  xpTransactions: number;
}

/** Sum a preview count list into a single "N items" number (pure). */
export function totalPreviewItems(counts: MigrationPreviewCounts): number {
  return (
    counts.habits +
    counts.tasks +
    counts.routines +
    counts.goals +
    counts.journalEntries +
    counts.trainingSessions +
    counts.completions +
    counts.xpTransactions
  );
}
