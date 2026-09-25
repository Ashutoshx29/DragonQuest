import { useCallback, useMemo, useState } from 'react';

import {
  abandonChallenge,
  getChallengeBoard,
  rewardCompletedRun,
  startChallenge,
  type ChallengeView,
} from '@/data/repositories';
import { useAsync } from '@/hooks/useAsync';
import { notifyXpChanged } from '@/features/progression/xpEvents';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';

export function useChallenges() {
  const { data, loading, error, reload } = useAsync(() => getChallengeBoard(), []);
  const [busy, setBusy] = useState<string | null>(null);

  const board = useMemo(() => (data ?? []) as ChallengeView[], [data]);

  const start = useCallback(
    async (challengeId: string) => {
      setBusy(challengeId);
      try {
        const result = await startChallenge(challengeId);
        if (result.ok) {
          haptic('success');
          sfx.play('complete');
        }
        reload();
        return result;
      } finally {
        setBusy(null);
      }
    },
    [reload]
  );

  const abandon = useCallback(
    async (runId: string) => {
      setBusy(runId);
      try {
        await abandonChallenge(runId);
        haptic('warning');
        reload();
      } finally {
        setBusy(null);
      }
    },
    [reload]
  );

  /** Mark any finished runs as completed and reward them (idempotent). */
  const syncRewards = useCallback(async () => {
    let rewardedAny = false;
    for (const view of board) {
      // The engine resolves completed/failed for past windows; the repo
      // rewards only active runs whose window ended with enough hit days.
      if (view.status === 'active' && view.daysLeft === 0 && view.hitDays >= view.def.minHitDays) {
        const rewarded = await rewardCompletedRun(view.runId, view.def);
        if (rewarded) rewardedAny = true;
      }
    }
    if (rewardedAny) {
      haptic('levelUp');
      sfx.play('achievement');
      notifyXpChanged();
    }
    reload();
  }, [board, reload]);

  return { challenges: board, loading, error, reload, start, abandon, syncRewards, busy };
}
