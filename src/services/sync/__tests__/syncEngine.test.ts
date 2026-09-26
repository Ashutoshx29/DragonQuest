import {
  SYNC_TABLES,
  advanceCursor,
  lwwWinner,
  planTableMerge,
  selectRowsToPull,
  selectRowsToPush,
  totalPreviewItems,
  type SyncRow,
} from '../syncEngine';

const mutable = SYNC_TABLES.find((t) => t.name === 'habits')!;
const ledger = SYNC_TABLES.find((t) => t.name === 'xp_transactions')!;

function row(id: string, updatedAt: string): SyncRow {
  return { id, updated_at: updatedAt };
}

describe('lwwWinner (mutable rows)', () => {
  it('remote wins when strictly newer', () => {
    expect(lwwWinner(row('a', '2026-01-01T00:00:00Z'), row('a', '2026-01-02T00:00:00Z'))).toBe('remote');
  });

  it('local wins when strictly newer', () => {
    expect(lwwWinner(row('a', '2026-01-03T00:00:00Z'), row('a', '2026-01-02T00:00:00Z'))).toBe('local');
  });

  it('tie means already synced (no ops)', () => {
    expect(lwwWinner(row('a', '2026-01-01T00:00:00Z'), row('a', '2026-01-01T00:00:00Z'))).toBe('same');
  });

  it('missing local row → remote applies; missing remote row → local pushes', () => {
    expect(lwwWinner(undefined, row('a', '2026-01-01T00:00:00Z'))).toBe('remote');
    expect(lwwWinner(row('a', '2026-01-01T00:00:00Z'), undefined)).toBe('local');
  });

  it('missing timestamps never clobber remote state', () => {
    expect(lwwWinner({ id: 'a' }, row('a', '2026-01-01T00:00:00Z'))).toBe('local');
  });
});

describe('watermark selection', () => {
  const local = [
    row('old', '2026-01-01T00:00:00Z'),
    row('new', '2026-01-05T00:00:00Z'),
  ];

  it('push selects rows newer than the push watermark', () => {
    const out = selectRowsToPush(local, '2026-01-03T00:00:00Z');
    expect(out.map((r) => r.id)).toEqual(['new']);
  });

  it('first push selects everything', () => {
    expect(selectRowsToPush(local, null)).toHaveLength(2);
  });

  it('pull selects remote rows newer than the pull watermark', () => {
    const remote = [...local, row('newer', '2026-01-09T00:00:00Z')];
    const out = selectRowsToPull(remote, '2026-01-04T00:00:00Z');
    expect(out.map((r) => r.id)).toEqual(['new', 'newer']);
  });
});

describe('planTableMerge', () => {
  it('append-only ledgers union-merge without comparing timestamps', () => {
    const plan = planTableMerge(
      ledger,
      [row('l1', '2026-01-01T00:00:00Z'), row('both', '2026-01-01T00:00:00Z')],
      [row('r1', '2020-01-01T00:00:00Z'), row('both', '2020-01-01T00:00:00Z')]
    );
    expect(plan.toPush.map((r) => r.id)).toEqual(['l1']);
    expect(plan.toApplyLocal.map((r) => r.id)).toEqual(['r1']);
  });

  it('ledgers ignore timestamps entirely (older remote row still applies)', () => {
    const plan = planTableMerge(ledger, [row('x', '2026-06-01T00:00:00Z')], [row('y', '2020-01-01T00:00:00Z')]);
    expect(plan.toApplyLocal.map((r) => r.id)).toEqual(['y']);
  });

  it('mutable tables LWW both directions', () => {
    const plan = planTableMerge(
      mutable,
      [row('a', '2026-01-05T00:00:00Z'), row('b', '2026-01-01T00:00:00Z')],
      [row('a', '2026-01-02T00:00:00Z'), row('b', '2026-01-04T00:00:00Z')]
    );
    expect(plan.toPush.map((r) => r.id)).toEqual(['a']);
    expect(plan.toApplyLocal.map((r) => r.id)).toEqual(['b']);
  });

  it('is idempotent: merging the same data twice yields no ops', () => {
    const local = [row('a', '2026-01-02T00:00:00Z')];
    const remote = [row('a', '2026-01-02T00:00:00Z')];
    const first = planTableMerge(mutable, local, remote);
    expect(first.toPush).toHaveLength(0);
    expect(first.toApplyLocal).toHaveLength(0);
    const ledgerPlan = planTableMerge(ledger, local, remote);
    expect(ledgerPlan.toPush).toHaveLength(0);
    expect(ledgerPlan.toApplyLocal).toHaveLength(0);
  });
});

describe('advanceCursor', () => {
  it('advances to the newest seen timestamp', () => {
    const next = advanceCursor('2026-01-01T00:00:00Z', [
      row('a', '2026-01-05T00:00:00Z'),
      row('b', '2026-01-03T00:00:00Z'),
    ]);
    expect(next).toBe('2026-01-05T00:00:00.000Z');
  });

  it('never regresses', () => {
    expect(advanceCursor('2026-02-01T00:00:00Z', [row('a', '2026-01-01T00:00:00Z')])).toBe(
      '2026-02-01T00:00:00.000Z'
    );
  });

  it('keeps the current cursor when no rows carry timestamps', () => {
    expect(advanceCursor('2026-02-01T00:00:00Z', [{ id: 'a' }])).toBe('2026-02-01T00:00:00.000Z');
  });
});

describe('migration preview total', () => {
  it('sums every counted table', () => {
    expect(
      totalPreviewItems({
        habits: 2,
        tasks: 3,
        routines: 1,
        goals: 1,
        journalEntries: 10,
        trainingSessions: 4,
        completions: 50,
        xpTransactions: 60,
      })
    ).toBe(131);
  });
});
