import { computeChallengeProgress } from '../challenges';
import { CHALLENGES } from '../../config/challenges';

const ironWeek = CHALLENGES[0]; // 7 days, 1/day, min 7

describe('computeChallengeProgress', () => {
  it('counts hit days correctly', () => {
    const completions = new Map([
      ['2026-09-26', 1],
      ['2026-09-27', 2],
    ]);
    const progress = computeChallengeProgress(
      { def: ironWeek, startedDay: '2026-09-26', status: 'active' },
      completions,
      '2026-09-28'
    );
    expect(progress.hitDays).toBe(2);
    expect(progress.dayHits[0].hit).toBe(true);
    expect(progress.dayHits[2].hit).toBe(false);
  });

  it('completes when window ends with enough hit days', () => {
    const completions = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(2026, 8, 26 + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      completions.set(iso, 1);
    }
    const progress = computeChallengeProgress(
      { def: ironWeek, startedDay: '2026-09-26', status: 'active' },
      completions,
      '2026-10-03' // day after the window ends
    );
    expect(progress.status).toBe('completed');
    expect(progress.hitDays).toBe(7);
  });

  it('fails when the window ends without enough hit days', () => {
    const progress = computeChallengeProgress(
      { def: ironWeek, startedDay: '2026-09-26', status: 'active' },
      new Map([['2026-09-26', 1]]),
      '2026-10-03'
    );
    expect(progress.status).toBe('failed');
  });

  it('stays active mid-window', () => {
    const progress = computeChallengeProgress(
      { def: ironWeek, startedDay: '2026-09-26', status: 'active' },
      new Map(),
      '2026-09-28'
    );
    expect(progress.status).toBe('active');
    expect(progress.daysLeft).toBe(4);
  });
});
