import { levelFromTotalXp, rankTitle, xpForLevel } from '../../config/levels';

describe('levelFromTotalXp', () => {
  it('starts at level 1 with 0 xp', () => {
    const s = levelFromTotalXp(0);
    expect(s.level).toBe(1);
    expect(s.xpIntoLevel).toBe(0);
    expect(s.progress).toBe(0);
  });

  it('carries surplus xp across levels', () => {
    // L1→2 needs 100; L2→3 needs round(100 * 2^1.6) = 303 → total 403 = exactly L3
    expect(levelFromTotalXp(100).level).toBe(2);
    expect(levelFromTotalXp(403).level).toBe(3);
    expect(levelFromTotalXp(402).level).toBe(2);
  });

  it('clamps negative xp to zero', () => {
    const s = levelFromTotalXp(-50);
    expect(s.totalXp).toBe(0);
    expect(s.level).toBe(1);
  });

  it('progress stays within 0..1', () => {
    for (const xp of [0, 50, 99, 100, 250, 402, 403, 1000]) {
      const s = levelFromTotalXp(xp);
      expect(s.progress).toBeGreaterThanOrEqual(0);
      expect(s.progress).toBeLessThanOrEqual(1);
      expect(s.xpIntoLevel).toBeLessThan(s.xpForNext);
    }
  });

  it('xpForLevel is monotonically increasing', () => {
    let prev = 0;
    for (let level = 1; level <= 20; level++) {
      const need = xpForLevel(level);
      expect(need).toBeGreaterThan(prev);
      prev = need;
    }
  });
});

describe('rankTitle', () => {
  it('starts as Initiate', () => {
    expect(rankTitle(1)).toBe('Initiate');
    expect(rankTitle(2)).toBe('Initiate');
  });

  it('advances titles at thresholds', () => {
    expect(rankTitle(3)).toBe('Apprentice');
    expect(rankTitle(29)).toBe('Champion');
    expect(rankTitle(30)).toBe('Master');
    expect(rankTitle(75)).toBe('Transcendent');
  });
});
