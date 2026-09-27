/**
 * Regression tests for the Phase 6 training sync failure.
 *
 * Root cause: drizzle rows carry camelCase TS keys while Postgres columns
 * are snake_case. Pushing drizzle rows verbatim made PostgREST reject the
 * upsert (PGRST204, unknown column). These tests pin the mapping contract:
 * every local key must translate to a real cloud column, and back.
 */

import { toCloudRow, toLocalRow, tableNeedsMapping } from '../rowMapping';
import { SYNC_TABLES } from '../syncEngine';

describe('rowMapping — training_sessions (the reported failure)', () => {
  const localRow = {
    id: 't-1',
    kind: 'workout',
    title: 'Push day',
    durationSec: 0,
    completedAt: '2026-09-26T10:00:00.000Z',
    day: '2026-09-26',
    xpAwarded: 50,
    payloadJson: '{"exercises":[]}',
  };

  it('translates every camelCase key to the SQL column name', () => {
    const cloud = toCloudRow('training_sessions', localRow);
    expect(Object.keys(cloud).sort()).toEqual(
      [
        'id',
        'kind',
        'title',
        'duration_sec',
        'completed_at',
        'day',
        'xp_awarded',
        'payload_json',
      ].sort()
    );
    expect(cloud.duration_sec).toBe(0);
    expect(cloud.completed_at).toBe('2026-09-26T10:00:00.000Z');
    expect(cloud.xp_awarded).toBe(50);
    expect(cloud.payload_json).toBe('{"exercises":[]}');
    expect(cloud.user_id).toBeUndefined(); // auth.uid() default fills it remotely
  });

  it('round-trips back to the local (drizzle) shape', () => {
    const cloud = toCloudRow('training_sessions', localRow);
    const local = toLocalRow('training_sessions', cloud);
    expect(local).toEqual(localRow);
  });

  it('maps the exact training repository row shape (kind=workout quick log)', () => {
    // Mirrors data/repositories/training.ts completeTrainingSession output.
    const repoRow = {
      id: 't-2',
      kind: 'mind',
      title: null,
      durationSec: 600,
      completedAt: '2026-09-26T11:30:00.000Z',
      day: '2026-09-26',
      xpAwarded: 60,
      payloadJson: null,
    };
    const cloud = toCloudRow('training_sessions', repoRow);
    expect(cloud).toEqual({
      id: 't-2',
      kind: 'mind',
      title: null,
      duration_sec: 600,
      completed_at: '2026-09-26T11:30:00.000Z',
      day: '2026-09-26',
      xp_awarded: 60,
      payload_json: null,
    });
  });

  it('drops keys the cloud does not store and keeps id', () => {
    const cloud = toCloudRow('training_sessions', { ...localRow, notAColumn: 1 });
    expect(cloud.notAColumn).toBeUndefined();
    expect(cloud.id).toBe('t-1');
  });
});

describe('rowMapping — xp_transactions', () => {
  it('maps refId/createdAt and round-trips', () => {
    const localRow = {
      id: 'x-1',
      amount: 6,
      source: 'mind_training',
      refId: 't-2',
      reason: 'Mind Training completed',
      createdAt: '2026-09-26T11:30:00.000Z',
    };
    const cloud = toCloudRow('xp_transactions', localRow);
    expect(cloud).toEqual({
      id: 'x-1',
      amount: 6,
      source: 'mind_training',
      ref_id: 't-2',
      reason: 'Mind Training completed',
      created_at: '2026-09-26T11:30:00.000Z',
    });
    expect(toLocalRow('xp_transactions', cloud)).toEqual(localRow);
  });
});

describe('rowMapping — user_id is remote-only BY DESIGN', () => {
  it('drops remote user_id on pull for every synced table without warning as unknown', () => {
    // user_id is the RLS ownership column: it exists remotely (filled by
    // auth.uid() defaults, enforced by policies) but not in SQLite — local
    // rows are single-user. Reconciliation never reads it (see rowMapping).
    for (const name of [
      'xp_transactions',
      'training_sessions',
      'user_achievements',
    ] as const) {
      const local = toLocalRow(name, {
        id: 'r1',
        user_id: 'auth-user-uuid',
        achievement_id: 'first_step',
      });
      expect(local.user_id).toBeUndefined();
      expect(local.id).toBe('r1');
    }
  });

  it('never emits user_id on push (auth.uid() default fills it remotely)', () => {
    const cloud = toCloudRow('user_achievements', {
      id: 'l1',
      achievementId: 'first_step',
      unlockedAt: '2026-09-26T10:00:00.000Z',
    });
    expect(cloud).toEqual({
      id: 'l1',
      achievement_id: 'first_step',
      unlocked_at: '2026-09-26T10:00:00.000Z',
    });
    expect(cloud.user_id).toBeUndefined();
  });
});

describe('rowMapping — every synced table', () => {
  it.each(SYNC_TABLES.map((t) => [t.name]))('%s has a column map', (name) => {
    const cloud = toCloudRow(name, { id: 'probe', anythingElse: 1 });
    expect(cloud.id).toBe('probe'); // map exists and preserved the PK
    expect(cloud.anythingElse).toBeUndefined(); // unknown keys never leak remotely
  });

  it('reports which tables actually need name translation', () => {
    expect(tableNeedsMapping('training_sessions')).toBe(true);
    expect(tableNeedsMapping('xp_transactions')).toBe(true);
    expect(tableNeedsMapping('not_a_table')).toBe(false);
  });
});
