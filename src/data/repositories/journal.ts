import { desc, eq } from 'drizzle-orm';

import { db } from '../db/client';
import { journalEntries } from '../db/schema';
import { todayString } from '@/lib/dates';
import { uuid } from '@/lib/id';
import { createLogger } from '@/services/logger';

const logger = createLogger('journal-repo');

/**
 * Training Log (journal) repository.
 *
 * One entry per local day (unique index on `day`). Saving the same day twice
 * updates the existing row — journaling stays a 60-second daily ritual.
 * Writing an entry awards a small one-time-per-day Mind XP bonus via the
 * XP ledger (source 'journal' → attribute MIND).
 */

export interface JournalEntry {
  id: string;
  day: string;
  /** Self-rated 1..5; null = not rated. */
  mood: number | null;
  energy: number | null;
  discipline: number | null;
  accomplished: string | null;
  challenged: string | null;
  learned: string | null;
  tomorrowIntent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveJournalInput {
  day: string;
  mood?: number | null;
  energy?: number | null;
  discipline?: number | null;
  accomplished?: string | null;
  challenged?: string | null;
  learned?: string | null;
  tomorrowIntent?: string | null;
}

export const JOURNAL_XP_REWARD = 30;

function toRow(raw: typeof journalEntries.$inferSelect): JournalEntry {
  return {
    id: raw.id,
    day: raw.day,
    mood: raw.mood,
    energy: raw.energy,
    discipline: raw.discipline,
    accomplished: raw.accomplished,
    challenged: raw.challenged,
    learned: raw.learned,
    tomorrowIntent: raw.tomorrowIntent,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function getJournalEntry(day: string): Promise<JournalEntry | null> {
  const [raw] = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.day, day))
    .limit(1);
  return raw ? toRow(raw) : null;
}

export async function getTodayJournal(): Promise<JournalEntry | null> {
  return getJournalEntry(todayString());
}

/** Recent entries, newest first (calendar/history UI). */
export async function listJournalEntries(limit = 60): Promise<JournalEntry[]> {
  const rows = await db
    .select()
    .from(journalEntries)
    .orderBy(desc(journalEntries.day))
    .limit(limit);
  return rows.map(toRow);
}

/**
 * Create or update the entry for `day`. Returns `xpAwarded: number` so the
 * caller (hook layer) can fire XP-change notifications / reward feedback.
 * The ledger reward lands on first save of the day only; later edits never
 * re-award. XP source 'journal' maps to attribute MIND.
 */
export async function saveJournalEntry(
  input: SaveJournalInput
): Promise<{ entry: JournalEntry; xpAwarded: number }> {
  const now = nowIso();
  const [existing] = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.day, input.day))
    .limit(1);

  if (existing) {
    await db
      .update(journalEntries)
      .set({
        mood: input.mood ?? null,
        energy: input.energy ?? null,
        discipline: input.discipline ?? null,
        accomplished: input.accomplished ?? null,
        challenged: input.challenged ?? null,
        learned: input.learned ?? null,
        tomorrowIntent: input.tomorrowIntent ?? null,
        updatedAt: now,
      })
      .where(eq(journalEntries.id, existing.id));
    const entry = await getJournalEntry(input.day);
    return { entry: entry as JournalEntry, xpAwarded: 0 };
  }

  const row = {
    id: uuid(),
    day: input.day,
    mood: input.mood ?? null,
    energy: input.energy ?? null,
    discipline: input.discipline ?? null,
    accomplished: input.accomplished ?? null,
    challenged: input.challenged ?? null,
    learned: input.learned ?? null,
    tomorrowIntent: input.tomorrowIntent ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(journalEntries).values(row);

  // One-time daily reward — reuses the journal XP source (attribute: MIND).
  const { db: database } = await import('../db/client');
  const { xpTransactions } = await import('../db/schema');
  await database.insert(xpTransactions).values({
    id: uuid(),
    amount: JOURNAL_XP_REWARD,
    source: 'journal',
    refId: row.id,
    reason: 'training log entry',
    createdAt: now,
  });
  logger.info(`journal entry saved for ${input.day}`);

  return { entry: toRow(row as unknown as typeof journalEntries.$inferSelect), xpAwarded: JOURNAL_XP_REWARD };
}

/**
 * Days (last `days` local days, oldest first) that have a journal entry —
 * feeds CalendarHistory dots.
 */
export async function getJournaledDays(days: number): Promise<{ day: string; has: boolean }[]> {
  const { addDays } = await import('@/lib/dates');
  const entries = await db.select({ day: journalEntries.day }).from(journalEntries);
  const set = new Set(entries.map((e) => e.day));
  const today = todayString();
  const from = addDays(today, -(days - 1));
  const out: { day: string; has: boolean }[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(from, i);
    out.push({ day, has: set.has(day) });
  }
  return out;
}
