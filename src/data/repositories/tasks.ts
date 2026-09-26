import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import { db } from '../db/client';
import { dailyCompletions, tasks, xpTransactions } from '../db/schema';
import { BASE_XP } from '@/game/config/xp';
import { todayString } from '@/lib/dates';
import { uuid } from '@/lib/id';
import { createLogger } from '@/services/logger';

const logger = createLogger('tasks-repo');

export interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  dueDay: string | null;
  priority: number;
  completedAt: string | null;
  habitId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  notes?: string | null;
  dueDay?: string | null;
  priority?: number;
  habitId?: string | null;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  deleted?: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function listTasks(options: { openOnly?: boolean } = {}): Promise<TaskRow[]> {
  const conditions = [isNull(tasks.deletedAt)];
  if (options.openOnly) conditions.push(isNull(tasks.completedAt));
  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.completedAt), desc(tasks.priority), asc(tasks.dueDay));
  return rows;
}

export async function getTask(id: string): Promise<TaskRow | null> {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return row ?? null;
}

export async function createTask(input: CreateTaskInput): Promise<TaskRow> {
  const now = nowIso();
  const row = {
    id: uuid(),
    title: input.title.trim(),
    notes: input.notes ?? null,
    dueDay: input.dueDay ?? null,
    priority: input.priority ?? 2,
    completedAt: null,
    habitId: input.habitId ?? null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(tasks).values(row);
  return row;
}

export async function updateTask(id: string, patch: UpdateTaskInput): Promise<void> {
  const values: Partial<typeof tasks.$inferInsert> = { updatedAt: nowIso() };
  if (patch.title !== undefined) values.title = patch.title.trim();
  if (patch.priority !== undefined) values.priority = patch.priority;
  if (patch.dueDay !== undefined) values.dueDay = patch.dueDay;
  if (patch.notes !== undefined) values.notes = patch.notes;
  if (patch.habitId !== undefined) values.habitId = patch.habitId;
  if (patch.deleted !== undefined) values.deletedAt = patch.deleted ? nowIso() : null;
  await db.update(tasks).set(values).where(eq(tasks.id, id));
}

/**
 * Soft-delete a task (tombstone). Phase 6: hard deletes cannot be
 * synchronized (a pulled copy would resurrect), so deletions stamp
 * deletedAt and let every device converge on the same tombstone.
 */
export async function deleteTask(id: string): Promise<void> {
  await db
    .update(tasks)
    .set({ deletedAt: nowIso(), updatedAt: nowIso() })
    .where(eq(tasks.id, id));
}

export async function toggleTask(id: string): Promise<{ completed: boolean; xpDelta: number }> {
  const now = nowIso();
  const today = todayString();
  const task = await getTask(id);
  if (!task) throw new Error(`Task not found: ${id}`);

  if (task.completedAt) {
    // Undo: clear completion + insert negative XP correction (ledger stays append-only).
    await db.update(tasks).set({ completedAt: null, updatedAt: now }).where(eq(tasks.id, id));
    const [existing] = await db
      .select()
      .from(dailyCompletions)
      .where(
        and(
          eq(dailyCompletions.entityType, 'task'),
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
        source: 'task',
        refId: id,
        reason: 'task completion undone',
        createdAt: now,
      });
      return { completed: false, xpDelta: -existing.xpAwarded };
    }
    return { completed: false, xpDelta: 0 };
  }

  const xp = BASE_XP.task;
  await db.update(tasks).set({ completedAt: now, updatedAt: now }).where(eq(tasks.id, id));
  await db.insert(dailyCompletions).values({
    id: uuid(),
    entityType: 'task',
    entityId: id,
    day: today,
    completedAt: now,
    xpAwarded: xp,
    bonusMultiplier: 100,
  });
  await db.insert(xpTransactions).values({
    id: uuid(),
    amount: xp,
    source: 'task',
    refId: id,
    reason: 'task completed',
    createdAt: now,
  });
  logger.info(`task completed (+${xp} xp)`, id);
  return { completed: true, xpDelta: xp };
}
