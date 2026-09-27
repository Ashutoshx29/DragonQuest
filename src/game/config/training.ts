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

/**
 * Focus session builder bounds (seconds). The builder UI clamps CUSTOM input
 * to this window; presets below never exceed it. Chosen to match the existing
 * economy's granularity (per-minute XP) — no new XP rules are introduced.
 */
export const FOCUS_DURATION_LIMITS = {
  minSec: 5 * 60,
  maxSec: 90 * 60,
  stepSec: 60,
} as const;

/**
 * The duration choices offered by the setup sheet, in seconds — the presets
 * from the product spec plus CUSTOM, which uses the stepper control.
 */
export const FOCUS_DURATION_PRESETS_SEC = [5, 10, 15, 25, 30, 45, 60].map((m) => m * 60);

/**
 * Clamp a requested focus duration to the valid window (pure). Rounds to the
 * nearest step, then clamps — the UI never stores an out-of-range value.
 */
export function clampFocusDurationSec(requestedSec: number): number {
  const step = FOCUS_DURATION_LIMITS.stepSec;
  const rounded = Math.round(requestedSec / step) * step;
  return Math.min(FOCUS_DURATION_LIMITS.maxSec, Math.max(FOCUS_DURATION_LIMITS.minSec, rounded));
}

/**
 * True when a duration is selectable as-is (no clamping needed) — the UI
 * uses this to reject/flag out-of-window custom input (test criterion).
 */
export function isValidFocusDurationSec(sec: number): boolean {
  return (
    Number.isFinite(sec) &&
    sec >= FOCUS_DURATION_LIMITS.minSec &&
    sec <= FOCUS_DURATION_LIMITS.maxSec &&
    sec % FOCUS_DURATION_LIMITS.stepSec === 0
  );
}

/** Recovery lengths offered after a focus session (0 = skip), in seconds. */
export const RECOVERY_OPTIONS_SEC = [0, 2 * 60, 5 * 60] as const;
