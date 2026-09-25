import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '../db/client';
import { goals, milestones, xpTransactions } from '../db/schema';
import { uuid } from '@/lib/id';
import { createLogger } from '@/services/logger';

const logger = createLogger('goals-repo');

export interface MilestoneRow {
  id: string;
  goalId: string;
  title: string;
  completedAt: string | null;
  orderIndex: number;
}

export interface GoalRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  targetDay: string | null;
  status: string;
  xpReward: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalWithMilestones extends GoalRow {
  milestones: MilestoneRow[];
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function listGoals(status?: 'active' | 'done' | 'abandoned'): Promise<GoalRow[]> {
  const rows = await db
    .select()
    .from(goals)
    .where(status ? eq(goals.status, status) : undefined)
    .orderBy(asc(goals.createdAt));
  return rows;
}

export async function getGoalWithMilestones(id: string): Promise<GoalWithMilestones | null> {
  const [goal] = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  if (!goal) return null;
  const items = await db
    .select()
    .from(milestones)
    .where(eq(milestones.goalId, id))
    .orderBy(asc(milestones.orderIndex));
  return { ...goal, milestones: items };
}

export async function createGoal(input: {
  title: string;
  description?: string | null;
  category?: string | null;
  targetDay?: string | null;
  xpReward?: number;
}): Promise<GoalRow> {
  const now = nowIso();
  const row = {
    id: uuid(),
    title: input.title.trim(),
    description: input.description ?? null,
    category: input.category ?? null,
    targetDay: input.targetDay ?? null,
    status: 'active',
    xpReward: input.xpReward ?? 100,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(goals).values(row);
  return row;
}

export async function updateGoal(
  id: string,
  patch: Partial<{ title: string; description: string | null; category: string | null; targetDay: string | null; status: string; xpReward: number }>
): Promise<void> {
  const values: Partial<typeof goals.$inferInsert> = { updatedAt: nowIso() };
  if (patch.title !== undefined) values.title = patch.title.trim();
  if (patch.description !== undefined) values.description = patch.description;
  if (patch.category !== undefined) values.category = patch.category;
  if (patch.targetDay !== undefined) values.targetDay = patch.targetDay;
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.xpReward !== undefined) values.xpReward = patch.xpReward;
  await db.update(goals).set(values).where(eq(goals.id, id));
}

export async function deleteGoal(id: string): Promise<void> {
  await db.delete(goals).where(eq(goals.id, id));
}

export async function addMilestone(goalId: string, title: string): Promise<void> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${milestones.orderIndex}), -1)` })
    .from(milestones)
    .where(eq(milestones.goalId, goalId));
  await db.insert(milestones).values({
    id: uuid(),
    goalId,
    title: title.trim(),
    completedAt: null,
    orderIndex: Number(row?.max ?? -1) + 1,
    createdAt: nowIso(),
  });
}

export async function toggleMilestone(milestoneId: string): Promise<void> {
  const [item] = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).limit(1);
  if (!item) return;
  await db
    .update(milestones)
    .set({ completedAt: item.completedAt ? null : nowIso() })
    .where(eq(milestones.id, milestoneId));
}

export async function removeMilestone(milestoneId: string): Promise<void> {
  await db.delete(milestones).where(eq(milestones.id, milestoneId));
}

/**
 * Complete a goal: marks it done and awards its XP reward (idempotent —
 * only awards when transitioning from active).
 */
export async function completeGoal(id: string): Promise<{ xpAwarded: number }> {
  const [goal] = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  if (!goal) return { xpAwarded: 0 };
  if (goal.status !== 'active') return { xpAwarded: 0 };

  const now = nowIso();
  await db.update(goals).set({ status: 'done', completedAt: now, updatedAt: now }).where(eq(goals.id, id));
  await db.insert(xpTransactions).values({
    id: uuid(),
    amount: goal.xpReward,
    source: 'goal',
    refId: id,
    reason: `goal completed: ${goal.title}`,
    createdAt: now,
  });
  logger.info(`goal completed (+${goal.xpReward} xp)`, goal.title);
  return { xpAwarded: goal.xpReward };
}

export async function countOpenMilestones(goalId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(milestones)
    .where(and(eq(milestones.goalId, goalId), isNull(milestones.completedAt)));
  return Number(row?.n ?? 0);
}
