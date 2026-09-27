import {
  SYNC_TABLES,
  advanceCursor,
  lwwWinner,
  planTableMerge,
  remoteConflictTarget,
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

  it('user_achievements: natural-key twin (different id, same achievement) does NOT re-push or re-apply', () => {
    // THE 23505 REGRESSION: the device unlocked an achievement, the remote
    // already had it under a different client-generated uuid, and the old
    // id-only union merge pushed the twin into user_achievements_unique.
    const cfg = SYNC_TABLES.find((t) => t.name === 'user_achievements')!;
    const localTwin = { id: 'local-uuid', achievement_id: 'first_step', unlocked_at: '2026-09-26T10:00:00Z' };
    const remoteTwin = { id: 'remote-uuid', user_id: 'u1', achievement_id: 'first_step', unlocked_at: '2026-09-26T09:00:00Z' };
    const plan = planTableMerge(cfg, [localTwin], [remoteTwin]);
    expect(plan.toPush).toHaveLength(0); // nothing re-pushed → no 23505
    expect(plan.toApplyLocal).toHaveLength(0); // nothing re-applied → no local unique throw
  });

  it('user_achievements: genuinely new achievements still push/pull', () => {
    const cfg = SYNC_TABLES.find((t) => t.name === 'user_achievements')!;
    const local = { id: 'l1', achievement_id: 'first_step', unlocked_at: '2026-09-26T10:00:00Z' };
    const remote = { id: 'r1', user_id: 'u1', achievement_id: 'ten_done', unlocked_at: '2026-09-26T09:00:00Z' };
    const plan = planTableMerge(cfg, [local], [remote]);
    expect(plan.toPush.map((r) => r.id)).toEqual(['l1']);
    expect(plan.toApplyLocal.map((r) => r.id)).toEqual(['r1']);
  });

  it('user_achievements: replaying the same merge is a no-op (idempotency)', () => {
    const cfg = SYNC_TABLES.find((t) => t.name === 'user_achievements')!;
    const local = { id: 'l1', achievement_id: 'first_step', unlocked_at: '2026-09-26T10:00:00Z' };
    const remote = { id: 'r1', user_id: 'u1', achievement_id: 'ten_done', unlocked_at: '2026-09-26T09:00:00Z' };
    const first = planTableMerge(cfg, [local], [remote]);
    // After pass 1, both sides have both rows (under their own ids).
    const both = [local, remote];
    const second = planTableMerge(cfg, both, both);
    expect(second.toPush).toHaveLength(0);
    expect(second.toApplyLocal).toHaveLength(0);
    void first;
  });

  it('daily_completions and mission_claims also merge on their natural keys', () => {
    const completions = SYNC_TABLES.find((t) => t.name === 'daily_completions')!;
    const claims = SYNC_TABLES.find((t) => t.name === 'mission_claims')!;
    const localComp = { id: 'lc1', entity_type: 'habit', entity_id: 'h1', day: '2026-09-26' };
    const remoteComp = { id: 'rc1', user_id: 'u1', entity_type: 'habit', entity_id: 'h1', day: '2026-09-26' };
    const planC = planTableMerge(completions, [localComp], [remoteComp]);
    expect(planC.toPush).toHaveLength(0);
    expect(planC.toApplyLocal).toHaveLength(0);

    const localClaim = { id: 'lk1', day: '2026-09-26', kind: 'any_three' };
    const remoteClaim = { id: 'rk1', user_id: 'u1', day: '2026-09-26', kind: 'any_three' };
    const planK = planTableMerge(claims, [localClaim], [remoteClaim]);
    expect(planK.toPush).toHaveLength(0);
    expect(planK.toApplyLocal).toHaveLength(0);
  });

  it('rows missing their natural key fall back to id identity (defensive)', () => {
    const cfg = SYNC_TABLES.find((t) => t.name === 'user_achievements')!;
    const local = { id: 'l1' };
    const remote = { id: 'l1' }; // same id, no achievement_id
    const plan = planTableMerge(cfg, [local], [remote]);
    expect(plan.toPush).toHaveLength(0);
    expect(plan.toApplyLocal).toHaveLength(0);
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

describe('conflict targets (idempotency at the DB layer)', () => {
  it('push target names the remote constraint columns for natural-key ledgers', () => {
    const achievements = SYNC_TABLES.find((t) => t.name === 'user_achievements')!;
    // Must match user_achievements_unique (user_id, achievement_id) EXACTLY —
    // Postgres infers the conflict index from the column list.
    expect(remoteConflictTarget(achievements)).toBe('user_id,achievement_id');
    const completions = SYNC_TABLES.find((t) => t.name === 'daily_completions')!;
    expect(remoteConflictTarget(completions)).toBe('user_id,entity_type,entity_id,day');
    const claims = SYNC_TABLES.find((t) => t.name === 'mission_claims')!;
    expect(remoteConflictTarget(claims)).toBe('user_id,day,kind');
  });

  it('push target is the plain PK for id-only tables', () => {
    const ledger = SYNC_TABLES.find((t) => t.name === 'xp_transactions')!;
    expect(remoteConflictTarget(ledger)).toBe('id');
    const mutable = SYNC_TABLES.find((t) => t.name === 'habits')!;
    expect(remoteConflictTarget(mutable)).toBe('id');
  });

  it('every append-only table with a remote unique constraint declares a natural key', () => {
    // The 23505 class: any append-only table whose remote schema adds a
    // unique index beyond the PK must opt in — a missing naturalKey would
    // re-introduce duplicate-twin pushes.
    const withRemoteUnique = new Set(['daily_completions', 'mission_claims', 'user_achievements']);
    for (const t of SYNC_TABLES) {
      if (t.appendOnly && withRemoteUnique.has(t.name)) {
        expect(t.naturalKey).toBeDefined();
      }
    }
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
