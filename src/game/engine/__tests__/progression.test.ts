import {
  buildProgressionNumbers,
  computeTrainingStreak,
  countActiveDaysInLast,
} from '../progression';
import { levelFromTotalXp, xpForLevel } from '../../config/levels';
import { attributeTier, attributeProgress } from '../../config/attributes';
import { buildAttributeViews } from '../attributes';

const TODAY = '2026-09-26';

function daysAgo(n: number): string {
  // Mirror lib/dates math without importing the app-side Date dependency.
  const base = new Date(2026, 8, 26); // Sep 26 2026, local
  base.setDate(base.getDate() - n);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

describe('computeTrainingStreak', () => {
  it('returns 0/0 for an empty ledger', () => {
    const s = computeTrainingStreak([], TODAY);
    expect(s.current).toBe(0);
    expect(s.best).toBe(0);
    expect(s.doneToday).toBe(false);
    expect(s.atRisk).toBe(false);
  });

  it('first completed training day: current 1, best 1, secured', () => {
    const s = computeTrainingStreak([TODAY], TODAY);
    expect(s.current).toBe(1);
    expect(s.best).toBe(1);
    expect(s.doneToday).toBe(true);
    expect(s.atRisk).toBe(false);
  });

  it('second consecutive day: current 2, best 2', () => {
    const s = computeTrainingStreak([daysAgo(1), TODAY], TODAY);
    expect(s.current).toBe(2);
    expect(s.best).toBe(2);
    expect(s.doneToday).toBe(true);
  });

  it('missed day: streak resets but best is remembered', () => {
    const s = computeTrainingStreak([daysAgo(4), daysAgo(3), daysAgo(1)], TODAY);
    expect(s.current).toBe(1); // only yesterday counts
    expect(s.best).toBe(2); // the earlier run is remembered
  });

  it('today not yet done but yesterday hit: at risk, current carried', () => {
    const s = computeTrainingStreak([daysAgo(1)], TODAY);
    expect(s.current).toBe(1);
    expect(s.doneToday).toBe(false);
    expect(s.atRisk).toBe(true);
  });

  it('gap of 2+ days: current resets to 0', () => {
    const s = computeTrainingStreak([daysAgo(3)], TODAY);
    expect(s.current).toBe(0);
    expect(s.best).toBe(1);
    expect(s.atRisk).toBe(false);
  });

  it('longest streak updates across multiple runs', () => {
    // Runs: 12..8 (5 days), then a gap, then 1 + today (2 days).
    const days = [daysAgo(12), daysAgo(11), daysAgo(10), daysAgo(9), daysAgo(8), daysAgo(1), TODAY];
    const s = computeTrainingStreak(days, TODAY);
    expect(s.best).toBe(5);
    expect(s.current).toBe(2);
  });

  it('duplicate days are ignored', () => {
    const s = computeTrainingStreak([TODAY, TODAY, TODAY], TODAY);
    expect(s.current).toBe(1);
    expect(s.best).toBe(1);
  });

  it('unsorted input works', () => {
    const s = computeTrainingStreak([TODAY, daysAgo(1), daysAgo(2)], TODAY);
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
  });
});

describe('countActiveDaysInLast', () => {
  it('counts only days inside the window', () => {
    const days = [TODAY, daysAgo(1), daysAgo(13), daysAgo(20)];
    expect(countActiveDaysInLast(days, 14, TODAY)).toBe(3);
    expect(countActiveDaysInLast(days, 7, TODAY)).toBe(2);
  });
});

describe('buildProgressionNumbers', () => {
  it('merges completions and sessions into training days + streak', () => {
    const numbers = buildProgressionNumbers({
      completionsByDay: { [TODAY]: 3, [daysAgo(1)]: 2 },
      sessionsByDay: { [daysAgo(1)]: 1, [daysAgo(2)]: 2 },
      totalXp: 500,
      todayXp: 90,
      today: TODAY,
    });
    expect(numbers.trainingDays).toBe(3);
    expect(numbers.streak.current).toBe(3); // today + yesterday + day-2 all consecutive
    expect(numbers.streak.best).toBe(3);
    expect(numbers.totalCompletions).toBe(3 + 2 + 1 + 2);
    expect(numbers.trainingDaysLast14).toBe(3);
    expect(numbers.totalXp).toBe(500);
    expect(numbers.todayXp).toBe(90);
  });

  it('ignores zero-count days for streaks', () => {
    const numbers = buildProgressionNumbers({
      completionsByDay: { [TODAY]: 1, [daysAgo(1)]: 0 },
      sessionsByDay: {},
      totalXp: 10,
      todayXp: 10,
      today: TODAY,
    });
    expect(numbers.trainingDays).toBe(1);
    expect(numbers.streak.current).toBe(1);
    expect(numbers.streak.best).toBe(1);
  });
});

describe('XP → level (levelFromTotalXp)', () => {
  it('level 1 with 0 XP', () => {
    const state = levelFromTotalXp(0);
    expect(state.level).toBe(1);
    expect(state.xpIntoLevel).toBe(0);
    expect(state.xpForNext).toBe(xpForLevel(1));
    expect(state.progress).toBe(0);
  });

  it('crossing the first threshold advances the level', () => {
    const need = xpForLevel(1); // 100
    const state = levelFromTotalXp(need);
    expect(state.level).toBe(2);
    expect(state.xpIntoLevel).toBe(0);
  });

  it('mid-level progress computes correctly', () => {
    const need = xpForLevel(1); // 100
    const state = levelFromTotalXp(40);
    expect(state.level).toBe(1);
    expect(state.xpIntoLevel).toBe(40);
    expect(state.xpForNext).toBe(need);
    expect(state.progress).toBeCloseTo(0.4);
  });

  it('xp updates flow through after a second session (accumulation)', () => {
    const first = levelFromTotalXp(0);
    const afterFirst = levelFromTotalXp(first.totalXp + 30);
    const afterSecond = levelFromTotalXp(afterFirst.totalXp + 50);
    expect(afterSecond.totalXp).toBe(80);
    expect(afterSecond.level).toBe(1);
    expect(afterSecond.xpIntoLevel).toBe(80);
  });
});

describe('attributes (tier + progress)', () => {
  it('ledger rows map to the right attributes with today split', () => {
    const views = buildAttributeViews(
      [
        { source: 'habit', amount: 20, createdAt: `${TODAY}T10:00:00Z`, day: TODAY },
        { source: 'task', amount: 15, createdAt: `${TODAY}T11:00:00Z`, day: TODAY },
        { source: 'workout', amount: 50, createdAt: `${daysAgo(1)}T09:00:00Z`, day: daysAgo(1) },
        { source: 'journal', amount: 30, createdAt: `${daysAgo(2)}T21:00:00Z`, day: daysAgo(2) },
      ],
      TODAY
    );
    expect(views.discipline.xp).toBe(20);
    expect(views.discipline.xpToday).toBe(20);
    expect(views.focus.xp).toBe(15);
    expect(views.focus.xpToday).toBe(15);
    expect(views.power.xp).toBe(50);
    expect(views.power.xpToday).toBe(0);
    expect(views.mind.xp).toBe(30);
    expect(views.mind.tier).toBe(attributeTier(30));
  });

  it('negative corrections never deduct attributes', () => {
    const views = buildAttributeViews(
      [
        { source: 'habit', amount: 20, createdAt: `${TODAY}T10:00:00Z`, day: TODAY },
        { source: 'habit', amount: -20, createdAt: `${TODAY}T11:00:00Z`, day: TODAY },
      ],
      TODAY
    );
    expect(views.discipline.xp).toBe(20);
  });

  it('tier climbs E → D at 250 XP and progress caps at 1', () => {
    expect(attributeTier(0)).toBe('E');
    expect(attributeTier(249)).toBe('E');
    expect(attributeTier(250)).toBe('D');
    expect(attributeProgress(1250)).toBeCloseTo(0.5);
    expect(attributeProgress(9999)).toBe(1);
  });
});
