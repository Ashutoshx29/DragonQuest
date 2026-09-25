import { withSpring, withTiming } from 'react-native-reanimated';

/**
 * Central motion language: every animation in the app uses one of these
 * presets so the whole UI "feels" the same. Change feel here, everywhere.
 *
 * Presets are plain config objects; call sites pass them to withSpring /
 * withTiming (or Moti props later).
 */

export const springPresets = {
  /** Snappy UI feedback: presses, toggles */
  snappy: { damping: 20, stiffness: 320, mass: 0.8 },
  /** Playful overshoot: XP numbers, badges popping in */
  pop: { damping: 12, stiffness: 220, mass: 0.9 },
  /** Dramatic impact: level-up, achievement ceremonies */
  impact: { damping: 10, stiffness: 140, mass: 1.2 },
  /** Slow, heavy: large panels, parallax layers */
  heavy: { damping: 26, stiffness: 160, mass: 1.4 },
} as const;

export const timingPresets = {
  fast: { durationMs: 150 },
  normal: { durationMs: 280 },
  slow: { durationMs: 600 },
  dramatic: { durationMs: 1100 },
} as const;

export type SpringPreset = keyof typeof springPresets;
export type TimingPreset = keyof typeof timingPresets;

/** Helper: run a spring with an app preset. */
export function springTo(value: number, preset: SpringPreset = 'snappy') {
  'worklet';
  return withSpring(value, springPresets[preset]);
}

/** Helper: run a timing with an app preset. */
export function timeTo(value: number, preset: TimingPreset = 'normal') {
  'worklet';
  return withTiming(value, { duration: timingPresets[preset].durationMs });
}
