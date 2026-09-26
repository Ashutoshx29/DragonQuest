import {
  START_SEQUENCE,
  deriveTimerState,
  formatCountdown,
  sessionLengthLabel,
  startSequenceBeat,
  startSequenceTotalMs,
} from '../timer';

const DURATION = 1500; // 25 min

describe('deriveTimerState (timestamp-driven countdown)', () => {
  it('starts at full duration: remaining = duration, progress 0', () => {
    const t0 = 1_000_000;
    const s = deriveTimerState(t0, DURATION, t0);
    expect(s.remainingSec).toBe(DURATION);
    expect(s.elapsedSec).toBe(0);
    expect(s.progress).toBe(0);
    expect(s.complete).toBe(false);
  });

  it('derives remaining from timestamps at 10 minutes elapsed', () => {
    const t0 = 1_000_000;
    const s = deriveTimerState(t0, DURATION, t0 + 600_000);
    expect(s.remainingSec).toBe(900); // 15 min
    expect(s.elapsedSec).toBe(600);
    expect(s.progress).toBeCloseTo(0.4);
  });

  it('completion is detected exactly at zero (endTime - now <= 0)', () => {
    const t0 = 1_000_000;
    const atEnd = deriveTimerState(t0, DURATION, t0 + DURATION * 1000);
    expect(atEnd.remainingSec).toBe(0);
    expect(atEnd.complete).toBe(true);
    expect(atEnd.progress).toBe(1);

    const justBefore = deriveTimerState(t0, DURATION, t0 + DURATION * 1000 - 1);
    expect(justBefore.complete).toBe(false);
    expect(justBefore.remainingSec).toBe(1);
  });

  it('SELF-CORRECTS after backgrounding: wall-clock gap is honored', () => {
    const t0 = 1_000_000;
    // Background at 1 min elapsed, return 14 minutes later in wall-clock time.
    const now = t0 + 15 * 60 * 1000;
    const s = deriveTimerState(t0, DURATION, now);
    expect(s.elapsedSec).toBe(900); // 15 min — NOT 1 min + a few ticks
    expect(s.remainingSec).toBe(600); // 10 min left, exactly right
    expect(s.complete).toBe(false);
  });

  it('session that expires while backgrounded completes on return', () => {
    const t0 = 1_000_000;
    // Return long after the end time.
    const s = deriveTimerState(t0, DURATION, t0 + 40 * 60 * 1000);
    expect(s.complete).toBe(true);
    expect(s.remainingSec).toBe(0);
    expect(s.elapsedSec).toBe(DURATION); // clamped, never negative/overshoot
  });

  it('never yields negative remaining or elapsed beyond duration', () => {
    const t0 = 1_000_000;
    const past = deriveTimerState(t0, 600, t0 + 999_999_999);
    expect(past.remainingSec).toBe(0);
    expect(past.elapsedSec).toBe(600);

    const zero = deriveTimerState(t0, 0, t0);
    expect(zero.remainingSec).toBe(0);
    expect(zero.progress).toBe(0);
  });
});

describe('formatCountdown / sessionLengthLabel', () => {
  it('formats M:SS with zero padding', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(65)).toBe('1:05');
    expect(formatCountdown(600)).toBe('10:00');
    expect(formatCountdown(1499)).toBe('24:59');
  });

  it('labels the session length', () => {
    expect(sessionLengthLabel(1500)).toBe('25 MIN SESSION');
    expect(sessionLengthLabel(45)).toBe('1 MIN SESSION');
  });
});

describe('start sequence (READY 3 2 1 TRAIN)', () => {
  it('has a short total duration (not annoying)', () => {
    const total = startSequenceTotalMs(START_SEQUENCE);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(3500);
  });

  it('resolves beats in order and returns null when over', () => {
    expect(startSequenceBeat(START_SEQUENCE, 0)?.label).toBe('READY');
    expect(startSequenceBeat(START_SEQUENCE, 700)?.label).toBe('3');
    expect(startSequenceBeat(START_SEQUENCE, 1300)?.label).toBe('2');
    expect(startSequenceBeat(START_SEQUENCE, 1900)?.label).toBe('1');
    expect(startSequenceBeat(START_SEQUENCE, 2500)?.label).toBe('TRAIN');
    expect(startSequenceBeat(START_SEQUENCE, startSequenceTotalMs(START_SEQUENCE))).toBeNull();
  });
});
