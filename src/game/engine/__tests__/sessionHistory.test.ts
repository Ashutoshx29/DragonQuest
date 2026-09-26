import { summarizeSessionHistory, TRAINING_KIND_LABELS } from '../sessionHistory';

function row(partial: {
  kind: keyof typeof TRAINING_KIND_LABELS;
  title?: string | null;
  durationSec?: number;
  xpAwarded?: number;
  id?: string;
}) {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    kind: partial.kind,
    title: partial.title ?? null,
    durationSec: partial.durationSec ?? 600,
    xpAwarded: partial.xpAwarded ?? 60,
  };
}

describe('summarizeSessionHistory', () => {
  it('returns an empty list for no sessions', () => {
    expect(summarizeSessionHistory([])).toEqual([]);
  });

  it('collapses repeated sessions of the same kind into one ×N row', () => {
    const groups = summarizeSessionHistory([
      row({ kind: 'mind' }),
      row({ kind: 'mind', id: 'b' }),
      row({ kind: 'focus', id: 'c' }),
    ]);
    expect(groups).toHaveLength(2);
    const mind = groups.find((g) => g.kind === 'mind')!;
    expect(mind.count).toBe(2);
    expect(mind.totalMinutes).toBe(20);
    expect(mind.totalXp).toBe(120);
  });

  it('keeps workout titles separate from kind labels', () => {
    const groups = summarizeSessionHistory([
      row({ kind: 'workout', title: 'Leg Extensions', durationSec: 0, xpAwarded: 50 }),
      row({ kind: 'workout', title: 'Leg Extensions', durationSec: 0, xpAwarded: 50 }),
      row({ kind: 'workout', title: 'Push Day', durationSec: 0, xpAwarded: 50 }),
    ]);
    expect(groups).toHaveLength(2);
    const legs = groups.find((g) => g.label === 'Leg Extensions')!;
    expect(legs.count).toBe(2);
    expect(legs.totalXp).toBe(100);
  });

  it('merges untitled sessions of a kind under the kind label', () => {
    const groups = summarizeSessionHistory([
      row({ kind: 'breath', title: null }),
      row({ kind: 'breath', title: '' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Recovery Breathing');
  });
});
