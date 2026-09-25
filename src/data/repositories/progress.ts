import { desc, gte, sql } from 'drizzle-orm';

import { db } from '../db/client';
import { dailyCompletions, habits, tasks, xpTransactions } from '../db/schema';
import { addDays, parseDayString, todayString } from '@/lib/dates';

export interface XpTotals {
  totalXp: number;
  todayXp: number;
}

export interface DaySummary {
  day: string;
  completions: number;
  xp: number;
}

export async function getXpTotals(): Promise<XpTotals> {
  const [totals] = await db
    .select({ total: sql<number>`coalesce(sum(${xpTransactions.amount}), 0)` })
    .from(xpTransactions);
  const today = todayString();
  // Local midnight expressed as a UTC ISO string — ISO timestamps compare
  // lexicographically, so this bounds "today" correctly in any timezone.
  const todayStartIso = parseDayString(today).toISOString();
  const [todayRow] = await db
    .select({ today: sql<number>`coalesce(sum(${xpTransactions.amount}), 0)` })
    .from(xpTransactions)
    .where(gte(xpTransactions.createdAt, todayStartIso));
  return {
    totalXp: Number(totals?.total ?? 0),
    todayXp: Number(todayRow?.today ?? 0),
  };
}

/** Per-day completion counts and XP for the last N days (inclusive). */
export async function getRecentDays(nDays: number): Promise<DaySummary[]> {
  const from = addDays(todayString(), -(nDays - 1));
  const rows = await db
    .select({
      day: dailyCompletions.day,
      completions: sql<number>`count(*)`,
      xp: sql<number>`coalesce(sum(${dailyCompletions.xpAwarded}), 0)`,
    })
    .from(dailyCompletions)
    .where(gte(dailyCompletions.day, from))
    .groupBy(dailyCompletions.day);

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: DaySummary[] = [];
  for (let i = 0; i < nDays; i++) {
    const day = addDays(from, i);
    const hit = byDay.get(day);
    out.push({
      day,
      completions: hit ? Number(hit.completions) : 0,
      xp: hit ? Number(hit.xp) : 0,
    });
  }
  return out;
}

export interface LedgerEntry {
  id: string;
  amount: number;
  source: string;
  reason: string | null;
  createdAt: string;
}

export async function getRecentLedger(limit = 20): Promise<LedgerEntry[]> {
  return db
    .select({
      id: xpTransactions.id,
      amount: xpTransactions.amount,
      source: xpTransactions.source,
      reason: xpTransactions.reason,
      createdAt: xpTransactions.createdAt,
    })
    .from(xpTransactions)
    .orderBy(desc(xpTransactions.createdAt))
    .limit(limit);
}

/** Count of open (not completed, not deleted) tasks. */
export async function countOpenTasks(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(tasks)
    .where(sql`${tasks.completedAt} IS NULL AND ${tasks.deletedAt} IS NULL`);
  return Number(row?.n ?? 0);
}

/** Count of active (non-archived) habits. */
export async function countActiveHabits(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(habits)
    .where(sql`${habits.archivedAt} IS NULL`);
  return Number(row?.n ?? 0);
}
