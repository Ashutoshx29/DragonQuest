import {
  BREATHING_PATTERNS,
  breathCycleSec,
  deriveBreathPhase,
  getBreathPattern,
} from '../breathing';

describe('breathing patterns (config integrity)', () => {
  it('exposes exactly the three launch patterns', () => {
    expect(BREATHING_PATTERNS.map((p) => p.id)).toEqual(['calm', 'box', 'coherent']);
  });

  it('uses the spec durations (calm 4/4, box 4/4/4/4, coherent 5/5)', () => {
    const calm = getBreathPattern('calm');
    const box = getBreathPattern('box');
    const coherent = getBreathPattern('coherent');

    expect(calm.phases.map((p) => [p.name, p.sec])).toEqual([
      ['inhale', 4],
      ['exhale', 4],
    ]);
    expect(box.phases.map((p) => [p.name, p.sec])).toEqual([
      ['inhale', 4],
      ['hold', 4],
      ['exhale', 4],
      ['holdEnd', 4],
    ]);
    expect(coherent.phases.map((p) => [p.name, p.sec])).toEqual([
      ['inhale', 5],
      ['exhale', 5],
    ]);
  });

  it('computes cycle lengths (calm 8s, box 16s, coherent 10s)', () => {
    expect(breathCycleSec(getBreathPattern('calm'))).toBe(8);
    expect(breathCycleSec(getBreathPattern('box'))).toBe(16);
    expect(breathCycleSec(getBreathPattern('coherent'))).toBe(10);
  });

  it('throws on an unknown pattern id (programming error guard)', () => {
    expect(() => getBreathPattern('nope' as never)).toThrow(/Unknown breathing pattern/);
  });
});

describe('deriveBreathPhase (timestamp-derived phases)', () => {
  const coherent = getBreathPattern('coherent');

  it('starts at inhale with full phase remaining', () => {
    const s = deriveBreathPhase(coherent, 1_000_000, 1_000_000);
    expect(s.phase.name).toBe('inhale');
    expect(s.secRemaining).toBe(5);
  });

  it('walks inhale → exhale in order across a coherent cycle', () => {
    const t0 = 5_000_000;
    expect(deriveBreathPhase(coherent, t0, t0 + 2_500).phase.name).toBe('inhale');
    expect(deriveBreathPhase(coherent, t0, t0 + 5_000).phase.name).toBe('exhale');
    expect(deriveBreathPhase(coherent, t0, t0 + 7_500).phase.name).toBe('exhale');
  });

  it('holds between inhale and exhale in the box pattern', () => {
    const box = getBreathPattern('box'); // 16s cycle
    const t0 = 2_000_000;
    expect(deriveBreathPhase(box, t0, t0 + 2_000).phase.name).toBe('inhale');
    expect(deriveBreathPhase(box, t0, t0 + 6_000).phase.name).toBe('hold');
    expect(deriveBreathPhase(box, t0, t0 + 10_000).phase.name).toBe('exhale');
    expect(deriveBreathPhase(box, t0, t0 + 14_000).phase.name).toBe('holdEnd');
  });

  it('loops seamlessly into the next cycle', () => {
    const calm = getBreathPattern('calm'); // 8s cycle
    const t0 = 3_000_000;
    expect(deriveBreathPhase(calm, t0, t0 + 8_000).phase.name).toBe('inhale');
    expect(deriveBreathPhase(calm, t0, t0 + 8_000).secRemaining).toBe(4);
  });

  it('self-corrects after a background wall-clock jump (no drift)', () => {
    // 37.3s of wall-clock time passes (backgrounded) — phase math must be
    // exact for the sampled moment, not "elapsed + a few ticks".
    const box = getBreathPattern('box');
    const t0 = 10_000_000;
    const state = deriveBreathPhase(box, t0, t0 + 37_300);
    // 37.3 % 16 = 5.3s into the cycle → hold (4–8s band).
    expect(state.phase.name).toBe('hold');
  });

  it('never yields zero or negative phase seconds', () => {
    const box = getBreathPattern('box');
    const t0 = 4_000_000;
    for (let offset = 0; offset <= 16_000; offset += 250) {
      const s = deriveBreathPhase(box, t0, t0 + offset);
      expect(s.secRemaining).toBeGreaterThanOrEqual(1);
      expect(s.phaseProgress).toBeGreaterThanOrEqual(0);
      expect(s.phaseProgress).toBeLessThanOrEqual(1);
    }
  });
});
