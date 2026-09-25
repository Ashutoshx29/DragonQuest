import { useCallback } from 'react';

import {
  addItemToRoutine,
  createRoutine,
  deleteRoutine,
  getRoutineWithItems,
  listRoutines,
  removeItemFromRoutine,
  updateRoutine,
  type RoutineWithItems,
} from '@/data/repositories';import { useAsync } from '@/hooks/useAsync';
import { haptic } from '@/services/haptics';

export function useRoutines(includeArchived = false) {
  const { data, loading, error, reload } = useAsync(
    () => listRoutines(includeArchived),
    [includeArchived]
  );

  const save = useCallback(
    async (input: Parameters<typeof createRoutine>[0]) => {
      const routine = await createRoutine(input);
      haptic('success');
      reload();
      return routine;
    },
    [reload]
  );

  const edit = useCallback(
    async (id: string, patch: Parameters<typeof updateRoutine>[1]) => {
      await updateRoutine(id, patch);
      reload();
    },
    [reload]
  );

  const remove = useCallback(
    async (id: string) => {
      haptic('warning');
      await deleteRoutine(id);
      reload();
    },
    [reload]
  );

  return { routines: data ?? [], loading, error, reload, save, edit, remove };
}

export function useRoutineDetail(id: string | null) {
  const { data, loading, error, reload } = useAsync(
    () => (id ? getRoutineWithItems(id) : Promise.resolve(null)),
    [id]
  );

  const addItem = useCallback(
    async (ref: { habitId?: string; taskId?: string }) => {
      if (!id) return;
      await addItemToRoutine(id, ref);
      haptic('tap');
      reload();
    },
    [id, reload]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      await removeItemFromRoutine(itemId);
      haptic('tap');
      reload();
    },
    [reload]
  );

  const remove = useCallback(
    async (routineId: string) => {
      haptic('warning');
      await deleteRoutine(routineId);
      reload();
    },
    [reload]
  );

  const edit = useCallback(
    async (patch: Parameters<typeof updateRoutine>[1]) => {
      if (!id) return;
      await updateRoutine(id, patch);
      reload();
    },
    [id, reload]
  );

  return {
    routine: data as RoutineWithItems | null,
    loading,
    error,
    reload,
    addItem,
    removeItem,
    remove,
    edit,
  };
}
