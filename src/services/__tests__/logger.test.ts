/**
 * Logger serialization tests — pins the fix for "[sync] sync failed
 * [object Object]": unknown error-like objects (Supabase's PostgrestError
 * is a PLAIN object, not an Error) must surface their real fields, and
 * secret-looking keys must be redacted.
 */

import { createLogger, serializeForLog } from '../logger';

/** A Supabase/PostgREST error, exactly as supabase-js returns it. */
function postgrestError(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    message: 'Could not find the \'durationSec\' column of \'training_sessions\' in the relationship schema',
    code: 'PGRST204',
    details: null,
    hint: null,
    ...overrides,
  };
}

describe('serializeForLog — error-like objects', () => {
  it('flattens a PostgrestError into its real fields (the reported bug)', () => {
    const out = serializeForLog(postgrestError()) as Record<string, unknown>;
    expect(out).toMatchObject({
      name: 'Error',
      message: expect.stringContaining('durationSec'),
      code: 'PGRST204',
    });
    // Never again a bare "[object Object]".
    expect(JSON.stringify(out)).not.toBe('"[object Object]"');
  });

  it('keeps hint, details, status and statusCode when present', () => {
    const err = postgrestError({
      details: 'Details: field duration_sec is required',
      hint: 'Perhaps you meant to use duration_sec instead',
      status: 400,
      statusCode: 400,
    });
    const out = serializeForLog(err) as Record<string, unknown>;
    expect(out.details).toBe('Details: field duration_sec is required');
    expect(out.hint).toBe('Perhaps you meant to use duration_sec instead');
    expect(out.status).toBe(400);
    expect(out.statusCode).toBe(400);
  });

  it('preserves real Error instances with name and stack (dev)', () => {
    const error = new TypeError('network request failed');
    const out = serializeForLog(error) as Record<string, unknown>;
    expect(out.name).toBe('TypeError');
    expect(out.message).toBe('network request failed');
    expect(out.stack).toBeDefined();
  });

  it('never throws on circular objects', () => {
    const a: Record<string, unknown> = { name: 'loop' };
    a.self = a;
    expect(() => serializeForLog(a)).not.toThrow();
    expect(serializeForLog(a)).toMatchObject({ name: 'loop', self: '[truncated]' });
  });
});

describe('serializeForLog — generic objects', () => {
  it('serializes nested structures safely', () => {
    const out = serializeForLog({ operation: 'training_sessions', payload: { xp: 50, ok: true } });
    expect(out).toEqual({ operation: 'training_sessions', payload: { xp: 50, ok: true } });
  });

  it('clamps huge strings and deep nesting', () => {
    const out = serializeForLog({ s: 'x'.repeat(5000), deep: { a: { b: { c: { d: { e: 1 } } } } } }) as Record<
      string,
      unknown
    >;
    expect((out.s as string).length).toBeLessThan(5000);
    expect(out.deep).toMatchObject({ a: { b: { c: { d: '[truncated]' } } } });
  });

  it('caps long arrays', () => {
    const out = serializeForLog({ rows: Array.from({ length: 60 }, (_, i) => i) }) as Record<
      string,
      unknown
    >;
    expect((out.rows as unknown[]).length).toBe(30);
  });
});

describe('serializeForLog — secret redaction', () => {
  it('redacts secret-looking values (key names kept for debugging)', () => {
    const out = serializeForLog({
      password: 'hunter2',
      access_token: 'sup.secret.token',
      apiKey: 'sb_secret_whatever',
      Authorization: 'Bearer abc',
      kind: 'workout',
    }) as Record<string, unknown>;
    expect(out.password).toBe('[redacted]');
    expect(out.access_token).toBe('[redacted]');
    expect(out.apiKey).toBe('[redacted]');
    expect(out.Authorization).toBe('[redacted]');
    expect(out.kind).toBe('workout');
    expect(JSON.stringify(out)).not.toContain('hunter2');
    expect(JSON.stringify(out)).not.toContain('sb_secret');
    expect(JSON.stringify(out)).not.toContain('sup.secret.token');
    expect(JSON.stringify(out)).not.toContain('Bearer abc');
  });
});

describe('logger integration', () => {
  it('routes error-like data through serialization without throwing', () => {
    const logger = createLogger('sync');
    expect(() => logger.error('sync failed', postgrestError())).not.toThrow();
  });
});
