/**
 * Level curve + rank titles — ALL tuning values live here.
 *
 * Curve: XP required to advance FROM level n = round(base × n^exponent).
 * Changing base/exponent (or replacing with a lookup table) rebalances the
 * whole progression without touching engine or UI code.
 *
 * Rank titles are ORIGINAL — generic training-arc tropes, no licensed names.
 */

export const LEVEL_CURVE_BASE = 100;
export const LEVEL_CURVE_EXPONENT = 1.6;
export const MAX_LEVEL = 100;

/** XP needed to go from level `level` to `level + 1`. */
export function xpForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level));
  return Math.round(LEVEL_CURVE_BASE * Math.pow(n, LEVEL_CURVE_EXPONENT));
}

export interface LevelState {
  level: number;
  /** Total XP across all levels. */
  totalXp: number;
  /** XP accumulated within the current level. */
  xpIntoLevel: number;
  /** XP needed to advance from the current level. */
  xpForNext: number;
  /** 0..1 progress through the current level. */
  progress: number;
}

/** Resolve a level state from total XP (pure). */
export function levelFromTotalXp(totalXp: number): LevelState {
  let remaining = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (level < MAX_LEVEL) {
    const need = xpForLevel(level);
    if (remaining < need) break;
    remaining -= need;
    level += 1;
  }
  const xpForNext = level >= MAX_LEVEL ? 0 : xpForLevel(level);
  const progress = xpForNext > 0 ? remaining / xpForNext : 1;
  return {
    level,
    totalXp: Math.max(0, Math.floor(totalXp)),
    xpIntoLevel: remaining,
    xpForNext,
    progress,
  };
}

/** Rank title for a level. Thresholds are the minimum level for each rank. */
export const RANK_TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 1, title: 'Initiate' },
  { minLevel: 3, title: 'Apprentice' },
  { minLevel: 6, title: 'Adept' },
  { minLevel: 10, title: 'Disciple' },
  { minLevel: 15, title: 'Warrior' },
  { minLevel: 22, title: 'Champion' },
  { minLevel: 30, title: 'Master' },
  { minLevel: 40, title: 'Grandmaster' },
  { minLevel: 55, title: 'Ascendant' },
  { minLevel: 75, title: 'Transcendent' },
];

export function rankTitle(level: number): string {
  let title = RANK_TITLES[0].title;
  for (const tier of RANK_TITLES) {
    if (level >= tier.minLevel) title = tier.title;
  }
  return title;
}
