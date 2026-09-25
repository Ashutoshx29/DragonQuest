import { addDays, diffDays, todayString } from '@/lib/dates';

export interface StreakResult {
  /** Consecutive days ending today or yesterday (0 if broken). */
  current: number;
  /** Longest consecutive run ever recorded. */
  best: number;
}

/**
 * Compute streak stats from completion days (pure function, unit-testable).
 *
 * @param days completion day strings (`YYYY-MM-DD`), any order, duplicates ignored
 * @param today reference day (defaults to today) — injectable for tests
 */
export function computeStreakFromDays(days: string[], today: string = todayString()): StreakResult {
  const unique = [...new Set(days)].sort();
  if (unique.length === 0) return { current: 0, best: 0 };

  // Longest run overall
  let best = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    if (diffDays(unique[i], unique[i - 1]) === 1) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  // Current run: must end today or yesterday
  const last = unique[unique.length - 1];
  const gapToToday = diffDays(today, last);
  if (gapToToday > 1) return { current: 0, best };

  let current = 1;
  let cursor = last;
  for (let i = unique.length - 2; i >= 0; i--) {
    if (diffDays(cursor, unique[i]) === 1) {
      current += 1;
      cursor = unique[i];
    } else {
      break;
    }
  }

  return { current, best };
}

/** The day a streak is "at risk" of breaking (yesterday, if not done today). */
export function atRiskDay(today: string = todayString()): string {
  return addDays(today, -1);
}
