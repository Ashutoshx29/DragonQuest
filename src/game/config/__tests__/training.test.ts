import { TRAINING_XP, computeTrainingXpPure } from '../training';

describe('computeTrainingXpPure — the ONE reward formula', () => {
  it('full completion pays the full reward (25 min focus = 150 XP)', () => {
    expect(computeTrainingXpPure('focus', 1500)).toBe(25 * TRAINING_XP.perMinute);
    expect(computeTrainingXpPure('focus', 1500)).toBe(150);
  });

  it('partial (finish early) uses the SAME formula on actual minutes', () => {
    // 10 minutes trained of a 25-minute session.
    expect(computeTrainingXpPure('focus', 600)).toBe(60);
    // 2 minutes of mind training.
    expect(computeTrainingXpPure('mind', 120)).toBe(2 * TRAINING_XP.perMinute);
  });

  it('minimum session: sub-minute finish still awards 1 minute', () => {
    expect(computeTrainingXpPure('focus', 30)).toBe(TRAINING_XP.perMinute);
    expect(computeTrainingXpPure('breath', 5)).toBe(TRAINING_XP.perMinute);
  });

  it('rounds fractional minutes consistently (90s → 2 min via Math.round)', () => {
    expect(computeTrainingXpPure('mind', 90)).toBe(2 * TRAINING_XP.perMinute);
  });

  it('workouts always pay the flat base regardless of duration', () => {
    expect(computeTrainingXpPure('workout', 0)).toBe(TRAINING_XP.workoutBase);
    expect(computeTrainingXpPure('workout', 3600)).toBe(TRAINING_XP.workoutBase);
  });

  it('recovery breathing pays per minute like other timed kinds', () => {
    expect(computeTrainingXpPure('breath', 300)).toBe(5 * TRAINING_XP.perMinute);
  });
});
