/**
 * Dev-machine smoke test for the hand-written migration SQL.
 * Runs it against node:sqlite (no emulator needed) and verifies the
 * constraints the app relies on. Run: `npm run smoke:db`
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/data/db/migrations/migration-000.ts', import.meta.url), 'utf8');
const sql = src.match(/\/\* sql \*\/ `([\s\S]*)`/)[1];

const db = new DatabaseSync(':memory:');
db.exec(sql);

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

console.log('SMOKE PASSED');
