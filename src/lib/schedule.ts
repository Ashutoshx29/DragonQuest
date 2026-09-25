import { weekdayOf } from './dates';

/**
 * Habit scheduling model.
 * - daily: every day
 * - days: specific weekdays (0 = Sunday … 6 = Saturday)
 *
 * Stored as JSON in habits.schedule_json so new schedule types (e.g. interval)
 * can be added later without a schema change.
 */

export type HabitSchedule = { type: 'daily' } | { type: 'days'; days: number[] };

export const DEFAULT_SCHEDULE: HabitSchedule = { type: 'daily' };

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
export const WEEKDAY_CHIPS = WEEKDAY_LABELS.map((label, value) => ({ label, value }));

export function parseSchedule(json: string | null | undefined): HabitSchedule {
  if (!json) return DEFAULT_SCHEDULE;
  try {
    const parsed = JSON.parse(json) as HabitSchedule;
    if (parsed?.type === 'days' && Array.isArray(parsed.days)) {
      return { type: 'days', days: parsed.days };
    }
    return DEFAULT_SCHEDULE;
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

export function serializeSchedule(schedule: HabitSchedule): string {
  return JSON.stringify(schedule);
}

export function isScheduledOn(schedule: HabitSchedule, day: string): boolean {
  if (schedule.type === 'daily') return true;
  return schedule.days.includes(weekdayOf(day));
}

export function describeSchedule(schedule: HabitSchedule): string {
  if (schedule.type === 'daily') return 'Every day';
  if (schedule.days.length === 0) return 'No days selected';
  const sorted = [...schedule.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  return sorted.map((d) => WEEKDAY_LABELS[d]).join(' · ');
}
