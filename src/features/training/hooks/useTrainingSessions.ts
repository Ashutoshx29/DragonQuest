import { useCallback, useState } from 'react';

import {
  completeTrainingSession,
  getWeeklyTrainingMinutes,
  listSessionsToday,
  listRecentSessions,
  summarizeSessions,
  type TrainingKind,
  type TrainingSession,
  type TrainingSummary,
} from '@/data/repositories';
import { useAsync } from '@/hooks/useAsync';
import { notifyXpChanged } from '@/features/progression/xpEvents';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';

/**
 * Training sessions (focus / mind / breath / workout). The repository writes
 * the session + ledger rows; this hook owns feedback (haptics, sfx, XP-change
 * notification) — mirroring useDailyMissions/useChallenges conventions.
 */
export function useTrainingSessions() {
  const today = useAsync(() => listSessionsToday(), []);
  const weekly = useAsync(() => getWeeklyTrainingMinutes(), []);
  const recent = useAsync(() => listRecentSessions(14), []);
  const [completing, setCompleting] = useState<TrainingKind | null>(null);

  const complete = useCallback(
    async (kind: TrainingKind, opts: { title?: string; durationSec?: number; payload?: Record<string, unknown> } = {}) => {
      setCompleting(kind);
      try {
        const session: TrainingSession = await completeTrainingSession({
          kind,
          title: opts.title ?? null,
          durationSec: opts.durationSec ?? 0,
          payload: opts.payload ?? null,
        });
        if (session.xpAwarded > 0) {
          haptic('levelUp');
          sfx.play('xp');
          notifyXpChanged();
        }
        today.reload();
        weekly.reload();
        recent.reload();
        return session;
      } finally {
        setCompleting(null);
      }
    },
    [today, weekly, recent]
  );

  const summary: TrainingSummary = summarizeSessions((today.data ?? []) as TrainingSession[]);

  return {
    sessionsToday: (today.data ?? []) as TrainingSession[],
    weeklyMinutes: (weekly.data ?? []) as { day: string; minutes: number }[],
    recentSessions: (recent.data ?? []) as TrainingSession[],
    summary,
    complete,
    completing,
    reload: () => {
      today.reload();
      weekly.reload();
      recent.reload();
    },
  };
}
