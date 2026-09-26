/**
 * Training XP economy — ALL tuning values live here (pure; no DB imports so
 * it is unit-testable). This is the ONE reward formula for timed sessions:
 * the repository re-exports it; the timer UI never duplicates the math.
 */

export const TRAINING_XP = {
  perMinute: 6,
  workoutBase: 50,
} as const;

/** Quick presets per training kind (seconds). */
export const TRAINING_PRESETS = {
  focus: 1500, // 25 min
  mind: 600, // 10 min
  breath: 300, // 5 min
} as const;

/**
 * XP award for a session (pure). Timed kinds pay per completed minute
 * (minimum one minute); workouts pay the flat base reward. This mirrors the
 * long-standing game rules exactly — finish-early partial rewards flow
 * through the same function, never a second formula.
 */
export function computeTrainingXpPure(kind: 'workout' | 'focus' | 'mind' | 'breath', durationSec: number): number {
  if (kind === 'workout') return TRAINING_XP.workoutBase;
  const minutes = Math.max(1, Math.round(durationSec / 60));
  return minutes * TRAINING_XP.perMinute;
}
