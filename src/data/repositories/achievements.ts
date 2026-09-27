import { eq, sql } from 'drizzle-orm';

import { db } from '../db/client';
import { dailyCompletions, habits, userAchievements, xpTransactions } from '../db/schema';
import { ACHIEVEMENTS, type AchievementDef } from '@/game/config/achievements';
import { evaluateAchievements, findNewUnlocks, type AchievementStats } from '@/game/engine/achievements';
import { levelFromTotalXp } from '@/game/config/levels';
import { uuid } from '@/lib/id';
import { createLogger } from '@/services/logger';
import { computeStreakFromDays } from '@/game/engine/streaks';
import { getProgressionSnapshot } from './progression';

const logger = createLogger('achievements-repo');

export interface AchievementView {
  def: AchievementDef;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
}

/** Build the full stats snapshot the achievement engine needs. */
export async function getAchievementStats(): Promise<AchievementStats> {
  // XP/completion totals now come from the centralized progression snapshot
  // (getProgressionSnapshot below) — no duplicated ledger math here.
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

  // Best GLOBAL training streak (all-time) from the centralized progression
  // engine — before this fix the stat reported the CURRENT streak, so Profile
  // could show "1 DAY SECURED" next to a longest streak of 0.
  const snapshot = await getProgressionSnapshot();

  return {
    completionsTotal: snapshot.totalCompletions,
    xpTotal: snapshot.totalXp,
    level: levelFromTotalXp(snapshot.totalXp).level,
    habitStreakBest,
    globalStreakBest: Math.max(snapshot.streak.best, snapshot.streak.current),
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
  // Only achievements whose unlock row ACTUALLY landed (see below) are
  // returned, so the reveal ceremony can never double-fire for a duplicate.
  const revealed: AchievementDef[] = [];
  for (const def of newUnlocks) {
    // Idempotent + race-safe unlock: onConflictDoNothing on the LOCAL
    // user_achievements_unique index means two overlapping evaluations (XP
    // notifications racing, pull + local unlock) can never double-insert —
    // the second write is a silent no-op. The XP ledger row is ONLY written
    // when this call's insert actually landed (returning() is empty on a
    // conflict), so the achievement's xpReward can never be awarded twice.
    // A pulled twin from another device lands here as a no-op too — exactly
    // once, enforced by the constraint, on both sides.
    const inserted = await db
      .insert(userAchievements)
      .values({ id: uuid(), achievementId: def.id, unlockedAt: now })
      .onConflictDoNothing({ target: userAchievements.achievementId })
      .returning({ id: userAchievements.id });
    if (inserted.length === 0) {
      logger.warn(`achievement ${def.id} already unlocked; skipping duplicate XP`);
      continue;
    }
    await db.insert(xpTransactions).values({
      id: uuid(),
      amount: def.xpReward,
      source: 'achievement',
      refId: def.id,
      reason: `achievement: ${def.title}`,
      createdAt: now,
    });
    logger.info(`achievement unlocked: ${def.id} (+${def.xpReward} xp)`);
    revealed.push(def);
  }
  return revealed;
}
