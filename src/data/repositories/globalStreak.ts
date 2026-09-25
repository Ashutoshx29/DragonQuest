import { gte, sql } from 'drizzle-orm';

import { db } from '../db/client';
import { dailyCompletions } from '../db/schema';
import { addDays, todayString } from '@/lib/dates';
import { GLOBAL_STREAK_MIN_COMPLETIONS } from '@/game/config/streaks';

export interface GlobalStreak {
  current: number;
  /** Days completed in the last 14 (oldest first) for the dashboard strip. */
  last14: { day: string; completions: number; hit: boolean }[];
  /** True when today's threshold is already met. */
  doneToday: boolean;
  /** True when yesterday hit the threshold but today hasn't yet. */
  atRisk: boolean;
}

/**
 * Global streak: consecutive days (ending today or yesterday) with at least
 * GLOBAL_STREAK_MIN_COMPLETIONS completions. Derived entirely from the
 * completions ledger — nothing to persist.
 */
export async function getGlobalStreak(): Promise<GlobalStreak> {
  const from = addDays(todayString(), -400); // generous lookback window
  const rows = await db
    .select({
      day: dailyCompletions.day,
      n: sql<number>`count(*)`,
    })
    .from(dailyCompletions)
    .where(gte(dailyCompletions.day, from))
    .groupBy(dailyCompletions.day);

  const byDay = new Map(rows.map((r) => [r.day, Number(r.n)]));
  const hit = (day: string): boolean => (byDay.get(day) ?? 0) >= GLOBAL_STREAK_MIN_COMPLETIONS;

  const today = todayString();
  const doneToday = hit(today);

  let current = 0;
  if (doneToday || hit(addDays(today, -1))) {
    let cursor = doneToday ? today : addDays(today, -1);
    while (hit(cursor) && current < 3650) {
      current += 1;
      cursor = addDays(cursor, -1);
    }
  }

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const day = addDays(today, -(13 - i));
    return { day, completions: byDay.get(day) ?? 0, hit: hit(day) };
  });

  return { current, last14, doneToday, atRisk: !doneToday && hit(addDays(today, -1)) };
}
