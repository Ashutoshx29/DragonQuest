/**
 * Daily mission definitions — tuning values live here.
 *
 * Kinds are evaluated from the day's completion stats (see engine/missions.ts).
 * Add a new mission by: adding a def here, an evaluator in the engine, and
 * data in getMissionStats() — no UI changes needed.
 */

export type MissionKind = 'any_three' | 'perfect_day' | 'routine_run';

export interface MissionDef {
  kind: MissionKind;
  title: string;
  description: string;
  rewardXp: number;
}

export const MISSION_DEFS: Record<MissionKind, MissionDef> = {
  any_three: {
    kind: 'any_three',
    title: 'Daily Training',
    description: 'Complete 3 quests today',
    rewardXp: 50,
  },
  perfect_day: {
    kind: 'perfect_day',
    title: 'Perfect Day',
    description: 'Complete every quest scheduled today',
    rewardXp: 100,
  },
  routine_run: {
    kind: 'routine_run',
    title: 'Ritual Keeper',
    description: 'Finish any routine start to end',
    rewardXp: 60,
  },
};

/** Bonus chest granted when ALL daily missions are completed. */
export const ALL_MISSIONS_BONUS_XP = 75;

/** How many missions are offered per day. */
export const MISSIONS_PER_DAY = 3;
