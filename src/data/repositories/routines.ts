import { asc, eq, isNull } from 'drizzle-orm';

import { db } from '../db/client';
import { dailyCompletions, habits, routineItems, routines, tasks } from '../db/schema';
import { todayString } from '@/lib/dates';
import { uuid } from '@/lib/id';
import { createLogger } from '@/services/logger';

const logger = createLogger('routines-repo');

export interface RoutineRow {
  id: string;
  name: string;
  icon: string;
  timeOfDay: string;
  /** Weekdays 0..6 the routine is active */
  activeDays: number[];
  reminderTime: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineItemRow {
  id: string;
  routineId: string;
  habitId: string | null;
  taskId: string | null;
  orderIndex: number;
  /** Joined display info */
  refName: string;
  refColor: string | null;
}

export interface RoutineWithItems extends RoutineRow {
  items: RoutineItemRow[];
}

export interface CreateRoutineInput {
  name: string;
  icon?: string;
  timeOfDay?: string;
  activeDays?: number[];
  reminderTime?: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toRoutineRow(raw: typeof routines.$inferSelect): RoutineRow {
  let activeDays: number[] = [0, 1, 2, 3, 4, 5, 6];
  try {
    const parsed = JSON.parse(raw.activeDaysJson);
    if (Array.isArray(parsed)) activeDays = parsed;
  } catch {
    // keep default
  }
  return {
    id: raw.id,
    name: raw.name,
    icon: raw.icon,
    timeOfDay: raw.timeOfDay,
    activeDays,
    reminderTime: raw.reminderTime,
    archivedAt: raw.archivedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export async function listRoutines(includeArchived = false): Promise<RoutineRow[]> {
  const rows = await db
    .select()
    .from(routines)
    .where(includeArchived ? undefined : isNull(routines.archivedAt))
    .orderBy(asc(routines.createdAt));
  return rows.map(toRoutineRow);
}

export async function getRoutineWithItems(id: string): Promise<RoutineWithItems | null> {
  const [raw] = await db.select().from(routines).where(eq(routines.id, id)).limit(1);
  if (!raw) return null;

  const itemRows = await db
    .select({
      item: routineItems,
      habitName: habits.name,
      habitColor: habits.color,
      taskTitle: tasks.title,
    })
    .from(routineItems)
    .leftJoin(habits, eq(routineItems.habitId, habits.id))
    .leftJoin(tasks, eq(routineItems.taskId, tasks.id))
    .where(eq(routineItems.routineId, id))
    .orderBy(asc(routineItems.orderIndex));

  return {
    ...toRoutineRow(raw),
    items: itemRows.map(({ item, habitName, habitColor, taskTitle }) => ({
      id: item.id,
      routineId: item.routineId,
      habitId: item.habitId,
      taskId: item.taskId,
      orderIndex: item.orderIndex,
      refName: habitName ?? taskTitle ?? 'Unknown quest',
      refColor: habitColor,
    })),
  };
}

export async function createRoutine(input: CreateRoutineInput): Promise<RoutineRow> {
  const now = nowIso();
  const row = {
    id: uuid(),
    name: input.name.trim(),
    icon: input.icon ?? 'layers',
    timeOfDay: input.timeOfDay ?? 'anytime',
    activeDaysJson: JSON.stringify(input.activeDays ?? [0, 1, 2, 3, 4, 5, 6]),
    reminderTime: input.reminderTime ?? null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(routines).values(row);
  logger.info('routine created', row.id);
  return toRoutineRow(row as unknown as typeof routines.$inferSelect);
}

export async function updateRoutine(id: string, patch: Partial<CreateRoutineInput> & { archived?: boolean }): Promise<void> {
  const now = nowIso();
  const values: Partial<typeof routines.$inferInsert> = { updatedAt: now };
  if (patch.name !== undefined) values.name = patch.name.trim();
  if (patch.icon !== undefined) values.icon = patch.icon;
  if (patch.timeOfDay !== undefined) values.timeOfDay = patch.timeOfDay;
  if (patch.activeDays !== undefined) values.activeDaysJson = JSON.stringify(patch.activeDays);
  if (patch.reminderTime !== undefined) values.reminderTime = patch.reminderTime;
  if (patch.archived !== undefined) values.archivedAt = patch.archived ? now : null;
  await db.update(routines).set(values).where(eq(routines.id, id));
}

export async function deleteRoutine(id: string): Promise<void> {
  await db.delete(routines).where(eq(routines.id, id));
}

export async function addItemToRoutine(
  routineId: string,
  ref: { habitId?: string; taskId?: string }
): Promise<void> {
  const existing = await db
    .select({ orderIndex: routineItems.orderIndex })
    .from(routineItems)
    .where(eq(routineItems.routineId, routineId));
  const maxOrder = existing.reduce((max, r) => Math.max(max, r.orderIndex), -1);

  await db.insert(routineItems).values({
    id: uuid(),
    routineId,
    habitId: ref.habitId ?? null,
    taskId: ref.taskId ?? null,
    orderIndex: maxOrder + 1,
    createdAt: nowIso(),
  });
}

export async function removeItemFromRoutine(itemId: string): Promise<void> {
  await db.delete(routineItems).where(eq(routineItems.id, itemId));
}

export async function reorderRoutineItems(routineId: string, itemIds: string[]): Promise<void> {
  const now = nowIso();
  for (let i = 0; i < itemIds.length; i++) {
    await db
      .update(routineItems)
      .set({ orderIndex: i })
      .where(eq(routineItems.id, itemIds[i]));
  }
  void now;
}

/**
 * Log a full routine run for `day` (all items checked). One completion row per
 * routine per day — item completions log separately through their own repos.
 */
export async function logRoutineRun(routineId: string, day: string = todayString()): Promise<void> {
  await db
    .insert(dailyCompletions)
    .values({
      id: uuid(),
      entityType: 'routine',
      entityId: routineId,
      day,
      completedAt: nowIso(),
      xpAwarded: 0,
      bonusMultiplier: 100,
    })
    .onConflictDoNothing();
}
