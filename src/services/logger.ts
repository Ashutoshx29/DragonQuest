/**
 * Minimal leveled logger. Dev: everything logs to console.
 * Release: info/debug are dropped; warn/error still log (and will be
 * forwarded to Sentry in Phase 11).
 *
 * All `data` arguments pass through `serializeForLog` before hitting the
 * console: unknown errors (Supabase returns plain PostgrestError objects,
 * NOT Error instances) are flattened into readable structured objects, and
 * secret-looking keys are redacted. This is why `[sync] sync failed
 * [object Object]` can never happen again — see serializeForLog below.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function isDev(): boolean {
  if (typeof __DEV__ !== 'undefined') return __DEV__;
  return process.env.NODE_ENV !== 'production';
}

const minLevel: Level = isDev() ? 'debug' : 'warn';

function shouldLog(level: Level): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

// ── Safe serialization ─────────────────────────────────────────────────────

/** Keys that must never reach the log (tokens, credentials, secrets). */
const SECRET_KEY_PATTERN = /pass(word)?|passphrase|token|secret|api_?key|authorization|cookie|credential/i;
const REDACTED = '[redacted]';

const MAX_DEPTH = 4; // object nesting kept in the output
const MAX_ARRAY = 30; // array items kept
const MAX_KEYS = 60; // object keys kept
const MAX_STRING = 600; // string characters kept

function clampString(value: string): string {
  return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[truncated]` : value;
}

/**
 * Supabase/PostgREST errors are PLAIN OBJECTS ({ message, code, details,
 * hint }), not Error instances — `String(err)` on them yields "[object
 * Object]". Detect them by shape so their real fields are preserved.
 */
function isErrorLike(value: Record<string, unknown>): boolean {
  if (value instanceof Error) return true;
  if (typeof value.message !== 'string') return false;
  return (['code', 'details', 'hint', 'status', 'statusCode'] as const).some(
    (key) => key in value
  );
}

/** Flatten an Error / error-like object into the fields worth logging. */
function serializeErrorLike(
  value: Record<string, unknown>,
  depth: number,
  seen: Set<object>
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    name: typeof value.name === 'string' ? value.name : 'Error',
    message: typeof value.message === 'string' ? clampString(value.message) : String(value.message ?? ''),
  };
  for (const key of ['code', 'details', 'hint', 'status', 'statusCode', 'cause'] as const) {
    if (value[key] !== undefined) out[key] = serializeForLog(value[key], depth + 1, seen);
  }
  // Stack traces are dev gold but can be long and occasionally contain
  // request URLs — keep them development-only.
  if (isDev() && typeof value.stack === 'string') out.stack = clampString(value.stack);
  return out;
}

/**
 * Safe structured serialization for ANY log payload:
 * - Errors and error-like objects → { name, message, code, details, hint,
 *   status, statusCode, cause } — the actual failure, never "[object Object]".
 * - Generic objects/arrays → depth/size-capped clones; secret-looking keys
 *   (password, token, api_key, authorization, …) are redacted.
 * - Circular references are broken safely; nothing throws, ever.
 */
export function serializeForLog(value: unknown, depth = 0, seen?: Set<object>): unknown {
  if (value === null || value === undefined) return value;
  const type = typeof value;
  if (type === 'string') return clampString(value as string);
  if (type === 'number' || type === 'boolean') return value;
  if (type === 'bigint') return (value as bigint).toString();
  if (type === 'function') return '[function]';
  if (value instanceof Date) return value.toISOString();

  const obj = value as Record<string, unknown>;
  const seenSet = seen ?? new Set<object>();
  if (seenSet.has(obj) || depth > MAX_DEPTH) return '[truncated]';
  seenSet.add(obj);
  try {
    if (isErrorLike(obj)) return serializeErrorLike(obj, depth, seenSet);
    if (Array.isArray(value)) {
      return value.slice(0, MAX_ARRAY).map((item) => serializeForLog(item, depth + 1, seenSet));
    }
    const out: Record<string, unknown> = {};
    let count = 0;
    for (const [key, item] of Object.entries(obj)) {
      if (++count > MAX_KEYS) {
        out['[truncated]'] = `+${Object.keys(obj).length - MAX_KEYS} more keys`;
        break;
      }
      // Keep the key NAME (structural, aids debugging) but redact the VALUE.
      out[key] = SECRET_KEY_PATTERN.test(key) ? REDACTED : serializeForLog(item, depth + 1, seenSet);
    }
    return out;
  } catch {
    // Serialization must never be able to break the logger itself.
    return '[unserializable]';
  } finally {
    seenSet.delete(obj);
  }
}

function emit(level: Level, scope: string, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;
  const prefix = `[${scope}]`;
  const args: unknown[] = [prefix, message];
  if (data !== undefined) args.push(serializeForLog(data));
  const sink =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  sink(...args);
}

export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

/** Create a namespaced logger, e.g. createLogger('habits'). */
export function createLogger(scope: string): Logger {
  return {
    debug: (message, data) => emit('debug', scope, message, data),
    info: (message, data) => emit('info', scope, message, data),
    warn: (message, data) => emit('warn', scope, message, data),
    error: (message, data) => emit('error', scope, message, data),
  };
}
