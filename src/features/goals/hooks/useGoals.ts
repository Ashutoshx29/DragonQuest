import { useCallback } from 'react';

import {
  addMilestone,
  completeGoal,
  createGoal,
  deleteGoal,
  listGoals,
  removeMilestone,
  toggleMilestone,
  updateGoal,
  type GoalRow,
} from '@/data/repositories';
import { useAsync } from '@/hooks/useAsync';
import { notifyXpChanged } from '@/features/progression/xpEvents';
import { haptic } from '@/services/haptics';

export function useGoals(status?: 'active' | 'done' | 'abandoned') {
  const { data, loading, error, reload } = useAsync(() => listGoals(status), [status]);

  const save = useCallback(
    async (input: Parameters<typeof createGoal>[0]) => {
      const goal = await createGoal(input);
      haptic('success');
      reload();
      return goal;
    },
    [reload]
  );

  const edit = useCallback(
    async (id: string, patch: Parameters<typeof updateGoal>[1]) => {
      await updateGoal(id, patch);
      reload();
    },
    [reload]
  );

  const remove = useCallback(
    async (id: string) => {
      haptic('warning');
      await deleteGoal(id);
      reload();
    },
    [reload]
  );

  const complete = useCallback(
    async (id: string) => {
      const result = await completeGoal(id);
      if (result.xpAwarded > 0) {
        haptic('levelUp');
        notifyXpChanged();
      }
      reload();
      return result;
    },
    [reload]
  );

  return { goals: (data ?? []) as GoalRow[], loading, error, reload, save, edit, remove, complete };
}

export function useGoalMilestones() {
  const add = useCallback(async (goalId: string, title: string) => {
    await addMilestone(goalId, title);
    haptic('tap');
  }, []);

  const toggle = useCallback(async (milestoneId: string) => {
    await toggleMilestone(milestoneId);
    haptic('success');
  }, []);

  const remove = useCallback(async (milestoneId: string) => {
    await removeMilestone(milestoneId);
    haptic('tap');
  }, []);

  return { add, toggle, remove };
}
