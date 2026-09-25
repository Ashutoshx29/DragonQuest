/**
 * XP economy — ALL tuning values live here.
 * Rebalancing must never require touching engine or UI code.
 */

export const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5] as const;
export type Difficulty = (typeof DIFFICULTY_LEVELS)[number];

export const DIFFICULTY_MULTIPLIERS: Record<Difficulty, number> = {
  1: 0.5,
  2: 0.75,
  3: 1,
  4: 1.5,
  5: 2,
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'D1 · Easy',
  2: 'D2 · Light',
  3: 'D3 · Normal',
  4: 'D4 · Hard',
  5: 'D5 · Extreme',
};

/** Base XP before difficulty multiplier. */
export const BASE_XP = {
  habit: 20,
  task: 15,
  routineItem: 10,
} as const;

/** Streak bonus tiers: multiplier applied to XP once the streak reaches N days. */
export const STREAK_TIERS = [
  { days: 7, multiplier: 1.1 },
  { days: 30, multiplier: 1.25 },
  { days: 100, multiplier: 1.5 },
] as const;

/** XP awarded for a completion: base × difficulty × streak multiplier. */
export function computeXpAward(baseXp: number, difficulty: number, streakCount: number): number {
  const mult = DIFFICULTY_MULTIPLIERS[(Math.min(Math.max(difficulty, 1), 5) as Difficulty) ?? 3] ?? 1;
  return Math.round(baseXp * mult * streakMultiplier(streakCount));
}

/** Streak multiplier for a current streak length (highest qualifying tier). */
export function streakMultiplier(currentStreak: number): number {
  let multiplier = 1;
  for (const tier of STREAK_TIERS) {
    if (currentStreak >= tier.days) multiplier = tier.multiplier;
  }
  return multiplier;
}
