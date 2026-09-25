import { eq, sql } from 'drizzle-orm';

import { db } from '../db/client';
import { dailyCompletions, habits, userAchievements, xpTransactions } from '../db/schema';
import { ACHIEVEMENTS, type AchievementDef } from '@/game/config/achievements';
import { evaluateAchievements, findNewUnlocks, type AchievementStats } from '@/game/engine/achievements';
import { levelFromTotalXp } from '@/game/config/levels';
import { uuid } from '@/lib/id';
import { createLogger } from '@/services/logger';
import { computeStreakFromDays } from '@/game/engine/streaks';
import { getGlobalStreak } from './globalStreak';

const logger = createLogger('achievements-repo');

export interface AchievementView {
  def: AchievementDef;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
}

/** Build the full stats snapshot the achievement engine needs. */
export async function getAchievementStats(): Promise<AchievementStats> {
  const [totals] = await db
    .select({ total: sql<number>`coalesce(sum(${xpTransactions.amount}), 0)` })
    .from(xpTransactions);

  const [completions] = await db
    .select({ n: sql<number>`count(*)` })
    .from(dailyCompletions);

  const [early] = await db
    .select({ n: sql<number>`count(*)` })
    .from(dailyCompletions)
    .where(sql`strftime('%H', ${dailyCompletions.completedAt}, 'utc') < '08'`);

  const [habitsCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(habits)
    .where(sql`${habits.archivedAt} IS NULL`);

  // Best habit streak across all habits
  const streakRows = await db
    .select({ entityId: dailyCompletions.entityId, day: dailyCompletions.day })
    .from(dailyCompletions)
    .where(eq(dailyCompletions.entityType, 'habit'));
  const byHabit = new Map<string, string[]>();
  for (const row of streakRows) {
    const list = byHabit.get(row.entityId) ?? [];
    list.push(row.day);
    byHabit.set(row.entityId, list);
  }
  let habitStreakBest = 0;
  for (const days of byHabit.values()) {
    habitStreakBest = Math.max(habitStreakBest, computeStreakFromDays(days).best);
  }

  const global = await getGlobalStreak();

  return {
    completionsTotal: Number(completions?.n ?? 0),
    xpTotal: Number(totals?.total ?? 0),
    level: levelFromTotalXp(Number(totals?.total ?? 0)).level,
    habitStreakBest,
    globalStreakBest: global.current,
    earlyCompletions: Number(early?.n ?? 0),
    habitsCreated: Number(habitsCount?.n ?? 0),
  };
}

async function getUnlockedIds(): Promise<Set<string>> {
  const rows = await db.select({ id: userAchievements.achievementId }).from(userAchievements);
  return new Set(rows.map((r) => r.id));
}

/** Full achievement list with progress + unlock state. */
export async function getAchievementBoard(): Promise<AchievementView[]> {
  const stats = await getAchievementStats();
  const unlocked = await getUnlockedIds();
  const statuses = evaluateAchievements(ACHIEVEMENTS, stats, unlocked);

  const times = new Map<string, string>();
  const rows = await db
    .select({ id: userAchievements.achievementId, at: userAchievements.unlockedAt })
    .from(userAchievements);
  for (const row of rows) times.set(row.id, row.at);

  return statuses.map((status) => ({
    def: status,
    unlocked: status.unlocked,
    unlockedAt: times.get(status.id) ?? null,
    progress: status.progress,
  }));
}

/**
 * Evaluate achievements, persist + reward any new unlocks, and return them
 * (for the unlock ceremony). Safe to call after any XP-affecting action.
 */
export async function checkAndUnlockAchievements(): Promise<AchievementDef[]> {
  const stats = await getAchievementStats();
  const unlocked = await getUnlockedIds();
  const newUnlocks = findNewUnlocks(ACHIEVEMENTS, stats, unlocked);
  if (newUnlocks.length === 0) return [];

  const now = new Date().toISOString();
  for (const def of newUnlocks) {
    await db.insert(userAchievements).values({
      id: uuid(),
      achievementId: def.id,
      unlockedAt: now,
    });
    await db.insert(xpTransactions).values({
      id: uuid(),
      amount: def.xpReward,
      source: 'achievement',
      refId: def.id,
      reason: `achievement: ${def.title}`,
      createdAt: now,
    });
    logger.info(`achievement unlocked: ${def.id} (+${def.xpReward} xp)`);
  }
  return newUnlocks;
}
