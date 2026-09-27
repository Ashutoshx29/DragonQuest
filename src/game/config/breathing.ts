/**
 * Breathing patterns + phase math (pure; no React/DB imports — unit-testable).
 *
 * Timing is TIMESTAMP-derived, never an incrementing counter: given the ms
 * elapsed since the breathing phase started, the current phase is a pure
 * function of `elapsedMs % cycleMs`. Backgrounding/locking self-corrects on
 * the next tick exactly like the focus timer (game/engine/timer.ts).
 *
 * Animation is presentation-only: it must never determine which phase is
 * shown — UI derives the phase from the clock and merely illustrates it.
 */

export type BreathPhaseName = 'inhale' | 'hold' | 'exhale' | 'holdEnd';

export interface BreathPhase {
  name: BreathPhaseName;
  /** Seconds this phase lasts. */
  sec: number;
  /** UI copy — rendered verbatim on the breathing screen. */
  label: string;
}

export interface BreathPattern {
  id: 'calm' | 'box' | 'coherent';
  label: string;
  /** Ordered phases; `cycleSec` is their sum. */
  phases: readonly BreathPhase[];
  /** One-line description shown under the pattern name. */
  description: string;
}

const P = (name: BreathPhaseName, sec: number, label: string): BreathPhase => ({ name, sec, label });

/** The three launch patterns (small, focused set — per product scope). */
export const BREATHING_PATTERNS: readonly BreathPattern[] = [
  {
    id: 'calm',
    label: 'Calm',
    description: '4 in · 4 out',
    phases: [
      P('inhale', 4, 'BREATHE IN'),
      P('exhale', 4, 'BREATHE OUT'),
    ],
  },
  {
    id: 'box',
    label: 'Box',
    description: '4 in · 4 hold · 4 out · 4 hold',
    phases: [
      P('inhale', 4, 'BREATHE IN'),
      P('hold', 4, 'HOLD'),
      P('exhale', 4, 'BREATHE OUT'),
      P('holdEnd', 4, 'HOLD'),
    ],
  },
  {
    id: 'coherent',
    label: 'Coherent',
    description: '5 in · 5 out',
    phases: [
      P('inhale', 5, 'BREATHE IN'),
      P('exhale', 5, 'BREATHE OUT'),
    ],
  },
] as const;

export function getBreathPattern(id: BreathPattern['id']): BreathPattern {
  const found = BREATHING_PATTERNS.find((p) => p.id === id);
  // Patterns are static config; a missing id is a programming error.
  if (!found) throw new Error(`Unknown breathing pattern: ${id}`);
  return found;
}

/** Total seconds for one full cycle of a pattern (pure). */
export function breathCycleSec(pattern: BreathPattern): number {
  return pattern.phases.reduce((a, p) => a + p.sec, 0);
}

export interface BreathPhaseState {
  phase: BreathPhase;
  /** Whole seconds REMAINING in the current phase (≥ 1 while active). */
  secRemaining: number;
  /** 0..1 progress through the current phase (drives the visual swell). */
  phaseProgress: number;
  /** 0..1 progress through the whole cycle (diagnostic/tests). */
  cycleProgress: number;
}

/**
 * Resolve the breathing phase for a moment in time (pure).
 * `startedAtMs` is when the breathing exercise began; `nowMs` is any clock
 * sample (tick, foreground re-sync). Both derive from Date.now() upstream.
 */
export function deriveBreathPhase(
  pattern: BreathPattern,
  startedAtMs: number,
  nowMs: number
): BreathPhaseState {
  const cycleMs = breathCycleSec(pattern) * 1000;
  const elapsedMs = Math.max(0, nowMs - startedAtMs);
  const cyclePosMs = cycleMs > 0 ? elapsedMs % cycleMs : 0;

  let cursorMs = 0;
  for (const phase of pattern.phases) {
    const phaseMs = phase.sec * 1000;
    if (cyclePosMs < cursorMs + phaseMs) {
      const intoPhaseMs = cyclePosMs - cursorMs;
      const remainingMs = phaseMs - intoPhaseMs;
      return {
        phase,
        secRemaining: Math.max(1, Math.ceil(remainingMs / 1000)),
        phaseProgress: Math.min(1, intoPhaseMs / phaseMs),
        cycleProgress: cycleMs > 0 ? Math.min(1, (elapsedMs % cycleMs) / cycleMs) : 0,
      };
    }
    cursorMs += phaseMs;
  }
  // Unreachable for well-formed patterns (phases sum == cycleSec).
  const first = pattern.phases[0];
  return { phase: first, secRemaining: first.sec, phaseProgress: 0, cycleProgress: 0 };
}
