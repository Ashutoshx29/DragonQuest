import { and, asc, eq, isNull } from 'drizzle-orm';

import { db } from '../db/client';
import { dailyCompletions, habits, xpTransactions } from '../db/schema';
import { addDays, todayString } from '@/lib/dates';
import { uuid } from '@/lib/id';
import { BASE_XP, computeXpAward, streakMultiplier } from '@/game/config/xp';
import { computeStreakFromDays, type StreakResult } from '@/game/engine/streaks';
import {
  isScheduledOn,
  parseSchedule,
  serializeSchedule,
  type HabitSchedule,
} from '@/lib/schedule';
import { createLogger } from '@/services/logger';

const logger = createLogger('habits-repo');

export interface HabitRow {
  id: string;
  name: string;
  notes: string | null;
  icon: string;
  color: string;
  difficulty: number;
  schedule: HabitSchedule;
  reminderTime: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HabitWithProgress extends HabitRow {
  scheduledToday: boolean;
  doneToday: boolean;
  streak: StreakResult;
}

export interface CreateHabitInput {
  name: string;
  notes?: string | null;
  icon?: string;
  color?: string;
  difficulty?: number;
  schedule?: HabitSchedule;
  reminderTime?: string | null;
}

export interface UpdateHabitInput extends Partial<CreateHabitInput> {
  archived?: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toRow(raw: typeof habits.$inferSelect): HabitRow {
  return {
    id: raw.id,
    name: raw.name,
    notes: raw.notes,
    icon: raw.icon,
    color: raw.color,
    difficulty: raw.difficulty,
    schedule: parseSchedule(raw.scheduleJson),
    reminderTime: raw.reminderTime,
    archivedAt: raw.archivedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

async function getCompletionDays(habitId: string): Promise<string[]> {
  const rows = await db
    .select({ day: dailyCompletions.day })
    .from(dailyCompletions)
    .where(and(eq(dailyCompletions.entityType, 'habit'), eq(dailyCompletions.entityId, habitId)))
    .orderBy(asc(dailyCompletions.day));
  return rows.map((r) => r.day);
}

export async function getStreak(habitId: string): Promise<StreakResult> {
  return computeStreakFromDays(await getCompletionDays(habitId));
}

/** List habits with today's progress. N+1 streak lookups are fine at personal scale. */
export async function listHabits(includeArchived = false): Promise<HabitWithProgress[]> {
  const today = todayString();
  const rows = await db
    .select()
    .from(habits)
    .where(includeArchived ? undefined : isNull(habits.archivedAt))
    .orderBy(asc(habits.createdAt));

  const withProgress = await Promise.all(
    rows.map(async (raw) => {
      const row = toRow(raw);
      const days = await getCompletionDays(row.id);
      return {
        ...row,
        scheduledToday: row.archivedAt === null && isScheduledOn(row.schedule, today),
        doneToday: days.includes(today),
        streak: computeStreakFromDays(days, today),
      };
    })
  );
  return withProgress;
}

export async function getHabit(id: string): Promise<HabitWithProgress | null> {
  const [raw] = await db.select().from(habits).where(eq(habits.id, id)).limit(1);
  if (!raw) return null;
  const today = todayString();
  const row = toRow(raw);
  const days = await getCompletionDays(row.id);
  return {
    ...row,
    scheduledToday: row.archivedAt === null && isScheduledOn(row.schedule, today),
    doneToday: days.includes(today),
    streak: computeStreakFromDays(days, today),
  };
}

export async function createHabit(input: CreateHabitInput): Promise<HabitRow> {
  const now = nowIso();
  const row = {
    id: uuid(),
    name: input.name.trim(),
    notes: input.notes ?? null,
    icon: input.icon ?? 'flash',
    color: input.color ?? '#00E5FF',
    difficulty: input.difficulty ?? 3,
    scheduleJson: serializeSchedule(input.schedule ?? { type: 'daily' }),
    reminderTime: input.reminderTime ?? null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(habits).values(row);
  logger.info('habit created', row.id);
  return toRow(row as unknown as typeof habits.$inferSelect);
}

export async function updateHabit(id: string, patch: UpdateHabitInput): Promise<void> {
  const now = nowIso();
  const values: Partial<typeof habits.$inferInsert> = { updatedAt: now };
  if (patch.name !== undefined) values.name = patch.name.trim();
  if (patch.notes !== undefined) values.notes = patch.notes;
  if (patch.icon !== undefined) values.icon = patch.icon;
  if (patch.color !== undefined) values.color = patch.color;
  if (patch.difficulty !== undefined) values.difficulty = patch.difficulty;
  if (patch.schedule !== undefined) values.scheduleJson = serializeSchedule(patch.schedule);
  if (patch.reminderTime !== undefined) values.reminderTime = patch.reminderTime;
  if (patch.archived !== undefined) values.archivedAt = patch.archived ? now : null;
  await db.update(habits).set(values).where(eq(habits.id, id));
}

/**
 * Soft-delete a habit (tombstone). Phase 6: hard deletes cannot be
 * synchronized (a pulled copy would resurrect), so deletions stamp
 * archivedAt and let every device converge on the same tombstone.
 */
export async function deleteHabit(id: string): Promise<void> {
  await db
    .update(habits)
    .set({ archivedAt: nowIso(), updatedAt: nowIso() })
    .where(eq(habits.id, id));
}

export interface ToggleResult {
  completed: boolean;
  xpDelta: number;
  streak: number;
}

/**
 * Toggle today's completion for a habit. Awards XP on complete (streak-aware);
 * on undo, inserts a negative XP correction so the ledger stays accurate
 * without violating its append-only nature.
 */
export async function toggleHabitToday(id: string): Promise<ToggleResult> {
  const today = todayString();

  const [raw] = await db.select().from(habits).where(eq(habits.id, id)).limit(1);
  if (!raw) throw new Error(`Habit not found: ${id}`);
  const habit = toRow(raw);

  const [existing] = await db
    .select()
    .from(dailyCompletions)
    .where(
      and(
        eq(dailyCompletions.entityType, 'habit'),
        eq(dailyCompletions.entityId, id),
        eq(dailyCompletions.day, today)
      )
    )
    .limit(1);

  if (existing) {
    await db.delete(dailyCompletions).where(eq(dailyCompletions.id, existing.id));
    await db.insert(xpTransactions).values({
      id: uuid(),
      amount: -existing.xpAwarded,
      source: 'habit',
      refId: id,
      reason: 'completion undone',
      createdAt: nowIso(),
    });
    const streak = await getStreak(id);
    return { completed: false, xpDelta: -existing.xpAwarded, streak: streak.current };
  }

  const days = await getCompletionDays(id);
  const streak = computeStreakFromDays([...days, today], today);
  const xp = computeXpAward(BASE_XP.habit, habit.difficulty, streak.current);

  await db.insert(dailyCompletions).values({
    id: uuid(),
    entityType: 'habit',
    entityId: id,
    day: today,
    completedAt: nowIso(),
    xpAwarded: xp,
    bonusMultiplier: Math.round(streakMultiplier(streak.current) * 100),
  });
  await db.insert(xpTransactions).values({
    id: uuid(),
    amount: xp,
    source: 'habit',
    refId: id,
    reason: 'habit completed',
    createdAt: nowIso(),
  });

  logger.info(`habit ${habit.name} completed (+${xp} xp, streak ${streak.current})`);
  return { completed: true, xpDelta: xp, streak: streak.current };
}

/** Yesterday as a day string — used by "recover your streak" UI. */
export function yesterday(): string {
  return addDays(todayString(), -1);
}
