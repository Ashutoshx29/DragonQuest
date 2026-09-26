import { addDays, diffDays, todayString } from '@/lib/dates';

/**
 * Progression engine (pure) — the SINGLE SOURCE OF TRUTH for the numbers
 * every screen displays: current streak, longest streak, training days, XP
 * totals and level math.
 *
 * Ground rules:
 * - Repositories feed in raw ledgers (days with activity, XP totals); this
 *   module owns every derivation. UI components must never re-derive these
 *   values locally — import them from here (via getProgressionSnapshot()).
 * - "Training day" = a local calendar day with at least one training
 *   completion (habit, task, routine or training session).
 * - All day math goes through lib/dates; `today` is injectable for tests.
 */

export interface TrainingDayLedger {
  /** Distinct local days (YYYY-MM-DD) with any training activity. */
  activeDays: string[];
}

export interface StreakSummary {
  /** Consecutive training days ending today or yesterday. */
  current: number;
  /** Longest run of consecutive training days ever recorded. */
  best: number;
  /** True when today already counts toward the streak. */
  doneToday: boolean;
  /** True when yesterday counted but today does not (streak in danger). */
  atRisk: boolean;
}

export interface ProgressionNumbers {
  streak: StreakSummary;
  /** Local days with at least one completion, all time. */
  trainingDays: number;
  /** Training days in the last 14 local days (inclusive). */
  trainingDaysLast14: number;
  /** Completions all time. */
  totalCompletions: number;
  /** Total XP across the whole ledger. */
  totalXp: number;
  /** XP earned today. */
  todayXp: number;
}

/**
 * Streak + training-day math from a set of active local days (pure).
 *
 * Replaces the ad-hoc walk in globalStreak.ts: one implementation feeds Home,
 * Progress, Profile and the achievement engine so "1 DAY SECURED" can never
 * coexist with "longest streak 0" again.
 */
export function computeTrainingStreak(activeDays: string[], today: string = todayString()): StreakSummary {
  const unique = [...new Set(activeDays)].sort();
  const hit = (day: string) => unique.includes(day);

  const doneToday = hit(today);
  const atRisk = !doneToday && hit(addDays(today, -1));

  // Current run must end today or yesterday.
  let current = 0;
  if (doneToday || atRisk) {
    let cursor = doneToday ? today : addDays(today, -1);
    while (hit(cursor) && current < 3650) {
      current += 1;
      cursor = addDays(cursor, -1);
    }
  }

  // Longest consecutive run ever.
  let best = 0;
  let run = 0;
  for (let i = 0; i < unique.length; i++) {
    if (i > 0 && diffDays(unique[i], unique[i - 1]) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
  }

  return { current, best, doneToday, atRisk };
}

/** Count active days in the window [today - (n-1), today] (pure). */
export function countActiveDaysInLast(activeDays: string[], n: number, today: string = todayString()): number {
  const from = addDays(today, -(n - 1));
  const set = new Set(activeDays);
  let count = 0;
  for (let i = 0; i < n; i++) {
    const day = addDays(from, i);
    if (set.has(day)) count += 1;
  }
  return count;
}

/**
 * Resolve the full progression numbers from the raw ledgers (pure).
 * `sessionsByDay` (training sessions) and `completionsByDay` (habits/tasks/
 * routines) are merged: EITHER counts as a training day for streaks.
 */
export function buildProgressionNumbers(input: {
  completionsByDay: Record<string, number>;
  sessionsByDay: Record<string, number>;
  totalXp: number;
  todayXp: number;
  today?: string;
}): ProgressionNumbers {
  const today = input.today ?? todayString();
  const daySet = new Set<string>([
    ...Object.keys(input.completionsByDay).filter((d) => input.completionsByDay[d] > 0),
    ...Object.keys(input.sessionsByDay).filter((d) => input.sessionsByDay[d] > 0),
  ]);
  const activeDays = [...daySet];

  const totalCompletions =
    Object.values(input.completionsByDay).reduce((a, b) => a + b, 0) +
    Object.values(input.sessionsByDay).reduce((a, b) => a + b, 0);

  return {
    streak: computeTrainingStreak(activeDays, today),
    trainingDays: activeDays.length,
    trainingDaysLast14: countActiveDaysInLast(activeDays, 14, today),
    totalCompletions,
    totalXp: input.totalXp,
    todayXp: input.todayXp,
  };
}
