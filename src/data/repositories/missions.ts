import { and, eq, sql } from 'drizzle-orm';

import { db } from '../db/client';
import { dailyCompletions, habits, missionClaims, tasks, xpTransactions } from '../db/schema';
import { ALL_MISSIONS_BONUS_XP, MISSION_DEFS, type MissionKind } from '@/game/config/missions';
import { evaluateMissions, selectMissions, allMissionsDone, type MissionStats, type MissionView } from '@/game/engine/missions';
import { todayString, parseDayString } from '@/lib/dates';
import { uuid } from '@/lib/id';
import { createLogger } from '@/services/logger';

const logger = createLogger('missions-repo');

function nowIso(): string {
  return new Date().toISOString();
}

/** Completion stats for `day`, feeding the mission engine. */
export async function getMissionStats(day: string = todayString()): Promise<MissionStats> {
  // Completions today (habits + tasks)
  const [completionsRow] = await db
    .select({ n: sql<number>`count(*)` })
    .from(dailyCompletions)
    .where(
      and(
        eq(dailyCompletions.day, day),
        sql`${dailyCompletions.entityType} IN ('habit', 'task')`
      )
    );

  // Active habits scheduled today (any schedule type that matches the weekday)
  const weekday = parseDayString(day).getDay();
  const activeHabits = await db
    .select({ scheduleJson: habits.scheduleJson, archivedAt: habits.archivedAt })
    .from(habits);
  const scheduledHabits = activeHabits.filter((h) => {
    if (h.archivedAt) return false;
    try {
      const parsed = JSON.parse(h.scheduleJson) as
        | { type: 'daily' }
        | { type: 'days'; days: number[] };
      if (parsed.type === 'daily') return true;
      return parsed.days.includes(weekday);
    } catch {
      return false;
    }
  });

  // Open tasks due today
  const [dueTasksRow] = await db
    .select({ n: sql<number>`count(*)` })
    .from(tasks)
    .where(and(eq(tasks.dueDay, day), sql`${tasks.deletedAt} IS NULL`));

  const scheduledToday = scheduledHabits.length + Number(dueTasksRow?.n ?? 0);
  const completionsToday = Number(completionsRow?.n ?? 0);

  // Perfect day: every scheduled habit done today AND all due tasks done
  const [doneHabitsRow] = await db
    .select({ n: sql<number>`count(*)` })
    .from(dailyCompletions)
    .where(
      and(eq(dailyCompletions.day, day), eq(dailyCompletions.entityType, 'habit'))
    );
  const [doneTasksRow] = await db
    .select({ n: sql<number>`count(*)` })
    .from(dailyCompletions)
    .where(and(eq(dailyCompletions.day, day), eq(dailyCompletions.entityType, 'task')));

  const perfectDay =
    scheduledToday > 0 &&
    Number(doneHabitsRow?.n ?? 0) >= scheduledHabits.length &&
    Number(doneTasksRow?.n ?? 0) >= Number(dueTasksRow?.n ?? 0);

  // Routine run today
  const [routineRow] = await db
    .select({ n: sql<number>`count(*)` })
    .from(dailyCompletions)
    .where(
      and(eq(dailyCompletions.day, day), eq(dailyCompletions.entityType, 'routine'))
    );

  return {
    completionsToday,
    scheduledToday,
    perfectDay,
    routineCompletedToday: Number(routineRow?.n ?? 0) > 0,
  };
}

export interface MissionBoard {
  day: string;
  missions: MissionView[];
  /** Kinds already claimed today (reward collected). */
  claimedKinds: MissionKind[];
  bonusClaimed: boolean;
  allDone: boolean;
}

/** The full mission board for `day`: lineup + evaluation + claim state. */
export async function getMissionBoard(day: string = todayString()): Promise<MissionBoard> {
  const stats = await getMissionStats(day);
  const kinds = selectMissions(day, Object.keys(MISSION_DEFS) as MissionKind[]);
  const missions = evaluateMissions(kinds, stats);

  const claims = await db
    .select({ kind: missionClaims.kind })
    .from(missionClaims)
    .where(eq(missionClaims.day, day));
  const claimedKinds = claims
    .map((c) => c.kind)
    .filter((k): k is MissionKind => k in MISSION_DEFS);
  const bonusClaimed = claims.some((c) => c.kind === 'all_bonus');

  return {
    day,
    missions,
    claimedKinds,
    bonusClaimed,
    allDone: allMissionsDone(missions),
  };
}

export interface ClaimResult {
  xpAwarded: number;
  alreadyClaimed: boolean;
}

/** Claim a completed mission's reward (idempotent per day+kind). */
export async function claimMission(kind: MissionKind, day: string = todayString()): Promise<ClaimResult> {
  const board = await getMissionBoard(day);
  const mission = board.missions.find((m) => m.kind === kind);
  if (!mission) throw new Error(`Mission not in today's lineup: ${kind}`);
  if (!mission.done) return { xpAwarded: 0, alreadyClaimed: false };
  if (board.claimedKinds.includes(kind)) return { xpAwarded: 0, alreadyClaimed: true };

  const def = MISSION_DEFS[kind];
  await db.insert(missionClaims).values({
    id: uuid(),
    day,
    kind,
    xpAwarded: def.rewardXp,
    claimedAt: nowIso(),
  });
  await db.insert(xpTransactions).values({
    id: uuid(),
    amount: def.rewardXp,
    source: 'mission',
    refId: kind,
    reason: `mission: ${def.title}`,
    createdAt: nowIso(),
  });
  logger.info(`mission claimed: ${kind} (+${def.rewardXp})`);
  return { xpAwarded: def.rewardXp, alreadyClaimed: false };
}

/** Claim the bonus chest once all missions are done (idempotent). */
export async function claimAllMissionsBonus(day: string = todayString()): Promise<ClaimResult> {
  const board = await getMissionBoard(day);
  if (!board.allDone) return { xpAwarded: 0, alreadyClaimed: false };
  if (board.bonusClaimed) return { xpAwarded: 0, alreadyClaimed: true };

  await db.insert(missionClaims).values({
    id: uuid(),
    day,
    kind: 'all_bonus',
    xpAwarded: ALL_MISSIONS_BONUS_XP,
    claimedAt: nowIso(),
  });
  await db.insert(xpTransactions).values({
    id: uuid(),
    amount: ALL_MISSIONS_BONUS_XP,
    source: 'bonus',
    refId: 'all_bonus',
    reason: 'all daily missions complete',
    createdAt: nowIso(),
  });
  logger.info(`bonus chest claimed (+${ALL_MISSIONS_BONUS_XP})`);
  return { xpAwarded: ALL_MISSIONS_BONUS_XP, alreadyClaimed: false };
}
