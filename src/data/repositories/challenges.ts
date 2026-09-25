import { eq } from 'drizzle-orm';

import { db } from '../db/client';
import { dailyCompletions, userChallenges, xpTransactions } from '../db/schema';
import { CHALLENGES, type ChallengeDef } from '@/game/config/challenges';
import { computeChallengeProgress, type ChallengeProgress } from '@/game/engine/challenges';
import { todayString } from '@/lib/dates';
import { uuid } from '@/lib/id';
import { createLogger } from '@/services/logger';

const logger = createLogger('challenges-repo');

export interface ChallengeView extends ChallengeProgress {
  /** DB row id of this run (for reward/abandon operations). */
  runId: string;
  /** Present when the def was removed from config but rows remain. */
  missing?: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function completionCounts(): Promise<Map<string, number>> {
  const all = await db
    .select({
      day: dailyCompletions.day,
      entityType: dailyCompletions.entityType,
      entityId: dailyCompletions.entityId,
    })
    .from(dailyCompletions);
  const counts = new Map<string, number>();
  for (const row of all) {
    if (row.entityType !== 'habit' && row.entityType !== 'task') continue;
    counts.set(row.day, (counts.get(row.day) ?? 0) + 1);
  }
  return counts;
}

/** All challenge runs joined with their defs + live progress. */
export async function getChallengeBoard(): Promise<ChallengeView[]> {
  const runs = await db.select().from(userChallenges);
  const counts = await completionCounts();
  return runs.map((run) => {
    const def = CHALLENGES.find((c) => c.id === run.challengeId);
    if (!def) {
      return {
        runId: run.id,
        def: {
          id: run.challengeId,
          title: run.challengeId,
          description: '',
          durationDays: 7,
          requiredPerDay: 1,
          minHitDays: 1,
          xpReward: 0,
          icon: 'help-circle' as const,
          accent: '#8B93A7',
        },
        startedDay: run.startedDay,
        status: run.status as 'active' | 'completed' | 'failed',
        daysElapsed: 0,
        daysLeft: 0,
        hitDays: 0,
        dayHits: [],
        missing: true,
      };
    }
    return {
      runId: run.id,
      ...computeChallengeProgress({ def, startedDay: run.startedDay, status: run.status }, counts),
    };
  });
}

export interface StartResult {
  ok: boolean
  error?: 'already_active'
}

/** Start a challenge run (one active run per challenge id). */
export async function startChallenge(challengeId: string): Promise<StartResult> {
  const existing = await db.select().from(userChallenges).where(eq(userChallenges.challengeId, challengeId));
  if (existing.some((r) => r.status === 'active')) {
    return { ok: false, error: 'already_active' };
  }
  await db.insert(userChallenges).values({
    id: uuid(),
    challengeId,
    startedDay: todayString(),
    status: 'active',
    finishedDay: null,
    createdAt: nowIso(),
  });
  logger.info(`challenge started: ${challengeId}`);
  return { ok: true };
}

/** Abandon an active run. */
export async function abandonChallenge(runId: string): Promise<void> {
  await db
    .update(userChallenges)
    .set({ status: 'failed', finishedDay: todayString() })
    .where(eq(userChallenges.id, runId));
}

/** Reward a completed run exactly once (called by the sync/check helper). */
export async function rewardCompletedRun(runId: string, def: ChallengeDef): Promise<boolean> {
  const [run] = await db.select().from(userChallenges).where(eq(userChallenges.id, runId)).limit(1);
  if (!run || run.status !== 'active') return false;

  await db
    .update(userChallenges)
    .set({ status: 'completed', finishedDay: todayString() })
    .where(eq(userChallenges.id, runId));
  await db.insert(xpTransactions).values({
    id: uuid(),
    amount: def.xpReward,
    source: 'challenge',
    refId: def.id,
    reason: `challenge completed: ${def.title}`,
    createdAt: nowIso(),
  });
  logger.info(`challenge completed (+${def.xpReward} xp)`, def.id);
  return true;
}
