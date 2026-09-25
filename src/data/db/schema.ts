import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Local SQLite schema (drizzle) — Phase 3 scope.
 *
 * Conventions (mirrored later in cloud Postgres):
 * - `id`: UUID string (client-generated)
 * - `created_at` / `updated_at`: ISO-8601 UTC timestamps
 * - `deleted_at` / `archived_at`: soft delete / soft archive
 * - `day` columns: LOCAL calendar dates `YYYY-MM-DD` (see lib/dates.ts)
 * - `xp_transactions` + `daily_completions` are append-only ledgers
 */

export const habits = sqliteTable(
  'habits',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    notes: text('notes'),
    icon: text('icon').notNull().default('flash'),
    color: text('color').notNull().default('#00E5FF'),
    /** integer 1..5 — see game/config/xp.ts */
    difficulty: integer('difficulty').notNull().default(3),
    /** JSON: HabitSchedule (lib/schedule.ts) */
    scheduleJson: text('schedule_json').notNull().default('{"type":"daily"}'),
    reminderTime: text('reminder_time'), // "HH:mm" (Phase 8)
    archivedAt: text('archived_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('habits_archived_idx').on(t.archivedAt)]
);

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    notes: text('notes'),
    dueDay: text('due_day'), // YYYY-MM-DD or null = someday
    priority: integer('priority').notNull().default(2), // 1 high, 2 normal, 0 low
    completedAt: text('completed_at'),
    habitId: text('habit_id').references(() => habits.id, { onDelete: 'set null' }),
    deletedAt: text('deleted_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('tasks_open_idx').on(t.completedAt, t.dueDay)]
);

export const routines = sqliteTable('routines', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('layers'),
  /** "morning" | "afternoon" | "evening" | "anytime" */
  timeOfDay: text('time_of_day').notNull().default('anytime'),
  /** JSON array of weekdays 0..6 */
  activeDaysJson: text('active_days_json').notNull().default('[0,1,2,3,4,5,6]'),
  reminderTime: text('reminder_time'),
  archivedAt: text('archived_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const routineItems = sqliteTable(
  'routine_items',
  {
    id: text('id').primaryKey(),
    routineId: text('routine_id')
      .notNull()
      .references(() => routines.id, { onDelete: 'cascade' }),
    /** Points at an existing habit or task (routines are checklists of those). */
    habitId: text('habit_id').references(() => habits.id, { onDelete: 'cascade' }),
    taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('routine_items_routine_idx').on(t.routineId, t.orderIndex)]
);

export const dailyCompletions = sqliteTable(
  'daily_completions',
  {
    id: text('id').primaryKey(),
    /** 'habit' | 'task' | 'routine_item' */
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    /** LOCAL calendar day (YYYY-MM-DD) — never a UTC timestamp. */
    day: text('day').notNull(),
    completedAt: text('completed_at').notNull(),
    xpAwarded: integer('xp_awarded').notNull().default(0),
    bonusMultiplier: integer('bonus_multiplier').notNull().default(100), // percent
  },
  (t) => [
    uniqueIndex('completions_unique_day').on(t.entityType, t.entityId, t.day),
    index('completions_entity_idx').on(t.entityType, t.entityId),
    index('completions_day_idx').on(t.day),
  ]
);

export const xpTransactions = sqliteTable('xp_transactions', {
  id: text('id').primaryKey(),
  amount: integer('amount').notNull(), // negative allowed (corrections)
  /** 'habit' | 'task' | 'routine_item' | 'mission' | 'bonus' | 'manual' */
  source: text('source').notNull(),
  refId: text('ref_id'),
  reason: text('reason'),
  createdAt: text('created_at').notNull(),
});

/** One claim per mission kind per day (kind also holds the 'all_bonus' sentinel). */
export const missionClaims = sqliteTable(
  'mission_claims',
  {
    id: text('id').primaryKey(),
    /** LOCAL day (YYYY-MM-DD) the mission belongs to. */
    day: text('day').notNull(),
    kind: text('kind').notNull(),
    xpAwarded: integer('xp_awarded').notNull().default(0),
    claimedAt: text('claimed_at').notNull(),
  },
  (t) => [uniqueIndex('mission_claims_unique_day_kind').on(t.day, t.kind)]
);
