/**
 * Session-history presentation (pure) — turns raw training-session rows into
 * the human-readable "TODAY'S TRAINING" summary. Repeated sessions of the
 * same discipline collapse into one ×N row; workouts keep their own titles.
 * Lives in the engine layer (no DB imports) so it is unit-testable.
 */

/** Display labels for training kinds — mirrors TRAINING_KIND_META in the repo. */
export const TRAINING_KIND_LABELS = {
  workout: 'Physical Training',
  focus: 'Focus Training',
  mind: 'Mind Training',
  breath: 'Recovery Breathing',
} as const;

export type SessionKind = keyof typeof TRAINING_KIND_LABELS;

/** Minimal shape the grouping needs (compatible with TrainingSession rows). */
export interface SessionHistoryRow {
  kind: string;
  title: string | null;
  durationSec: number;
  xpAwarded: number;
}

export interface SessionGroup {
  /** Display label: workout title or the kind's label. */
  label: string;
  kind: SessionKind;
  /** Sessions merged into this row. */
  count: number;
  /** Total minutes across the group (0 for quick-log workouts). */
  totalMinutes: number;
  totalXp: number;
}

/** Group a session list into human-readable rows (pure). */
export function summarizeSessionHistory(sessions: SessionHistoryRow[]): SessionGroup[] {
  const groups = new Map<string, SessionGroup>();
  for (const s of sessions) {
    const kind = (s.kind in TRAINING_KIND_LABELS ? s.kind : 'workout') as SessionKind;
    const label = s.title?.trim() || TRAINING_KIND_LABELS[kind];
    const key = `${kind}:${label}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalMinutes += Math.round(s.durationSec / 60);
      existing.totalXp += s.xpAwarded;
    } else {
      groups.set(key, {
        label,
        kind,
        count: 1,
        totalMinutes: Math.round(s.durationSec / 60),
        totalXp: s.xpAwarded,
      });
    }
  }
  return [...groups.values()];
}
