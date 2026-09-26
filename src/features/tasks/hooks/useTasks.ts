import { useCallback } from 'react';

import {
  createTask,
  deleteTask,
  listTasks,
  toggleTask,
  updateTask,
  type TaskRow,
} from '@/data/repositories';
import { useAsync } from '@/hooks/useAsync';
import { notifyXpChanged, notifyBoardChanged } from '@/features/progression/xpEvents';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';

export function useTasks(openOnly = false) {
  const { data, loading, error, reload } = useAsync(() => listTasks({ openOnly }), [openOnly]);

  const save = useCallback(
    async (input: Parameters<typeof createTask>[0]) => {
      const task = await createTask(input);
      haptic('success');
      reload();
      return task;
    },
    [reload]
  );

  const edit = useCallback(
    async (id: string, patch: Parameters<typeof updateTask>[1]) => {
      await updateTask(id, patch);
      reload();
    },
    [reload]
  );

  const toggle = useCallback(
    async (id: string) => {
      const result = await toggleTask(id);
      haptic(result.completed ? 'success' : 'tap');
      if (result.completed) sfx.play('complete');
      notifyXpChanged();
      notifyBoardChanged();
      reload();
      return result;
    },
    [reload]
  );

  const remove = useCallback(
    async (id: string) => {
      haptic('warning');
      await deleteTask(id);
      reload();
    },
    [reload]
  );

  return { tasks: (data ?? []) as TaskRow[], loading, error, reload, save, edit, toggle, remove };
}
