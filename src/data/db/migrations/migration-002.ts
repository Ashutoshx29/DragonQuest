/**
 * Migration 002 — goals, milestones, achievements, challenges, settings (Phase 5).
 */
export const MIGRATION_002 = /* sql */ `
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  target_day TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  xp_reward INTEGER NOT NULL DEFAULT 100,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY NOT NULL,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed_at TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS milestones_goal_idx ON milestones (goal_id, order_index);

CREATE TABLE IF NOT EXISTS user_achievements (
  id TEXT PRIMARY KEY NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS user_achievements_unique ON user_achievements (achievement_id);

CREATE TABLE IF NOT EXISTS user_challenges (
  id TEXT PRIMARY KEY NOT NULL,
  challenge_id TEXT NOT NULL,
  started_day TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  finished_day TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;
