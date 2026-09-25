import { ACHIEVEMENTS, type AchievementDef } from '../config/achievements';

/**
 * Achievement evaluation (pure). A stats snapshot is compared against every
 * achievement's criteria; the engine returns which defs qualify for unlock.
 * Persistence stays in the repository layer.
 */

export interface AchievementStats {
  completionsTotal: number;
  xpTotal: number;
  level: number;
  habitStreakBest: number;
  globalStreakBest: number;
  earlyCompletions: number;
  habitsCreated: number;
}

export interface AchievementStatus extends AchievementDef {
  unlocked: boolean;
  progress: number; // 0..1
}

function evaluateCriteria(criteria: AchievementDef['criteria'], stats: AchievementStats): number {
  switch (criteria.kind) {
    case 'completions_total':
      return stats.completionsTotal;
    case 'xp_total':
      return stats.xpTotal;
    case 'level_reach':
      return stats.level;
    case 'habit_streak_best':
      return stats.habitStreakBest;
    case 'global_streak_best':
      return stats.globalStreakBest;
    case 'early_completions':
      return stats.earlyCompletions;
    case 'habits_created':
      return stats.habitsCreated;
    default:
      return 0;
  }
}

export function evaluateAchievements(
  defs: AchievementDef[],
  stats: AchievementStats,
  unlockedIds: Set<string>
): AchievementStatus[] {
  return defs.map((def) => {
    const value = evaluateCriteria(def.criteria, stats);
    const progress = Math.min(1, value / Math.max(1, def.criteria.threshold));
    return { ...def, unlocked: unlockedIds.has(def.id), progress };
  });
}

/** Defs whose criteria are met but that are not yet unlocked. */
export function findNewUnlocks(
  defs: AchievementDef[],
  stats: AchievementStats,
  unlockedIds: Set<string>
): AchievementDef[] {
  return defs.filter((def) => {
    if (unlockedIds.has(def.id)) return false;
    const value = evaluateCriteria(def.criteria, stats);
    return value >= def.criteria.threshold;
  });
}

export const ALL_ACHIEVEMENTS = ACHIEVEMENTS;
