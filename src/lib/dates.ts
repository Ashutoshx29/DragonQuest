/**
 * Local-day utilities.
 *
 * Ground rule (see ARCHITECTURE.md): completion "days" are the user's LOCAL
 * calendar dates as `YYYY-MM-DD` strings — never UTC timestamps. All day math
 * in the app goes through this file.
 */

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Format a Date into a local `YYYY-MM-DD` string. */
export function toLocalDayString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today as a local `YYYY-MM-DD` string. */
export function todayString(): string {
  return toLocalDayString(new Date());
}

/** Parse `YYYY-MM-DD` into a local Date (midnight). Throws on invalid input. */
export function parseDayString(day: string): Date {
  if (!DAY_RE.test(day)) throw new Error(`Invalid day string: "${day}"`);
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidDayString(day: string): boolean {
  return DAY_RE.test(day) && !Number.isNaN(parseDayString(day).getTime());
}

/** Add (or subtract) days from a day string. */
export function addDays(day: string, delta: number): string {
  const date = parseDayString(day);
  date.setDate(date.getDate() + delta);
  return toLocalDayString(date);
}

/** Whole-day difference a - b (positive when a is later). */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const utcA = Date.UTC(ay, am - 1, ad);
  const utcB = Date.UTC(by, bm - 1, bd);
  return Math.round((utcA - utcB) / 86_400_000);
}

/** Day of week (0 = Sunday … 6 = Saturday) for a day string. */
export function weekdayOf(day: string): number {
  return parseDayString(day).getDay();
}

/**
 * Human-readable long date for a day string, e.g. "Sep 27, 2026" — used
 * where raw `YYYY-MM-DD` would read like internal metadata to the user.
 */
export function formatDayLong(day: string): string {
  return parseDayString(day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
