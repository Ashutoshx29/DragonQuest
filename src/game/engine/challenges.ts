import { addDays, diffDays, todayString } from '@/lib/dates';
import type { ChallengeDef } from '../config/challenges';

/**
 * Training challenge engine (pure).
 *
 * A challenge is a time-boxed program (7/14/30 days): complete at least
 * `requiredPerDay` quests on enough days to reach `minHitDays` within the
 * window. The window is the start day plus durationDays - 1.
 */

export interface ChallengeRunInput {
  def: ChallengeDef;
  startedDay: string;
  status: string; // 'active' | 'completed' | 'failed'
}

export interface ChallengeProgress {
  def: ChallengeDef;
  startedDay: string;
  status: 'active' | 'completed' | 'failed';
  /** Days elapsed in the window (clamped to duration). */
  daysElapsed: number;
  /** Days remaining (0 when the window is over). */
  daysLeft: number;
  /** Days where requiredPerDay was met. */
  hitDays: number;
  /** Per-day hit map for the window: true when the day's requirement was met. */
  dayHits: { day: string; hit: boolean }[];
}

/** Compute per-day hits and resolve run status (pure; status is advisory). */
export function computeChallengeProgress(
  run: ChallengeRunInput,
  completionDays: Map<string, number>,
  today: string = todayString()
): ChallengeProgress {
  const { def, startedDay } = run;
  const endDay = addDays(startedDay, def.durationDays - 1);

  const dayHits = Array.from({ length: def.durationDays }, (_, i) => {
    const day = addDays(startedDay, i);
    const count = completionDays.get(day) ?? 0;
    return { day, hit: count >= def.requiredPerDay };
  });
  const hitDays = dayHits.filter((d) => d.hit).length;

  const daysElapsed = Math.min(def.durationDays, Math.max(0, diffDays(today, startedDay) + 1));
  const daysLeft = Math.max(0, def.durationDays - daysElapsed);

  // Resolve status
  let status: 'active' | 'completed' | 'failed' =
    run.status === 'completed' || run.status === 'failed' ? run.status : 'active';
  if (status === 'active' && diffDays(today, endDay) >= 0) {
    status = hitDays >= def.minHitDays ? 'completed' : 'failed';
  }

  return {
    def,
    startedDay,
    status,
    daysElapsed,
    daysLeft,
    hitDays,
    dayHits,
  };
}

/** The day a run is scheduled to end. */
export function challengeEndDay(startedDay: string, durationDays: number): string {
  return addDays(startedDay, durationDays - 1);
}
