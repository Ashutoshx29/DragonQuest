import { evaluateMissions, selectMissions, allMissionsDone, type MissionStats } from '../missions';
import { MISSION_DEFS, type MissionKind } from '../../config/missions';

const allKinds = Object.keys(MISSION_DEFS) as MissionKind[];

const baseStats: MissionStats = {
  completionsToday: 0,
  scheduledToday: 0,
  perfectDay: false,
  routineCompletedToday: false,
};

describe('selectMissions', () => {
  it('is deterministic for the same day', () => {
    const a = selectMissions('2026-09-26', allKinds);
    const b = selectMissions('2026-09-26', allKinds);
    expect(a).toEqual(b);
  });

  it('rotates the lineup across days', () => {
    const days = ['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29'];
    const lineups = days.map((d) => selectMissions(d, allKinds).join(','));
    expect(new Set(lineups).size).toBeGreaterThan(1);
  });

  it('returns at most 3 missions', () => {
    expect(selectMissions('2026-09-26', allKinds)).toHaveLength(3);
  });

  it('handles fewer kinds than slots', () => {
    const out = selectMissions('2026-09-26', ['any_three']);
    expect(out).toEqual(['any_three']);
  });
});

describe('evaluateMissions', () => {
  it('any_three completes at 3 completions', () => {
    const [mission] = evaluateMissions(['any_three'], { ...baseStats, completionsToday: 3 });
    expect(mission.done).toBe(true);
    const [notYet] = evaluateMissions(['any_three'], { ...baseStats, completionsToday: 2 });
    expect(notYet.done).toBe(false);
  });

  it('perfect_day requires something scheduled AND all done', () => {
    const nothingScheduled = evaluateMissions(['perfect_day'], {
      ...baseStats,
      scheduledToday: 0,
      perfectDay: true,
    })[0];
    expect(nothingScheduled.done).toBe(false);

    const allDone = evaluateMissions(['perfect_day'], {
      ...baseStats,
      scheduledToday: 4,
      perfectDay: true,
    })[0];
    expect(allDone.done).toBe(true);
  });

  it('routine_run tracks routine completion', () => {
    const done = evaluateMissions(['routine_run'], {
      ...baseStats,
      routineCompletedToday: true,
    })[0];
    expect(done.done).toBe(true);
  });
});

describe('allMissionsDone', () => {
  it('is true only when every mission is done', () => {
    const views = evaluateMissions(['any_three', 'routine_run'], {
      ...baseStats,
      completionsToday: 3,
      routineCompletedToday: true,
    });
    expect(allMissionsDone(views)).toBe(true);

    const partial = evaluateMissions(['any_three', 'routine_run'], {
      ...baseStats,
      completionsToday: 3,
    });
    expect(allMissionsDone(partial)).toBe(false);
  });

  it('is false when there are no missions', () => {
    expect(allMissionsDone([])).toBe(false);
  });
});
