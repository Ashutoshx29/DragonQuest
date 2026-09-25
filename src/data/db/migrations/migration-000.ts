/**
 * Migration 000 — initial schema (Phase 3).
 *
 * Hand-written and reviewed. Must stay equivalent to src/data/db/schema.ts
 * (drizzle definition is the source of truth; this SQL is what actually runs).
 */
export const MIGRATION_000 = /* sql */ `
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  icon TEXT NOT NULL DEFAULT 'flash',
  color TEXT NOT NULL DEFAULT '#00E5FF',
  difficulty INTEGER NOT NULL DEFAULT 3,
  schedule_json TEXT NOT NULL DEFAULT '{"type":"daily"}',
  reminder_time TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS habits_archived_idx ON habits (archived_at);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  due_day TEXT,
  priority INTEGER NOT NULL DEFAULT 2,
  completed_at TEXT,
  habit_id TEXT REFERENCES habits(id) ON DELETE SET NULL,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_open_idx ON tasks (completed_at, due_day);

CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'layers',
  time_of_day TEXT NOT NULL DEFAULT 'anytime',
  active_days_json TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
  reminder_time TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS routine_items (
  id TEXT PRIMARY KEY NOT NULL,
  routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  habit_id TEXT REFERENCES habits(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS routine_items_routine_idx ON routine_items (routine_id, order_index);

CREATE TABLE IF NOT EXISTS daily_completions (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  day TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  bonus_multiplier INTEGER NOT NULL DEFAULT 100
);
CREATE UNIQUE INDEX IF NOT EXISTS completions_unique_day ON daily_completions (entity_type, entity_id, day);
CREATE INDEX IF NOT EXISTS completions_entity_idx ON daily_completions (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS completions_day_idx ON daily_completions (day);

CREATE TABLE IF NOT EXISTS xp_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  ref_id TEXT,
  reason TEXT,
  created_at TEXT NOT NULL
);
`;
