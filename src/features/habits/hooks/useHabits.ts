import { useCallback, useState } from 'react';

import {
  createHabit,
  deleteHabit,
  listHabits,
  toggleHabitToday,
  updateHabit,
  type HabitWithProgress,
  type ToggleResult,
} from '@/data/repositories';
import { useAsync } from '@/hooks/useAsync';
import { notifyXpChanged, notifyBoardChanged } from '@/features/progression/xpEvents';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';

export function useHabits(includeArchived = false) {
  const { data, loading, error, reload } = useAsync(
    () => listHabits(includeArchived),
    [includeArchived]
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggle = useCallback(
    async (id: string): Promise<ToggleResult | null> => {
      setBusyId(id);
      try {
        const result = await toggleHabitToday(id);
        if (result.completed) {
          haptic('success');
          sfx.play('complete');
        } else {
          haptic('tap');
        }
        notifyXpChanged();
        notifyBoardChanged();
        reload();
        return result;
      } finally {
        setBusyId(null);
      }
    },
    [reload]
  );

  const save = useCallback(
    async (input: Parameters<typeof createHabit>[0]) => {
      const habit = await createHabit(input);
      haptic('success');
      reload();
      return habit;
    },
    [reload]
  );

  const edit = useCallback(
    async (id: string, patch: Parameters<typeof updateHabit>[1]) => {
      await updateHabit(id, patch);
      reload();
    },
    [reload]
  );

  const remove = useCallback(
    async (id: string) => {
      haptic('warning');
      await deleteHabit(id);
      reload();
    },
    [reload]
  );

  return {
    habits: data ?? ([] as HabitWithProgress[]),
    loading,
    error,
    reload,
    busyId,
    toggle,
    save,
    edit,
    remove,
  };
}
