/**\n * Migration 001 — mission claims (Phase 4).\n * One claim per (day, kind); kind also holds the 'all_bonus' chest sentinel.\n */
export const MIGRATION_001 = /* sql */ `
CREATE TABLE IF NOT EXISTS mission_claims (
  id TEXT PRIMARY KEY NOT NULL,
  day TEXT NOT NULL,
  kind TEXT NOT NULL,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  claimed_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS mission_claims_unique_day_kind ON mission_claims (day, kind);
`;
