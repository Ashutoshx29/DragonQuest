/**
 * Training timer engine (pure) — ALL countdown math derives from TIMESTAMPS,
 * never from an incrementing counter. The UI re-reads `Date.now()` on a tick
 * and on app-state changes, so the countdown self-corrects after
 * backgrounding, locking, or losing focus:
 *
 *   endTime   = startedAt + durationSec * 1000
 *   remaining = max(0, endTime - now)
 *
 * Nothing here touches React, the DB, or XP — see game/config/training.ts
 * for the reward formula.
 */

/** Derive the countdown state from timestamps (pure). */
export function deriveTimerState(
  startedAt: number,
  durationSec: number,
  now: number
): {
  /** Seconds elapsed (clamped to the duration). */
  elapsedSec: number;
  /** Seconds remaining (0 once complete). */
  remainingSec: number;
  /** True when the countdown reached zero. */
  complete: boolean;
  /** 0..1 fraction of the session completed — feeds the progress ring. */
  progress: number;
} {
  const safeDuration = Math.max(0, durationSec);
  const endTime = startedAt + safeDuration * 1000;
  const remainingMs = Math.max(0, endTime - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const elapsedSec = Math.min(safeDuration, safeDuration - remainingSec);
  return {
    elapsedSec,
    remainingSec,
    complete: safeDuration > 0 && remainingSec === 0,
    progress: safeDuration > 0 ? Math.min(1, Math.max(0, (now - startedAt) / (safeDuration * 1000))) : 0,
  };
}

/** Format seconds as M:SS (pure). */
export function formatCountdown(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** "25 MIN SESSION" helper (pure). */
export function sessionLengthLabel(durationSec: number): string {
  return `${Math.max(1, Math.round(durationSec / 60))} MIN SESSION`;
}

/** Seconds remaining inside the final push (pure). */
export const FINAL_STRETCH_SEC = 10;

/** Start-sequence beats: READY → 3 → 2 → 1 → TRAIN (pure). */
export const START_SEQUENCE: { label: string; ms: number }[] = [
  { label: 'READY', ms: 700 },
  { label: '3', ms: 600 },
  { label: '2', ms: 600 },
  { label: '1', ms: 600 },
  { label: 'TRAIN', ms: 500 },
];

/** Total start-sequence length in ms (pure). */
export function startSequenceTotalMs(seq: { label: string; ms: number }[]): number {
  return seq.reduce((a, b) => a + b.ms, 0);
}

/**
 * Resolve the active start-sequence beat for a given elapsed offset (pure).
 * Returns null once the sequence is over (timer should be running).
 */
export function startSequenceBeat(
  seq: { label: string; ms: number }[],
  elapsedMs: number
): { label: string; index: number } | null {
  let cursor = 0;
  for (let i = 0; i < seq.length; i++) {
    cursor += seq[i].ms;
    if (elapsedMs < cursor) return { label: seq[i].label, index: i };
  }
  return null;
}
