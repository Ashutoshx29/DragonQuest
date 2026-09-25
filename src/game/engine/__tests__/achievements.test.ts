import { evaluateAchievements, findNewUnlocks, type AchievementStats } from '../achievements';
import { ACHIEVEMENTS } from '../../config/achievements';

const baseStats: AchievementStats = {
  completionsTotal: 0,
  xpTotal: 0,
  level: 1,
  habitStreakBest: 0,
  globalStreakBest: 0,
  earlyCompletions: 0,
  habitsCreated: 0,
};

describe('evaluateAchievements', () => {
  it('computes partial progress toward thresholds', () => {
    const statuses = evaluateAchievements(ACHIEVEMENTS, { ...baseStats, completionsTotal: 5 }, new Set());
    const ten = statuses.find((s) => s.id === 'ten_done');
    expect(ten?.progress).toBeCloseTo(0.5);
    expect(ten?.unlocked).toBe(false);
  });

  it('marks unlocked only when in the unlocked set', () => {
    const statuses = evaluateAchievements(ACHIEVEMENTS, { ...baseStats, completionsTotal: 100 }, new Set(['first_step']));
    const first = statuses.find((s) => s.id === 'first_step');
    expect(first?.unlocked).toBe(true);
  });

  it('progress caps at 1', () => {
    const statuses = evaluateAchievements(ACHIEVEMENTS, { ...baseStats, xpTotal: 999999 }, new Set());
    expect(statuses.every((s) => s.progress <= 1)).toBe(true);
  });
});

describe('findNewUnlocks', () => {
  it('finds newly qualified achievements', () => {
    const unlocks = findNewUnlocks(ACHIEVEMENTS, { ...baseStats, completionsTotal: 12 }, new Set());
    expect(unlocks.map((a) => a.id)).toContain('first_step');
    expect(unlocks.map((a) => a.id)).toContain('ten_done');
  });

  it('never re-unlocks already-unlocked achievements', () => {
    const unlocks = findNewUnlocks(ACHIEVEMENTS, { ...baseStats, completionsTotal: 12 }, new Set(['first_step', 'ten_done']));
    expect(unlocks.map((a) => a.id)).not.toContain('first_step');
  });

  it('returns nothing when stats are zero', () => {
    expect(findNewUnlocks(ACHIEVEMENTS, baseStats, new Set())).toHaveLength(0);
  });

  it('achievement ids are unique across the catalog', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
