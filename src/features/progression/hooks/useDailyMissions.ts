import { useCallback, useState } from 'react';

import { claimAllMissionsBonus, claimMission, getMissionBoard, type MissionBoard } from '@/data/repositories';
import { useAsync } from '@/hooks/useAsync';
import { notifyXpChanged } from '@/features/progression/xpEvents';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';

export function useDailyMissions() {
  const { data, loading, error, reload } = useAsync(() => getMissionBoard(), []);
  const [claiming, setClaiming] = useState<string | null>(null);

  const board = data as MissionBoard | null;

  const claim = useCallback(
    async (kind: Parameters<typeof claimMission>[0]) => {
      setClaiming(kind);
      try {
        const result = await claimMission(kind);
        if (result.xpAwarded > 0) {
          haptic('success');
          sfx.play('xp');
          notifyXpChanged();
        }
        reload();
        return result;
      } finally {
        setClaiming(null);
      }
    },
    [reload]
  );

  const claimBonus = useCallback(async () => {
    setClaiming('all_bonus');
    try {
      const result = await claimAllMissionsBonus();
      if (result.xpAwarded > 0) {
        haptic('levelUp');
        sfx.play('achievement');
        notifyXpChanged();
      }
      reload();
      return result;
    } finally {
      setClaiming(null);
    }
  }, [reload]);

  return { board, loading, error, reload, claim, claimBonus, claiming };
}
