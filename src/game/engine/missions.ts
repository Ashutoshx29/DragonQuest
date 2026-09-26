import { MISSION_DEFS, MISSIONS_PER_DAY, type MissionKind } from '../config/missions';

/**
 * Daily mission engine (pure functions).
 *
 * Mission selection is DETERMINISTIC per day: the same three missions appear
 * all day — they don't reshuffle on every app open. The seed is the day
 * string; rotating the day rotates the lineup.
 */

export interface MissionStats {
  /** Quests completed today (habits + tasks). */
  completionsToday: number;
  /** Quests scheduled today (active habits scheduled today + open tasks due today). */
  scheduledToday: number;
  /** True when every quest scheduled today is complete. */
  perfectDay: boolean;
  /** True when at least one routine was run start-to-end today. */
  routineCompletedToday: boolean;
}

export interface MissionView {
  kind: MissionKind;
  title: string;
  description: string;
  rewardXp: number;
  done: boolean;
  /** Human-readable progress, e.g. "2 / 3" — null when not countable. */
  progressLabel: string | null;
  /** 0..1 completion fraction for progress bars (1 when done). */
  progress: number;
}

/** Small deterministic string hash (FNV-1a style). */
function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic selection: rotate the def list by the day's hash. */
export function selectMissions(day: string, kinds: MissionKind[]): MissionKind[] {
  const unique = [...new Set(kinds)];
  const seed = hashString(day);
  const offset = seed % unique.length;
  return Array.from({ length: Math.min(MISSIONS_PER_DAY, unique.length) }, (_, i) => unique[(offset + i) % unique.length]);
}

/** Evaluate each selected mission against today's stats. */
export function evaluateMissions(kinds: MissionKind[], stats: MissionStats): MissionView[] {
  return kinds.map((kind) => {
    const def = MISSION_DEFS[kind];
    let done = false;
    let progressLabel: string | null = null;
    let progress = 0;
    switch (kind) {
      case 'any_three': {
        const target = 3;
        const current = Math.min(stats.completionsToday, target);
        done = stats.completionsToday >= target;
        progress = Math.min(1, stats.completionsToday / target);
        progressLabel = `${current} / ${target}`;
        break;
      }
      case 'perfect_day': {
        done = stats.scheduledToday > 0 && stats.perfectDay;
        progress = done ? 1 : stats.scheduledToday > 0 ? 0 : 0;
        progressLabel = done ? 'COMPLETE' : 'ALL MISSIONS DONE';
        break;
      }
      case 'routine_run': {
        done = stats.routineCompletedToday;
        progress = done ? 1 : 0;
        progressLabel = done ? 'COMPLETE' : 'NOT YET TODAY';
        break;
      }
    }
    return { ...def, done, progressLabel, progress };
  });
}

/** All missions done → bonus chest. */
export function allMissionsDone(views: MissionView[]): boolean {
  return views.length > 0 && views.every((v) => v.done);
}
