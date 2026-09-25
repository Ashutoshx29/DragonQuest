/**
 * Minimal leveled logger. Dev: everything logs to console.
 * Release: info/debug are dropped; warn/error still log (and will be
 * forwarded to Sentry in Phase 11).
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

function emit(level: Level, scope: string, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;
  const prefix = `[${scope}]`;
  const args: unknown[] = [prefix, message];
  if (data !== undefined) args.push(data);
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
