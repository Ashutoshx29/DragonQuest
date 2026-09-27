import {
  FOCUS_DURATION_LIMITS,
  FOCUS_DURATION_PRESETS_SEC,
  RECOVERY_OPTIONS_SEC,
  clampFocusDurationSec,
  isValidFocusDurationSec,
} from '../training';

describe('focus duration builder (config + validation)', () => {
  it('offers the spec presets (5–60 min)', () => {
    expect(FOCUS_DURATION_PRESETS_SEC).toEqual([300, 600, 900, 1500, 1800, 2700, 3600]);
  });

  it('keeps presets within the clamp window', () => {
    for (const p of FOCUS_DURATION_PRESETS_SEC) {
      expect(p).toBeGreaterThanOrEqual(FOCUS_DURATION_LIMITS.minSec);
      expect(p).toBeLessThanOrEqual(FOCUS_DURATION_LIMITS.maxSec);
    }
  });

  it('clamps custom input into the valid window, rounded to the step', () => {
    expect(clampFocusDurationSec(7 * 60)).toBe(7 * 60); // in-range passthrough
    expect(clampFocusDurationSec(7 * 60 + 22)).toBe(7 * 60); // rounds to step
    expect(clampFocusDurationSec(2 * 60)).toBe(FOCUS_DURATION_LIMITS.minSec); // below min → 5
    expect(clampFocusDurationSec(3 * 60 * 60)).toBe(FOCUS_DURATION_LIMITS.maxSec); // above max → 90
    expect(clampFocusDurationSec(0)).toBe(FOCUS_DURATION_LIMITS.minSec);
    expect(clampFocusDurationSec(-100)).toBe(FOCUS_DURATION_LIMITS.minSec);
  });

  it('validates only whole-step durations inside the window', () => {
    expect(isValidFocusDurationSec(25 * 60)).toBe(true);
    expect(isValidFocusDurationSec(90 * 60)).toBe(true);
    expect(isValidFocusDurationSec(4 * 60)).toBe(false); // below min
    expect(isValidFocusDurationSec(91 * 60)).toBe(false); // above max
    expect(isValidFocusDurationSec(25 * 60 + 30)).toBe(false); // off-step
    expect(isValidFocusDurationSec(Number.NaN)).toBe(false);
  });

  it('offers exactly skip / 2 min / 5 min recovery', () => {
    expect(RECOVERY_OPTIONS_SEC).toEqual([0, 120, 300]);
  });
});
