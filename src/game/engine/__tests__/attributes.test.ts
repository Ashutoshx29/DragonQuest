import { buildAttributeViews, attributeGainForSource, type AttributeLedgerRow } from '../attributes';
import { ATTRIBUTE_SOFT_CAP_XP, ATTRIBUTE_TIERS } from '../../config/attributes';

const TODAY = '2026-09-26';

function row(source: string, amount: number, day = TODAY, createdAt = `${day}T10:00:00.000Z`): AttributeLedgerRow {
  return { source, amount, createdAt, day };
}

describe('buildAttributeViews', () => {
  it('maps ledger sources to the correct attributes', () => {
    const views = buildAttributeViews(
      [row('workout', 100), row('focus_session', 60), row('mind_training', 40)],
      TODAY
    );
    expect(views.power.xp).toBe(100);
    expect(views.focus.xp).toBe(60);
    expect(views.mind.xp).toBe(40);
    expect(views.discipline.xp).toBe(0);
    expect(views.energy.xp).toBe(0);
  });

  it('maps legacy sources (habit/task/routine_item/mission)', () => {
    const views = buildAttributeViews(
      [row('habit', 20), row('task', 15), row('routine_item', 10), row('mission', 50)],
      TODAY
    );
    expect(views.discipline.xp).toBe(70); // habit + mission
    expect(views.focus.xp).toBe(15); // task
    expect(views.energy.xp).toBe(10); // routine_item
  });

  it('splits today vs total', () => {
    const views = buildAttributeViews(
      [row('workout', 100, TODAY), row('workout', 200, '2026-09-20')],
      TODAY
    );
    expect(views.power.xp).toBe(300);
    expect(views.power.xpToday).toBe(100);
  });

  it('ignores negative corrections and unknown sources', () => {
    const views = buildAttributeViews([row('habit', -20), row('mystery_source', 999)], TODAY);
    expect(views.discipline.xp).toBe(0);
    expect(Object.values(views).every((v) => v.xp === 0)).toBe(true);
  });

  it('computes progress against the soft cap and tier labels', () => {
    const views = buildAttributeViews([row('workout', ATTRIBUTE_SOFT_CAP_XP)], TODAY);
    expect(views.power.progress).toBeLessThanOrEqual(1);
    expect(views.power.tier).toBe(
      ATTRIBUTE_TIERS.slice().reverse().find((t) => ATTRIBUTE_SOFT_CAP_XP >= t.min)!.label
    );

    const empty = buildAttributeViews([], TODAY);
    expect(empty.power.xp).toBe(0);
    expect(empty.power.tier).toBe('E');
  });

  it('rank-band progress is readable at low values and next rank is exposed', () => {
    const views = buildAttributeViews([row('workout', 125)], TODAY);
    // Band E spans 0..250 → 125 XP is halfway.
    expect(views.power.progress).toBeCloseTo(0.5);
    expect(views.power.tier).toBe('E');
    expect(views.power.nextRank).toEqual({ label: 'D', at: 250 });

    // A D-band value progresses within its own band.
    const d = buildAttributeViews([row('workout', 500)], TODAY);
    expect(d.power.tier).toBe('D');
    expect(d.power.progress).toBeCloseTo((500 - 250) / (750 - 250));
    expect(d.power.nextRank).toEqual({ label: 'C', at: 750 });
  });

  it('rank S is terminal: progress 1 and no next rank', () => {
    const views = buildAttributeViews([row('workout', 6000)], TODAY);
    expect(views.power.tier).toBe('S');
    expect(views.power.progress).toBe(1);
    expect(views.power.nextRank).toBeNull();
  });
});

describe('attributeGainForSource', () => {
  it('returns the mapped attribute for positive XP', () => {
    expect(attributeGainForSource('workout', 80)).toEqual({ attribute: 'power', xp: 80 });
    expect(attributeGainForSource('focus_session', 30)).toEqual({ attribute: 'focus', xp: 30 });
  });

  it('returns null for zero/negative XP or unmapped sources', () => {
    expect(attributeGainForSource('workout', 0)).toBeNull();
    expect(attributeGainForSource('workout', -5)).toBeNull();
    expect(attributeGainForSource('mystery', 10)).toBeNull();
  });
});
