import { desc, eq, gte, sql } from 'drizzle-orm';

import { db } from '../db/client';
import { trainingSessions, xpTransactions } from '../db/schema';
import { addDays, todayString } from '@/lib/dates';
import { uuid } from '@/lib/id';
import { createLogger } from '@/services/logger';
import { TRAINING_PRESETS, TRAINING_XP, computeTrainingXpPure } from '@/game/config/training';

const logger = createLogger('training-repo');

/**
 * Training sessions repository — focus/mind/breath timers and logged physical
 * training. Every completed session writes a `training_sessions` row AND an
 * `xp_transactions` row (append-only ledger stays the source of truth for XP;
 * attributes derive from it — see game/config/attributes.ts).
 */

export type TrainingKind = 'workout' | 'focus' | 'mind' | 'breath';

/** XP per minute for timed sessions; workouts use a flat log reward. */
export const TRAINING_XP_ECONOMY = TRAINING_XP;

/** Quick session presets (seconds) — single source in game/config/training. */
export const TRAINING_PRESET_SECONDS = TRAINING_PRESETS;

/** Attribute mapping for display (mirrors game/config/attributes.ts). */
export const TRAINING_KIND_META: Record<
  TrainingKind,
  { label: string; icon: string; attribute: 'power' | 'focus' | 'mind' | 'energy'; accent: string }
> = {
  workout: { label: 'Physical Training', icon: 'barbell', attribute: 'power', accent: '#FF6B35' },
  focus: { label: 'Focus Training', icon: 'timer', attribute: 'focus', accent: '#00E5FF' },
  mind: { label: 'Mind Training', icon: 'leaf', attribute: 'mind', accent: '#A78BFA' },
  breath: { label: 'Recovery Breathing', icon: 'water', attribute: 'energy', accent: '#4ADE80' },
};

export interface TrainingSession {
  id: string;
  kind: TrainingKind;
  title: string | null;
  durationSec: number;
  completedAt: string;
  day: string;
  xpAwarded: number;
  payloadJson: string | null;
}

export interface CompleteTrainingInput {
  kind: TrainingKind;
  title?: string | null;
  durationSec?: number;
  /** Arbitrary structured payload (workout sets/reps, timer config…). */
  payload?: Record<string, unknown> | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toRow(raw: typeof trainingSessions.$inferSelect): TrainingSession {
  return {
    id: raw.id,
    kind: raw.kind as TrainingKind,
    title: raw.title,
    durationSec: raw.durationSec,
    completedAt: raw.completedAt,
    day: raw.day,
    xpAwarded: raw.xpAwarded,
    payloadJson: raw.payloadJson,
  };
}

/** Compute the XP award for a session — delegates to the pure game rule. */
export function computeTrainingXp(kind: TrainingKind, durationSec: number): number {
  return computeTrainingXpPure(kind, durationSec);
}

/**
 * Log a completed training session and award its XP. The hook layer fires
 * XP-change notifications / reward feedback from the returned session.
 */
export async function completeTrainingSession(input: CompleteTrainingInput): Promise<TrainingSession> {
  const now = nowIso();
  const day = todayString();
  const durationSec = Math.max(0, Math.round(input.durationSec ?? 0));
  const xp = computeTrainingXp(input.kind, durationSec);

  const row = {
    id: uuid(),
    kind: input.kind,
    title: input.title ?? null,
    durationSec,
    completedAt: now,
    day,
    xpAwarded: xp,
    payloadJson: input.payload ? JSON.stringify(input.payload) : null,
  };
  await db.insert(trainingSessions).values(row);

  await db.insert(xpTransactions).values({
    id: uuid(),
    amount: xp,
    source: input.kind === 'workout' ? 'workout' : input.kind === 'focus' ? 'focus_session' : input.kind === 'mind' ? 'mind_training' : 'breath_training',
    refId: row.id,
    reason: `${TRAINING_KIND_META[input.kind].label} completed`,
    createdAt: now,
  });

  logger.info(`training session ${input.kind} +${xp}xp`);
  return toRow(row as unknown as typeof trainingSessions.$inferSelect);
}

export async function listSessionsToday(): Promise<TrainingSession[]> {
  const today = todayString();
  const rows = await db
    .select()
    .from(trainingSessions)
    .where(eq(trainingSessions.day, today))
    .orderBy(desc(trainingSessions.completedAt));
  return rows.map(toRow);
}

/** Sessions in the last `days` local days (oldest first) — history/charts. */
export async function listRecentSessions(days: number): Promise<TrainingSession[]> {
  const from = addDays(todayString(), -(days - 1));
  const rows = await db
    .select()
    .from(trainingSessions)
    .where(gte(trainingSessions.day, from))
    .orderBy(trainingSessions.completedAt);
  return rows.map(toRow);
}

export interface TrainingSummary {
  /** Sessions per kind for the window. */
  byKind: Record<TrainingKind, { count: number; seconds: number; xp: number }>;
  totalSessions: number;
  totalSeconds: number;
  totalXp: number;
}

/** Aggregate a session list into a summary (pure helper). */
export function summarizeSessions(sessions: TrainingSession[]): TrainingSummary {
  const byKind = {
    workout: { count: 0, seconds: 0, xp: 0 },
    focus: { count: 0, seconds: 0, xp: 0 },
    mind: { count: 0, seconds: 0, xp: 0 },
    breath: { count: 0, seconds: 0, xp: 0 },
  } as TrainingSummary['byKind'];
  for (const s of sessions) {
    const bucket = byKind[s.kind];
    if (!bucket) continue;
    bucket.count += 1;
    bucket.seconds += s.durationSec;
    bucket.xp += s.xpAwarded;
  }
  return {
    byKind,
    totalSessions: sessions.length,
    totalSeconds: sessions.reduce((a, s) => a + s.durationSec, 0),
    totalXp: sessions.reduce((a, s) => a + s.xpAwarded, 0),
  };
}

/** Weekly training minutes (last 7 local days, oldest first) for charts. */
export async function getWeeklyTrainingMinutes(): Promise<{ day: string; minutes: number }[]> {
  const sessions = await listRecentSessions(7);
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    byDay.set(s.day, (byDay.get(s.day) ?? 0) + s.durationSec / 60);
  }
  const today = todayString();
  const out: { day: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = addDays(today, -i);
    out.push({ day, minutes: Math.round(byDay.get(day) ?? 0) });
  }
  return out;
}

/** Count of training sessions logged all-time (profile sheet). */
export async function countTrainingSessions(): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(trainingSessions);
  return Number(row?.n ?? 0);
}
