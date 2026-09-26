import { sql } from 'drizzle-orm';

import { db } from '../db/client';
import { dailyCompletions, trainingSessions } from '../db/schema';
import { getAttributeViews, getXpTotals } from './progress';
import {
  buildProgressionNumbers,
  type ProgressionNumbers,
} from '@/game/engine/progression';
import type { AttributeViews } from '@/game/engine/attributes';

/**
 * THE progression snapshot — one query round-trip that every screen consumes
 * via the ProgressionProvider. Home, Progress, Profile, Missions and reward
 * overlays all read from this, so a streak can never disagree with itself
 * between screens.
 */

export interface ProgressionSnapshot extends ProgressionNumbers {
  attributes: AttributeViews;
}

/** Per-day counts for the completions ledger (all time; personal scale). */
async function completionsByDay(): Promise<Record<string, number>> {
  const rows = await db
    .select({ day: dailyCompletions.day, n: sql<number>`count(*)` })
    .from(dailyCompletions)
    .groupBy(dailyCompletions.day);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.day] = Number(r.n);
  return out;
}

/** Per-day counts for the training-session ledger (all time). */
async function sessionsByDay(): Promise<Record<string, number>> {
  const rows = await db
    .select({ day: trainingSessions.day, n: sql<number>`count(*)` })
    .from(trainingSessions)
    .groupBy(trainingSessions.day);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.day] = Number(r.n);
  return out;
}

/** The single source of truth for progression values across all screens. */
export async function getProgressionSnapshot(): Promise<ProgressionSnapshot> {
  const [totals, byDay, sessions, attributes] = await Promise.all([
    getXpTotals(),
    completionsByDay(),
    sessionsByDay(),
    getAttributeViews(),
  ]);

  const numbers = buildProgressionNumbers({
    completionsByDay: byDay,
    sessionsByDay: sessions,
    totalXp: totals.totalXp,
    todayXp: totals.todayXp,
  });

  return { ...numbers, attributes };
}
