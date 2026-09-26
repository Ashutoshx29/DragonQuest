/**
 * Dev-machine smoke test for the generated migration SQL.
 * Runs the drizzle-generated SQL against node:sqlite (no emulator needed)
 * and verifies the constraints the app relies on. Run: `npm run smoke:db`
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
  new URL('../src/data/db/drizzle/0000_init.sql', import.meta.url),
  'utf8'
);

const db = new DatabaseSync(':memory:');
// Execute exactly as the drizzle migrator does: split on statement-breakpoint.
for (const stmt of sql.split('--> statement-breakpoint')) {
  db.exec(stmt);
}

const now = new Date().toISOString();

// habits insert
db.prepare(
  'INSERT INTO habits (id, name, difficulty, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
).run('h1', 'Morning training', 4, now, now);

// unique completion per (entity_type, entity_id, day)
const insCompletion = db.prepare(
  'INSERT INTO daily_completions (id, entity_type, entity_id, day, completed_at) VALUES (?, ?, ?, ?, ?)'
);
insCompletion.run('c1', 'habit', 'h1', '2026-09-26', now);
try {
  insCompletion.run('c2', 'habit', 'h1', '2026-09-26', now);
  console.error('FAIL: duplicate completion for same day was allowed');
  process.exit(1);
} catch {
  console.log('OK: unique (entity_type, entity_id, day) enforced');
}

// routine → routine_items cascade delete
db.prepare(
  'INSERT INTO routines (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)'
).run('r1', 'Morning routine', now, now);
db.prepare(
  'INSERT INTO routine_items (id, routine_id, habit_id, order_index, created_at) VALUES (?, ?, ?, ?, ?)'
).run('ri1', 'r1', 'h1', 0, now);
db.prepare('DELETE FROM routines WHERE id = ?').run('r1');
const remaining = db.prepare('SELECT COUNT(*) AS n FROM routine_items').get();
if (remaining.n !== 0) {
  console.error('FAIL: routine_items not cascaded on routine delete');
  process.exit(1);
}
console.log('OK: routine_items cascade delete works');

// xp ledger append
db.prepare(
  'INSERT INTO xp_transactions (id, amount, source, ref_id, created_at) VALUES (?, ?, ?, ?, ?)'
).run('x1', 30, 'habit', 'h1', now);
console.log('OK: xp_transactions insert works');

// one mission claim per (day, kind)
const insClaim = db.prepare(
  'INSERT INTO mission_claims (id, day, kind, xp_awarded, claimed_at) VALUES (?, ?, ?, ?, ?)'
);
insClaim.run('m1', '2026-09-26', 'any_three', 50, now);
try {
  insClaim.run('m2', '2026-09-26', 'any_three', 50, now);
  console.error('FAIL: duplicate mission claim for same (day, kind) allowed');
  process.exit(1);
} catch {
  console.log('OK: mission_claims unique (day, kind) enforced');
}

// goals + milestones cascade
db.prepare(
  'INSERT INTO goals (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)'
).run('g1', 'Run a 10k', now, now);
db.prepare(
  'INSERT INTO milestones (id, goal_id, title, order_index, created_at) VALUES (?, ?, ?, ?, ?)'
).run('ms1', 'g1', 'Run 5k without stopping', 0, now);
db.prepare('DELETE FROM goals WHERE id = ?').run('g1');
const msLeft = db.prepare('SELECT COUNT(*) AS n FROM milestones').get();
if (msLeft.n !== 0) {
  console.error('FAIL: milestones not cascaded on goal delete');
  process.exit(1);
}
console.log('OK: milestones cascade delete works');

// achievements unique + settings KV
const insAch = db.prepare(
  'INSERT INTO user_achievements (id, achievement_id, unlocked_at) VALUES (?, ?, ?)'
);
insAch.run('ua1', 'first_blood', now);
try {
  insAch.run('ua2', 'first_blood', now);
  console.error('FAIL: duplicate achievement unlock allowed');
  process.exit(1);
} catch {
  console.log('OK: user_achievements unique achievement_id enforced');
}
db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run('sound', 'on');
console.log('OK: app_settings KV works');

console.log('SMOKE PASSED');
