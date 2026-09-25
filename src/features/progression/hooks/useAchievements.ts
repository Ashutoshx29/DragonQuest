import { getAchievementBoard, type AchievementView } from '@/data/repositories';
import { useAsync } from '@/hooks/useAsync';
import { onXpChanged } from '../xpEvents';
import { useEffect } from 'react';

export function useAchievements() {
  const { data, loading, error, reload } = useAsync(() => getAchievementBoard(), []);

  // Refresh the board when XP changes (unlocks/progress move).
  useEffect(() => onXpChanged(reload), [reload]);

  return {
    achievements: (data ?? []) as AchievementView[],
    loading,
    error,
    reload,
  };
}
