import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { Screen, ThemedText } from '@/design-system/components';
import { TaskForm } from '@/features/tasks/components/TaskForm';
import { useTasks } from '@/features/tasks/hooks/useTasks';
import { haptic } from '@/services/haptics';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tasks, loading, edit, remove } = useTasks();
  const task = tasks.find((t) => t.id === id) ?? null;

  useEffect(() => {
    if (!loading && id && !task) {
      router.back();
    }
  }, [loading, id, task, router]);

  if (loading) {
    return (
      <Screen padded>
        <ThemedText color="textDim">Loading…</ThemedText>
      </Screen>
    );
  }

  if (!task) return null;

  return (
    <TaskForm
      initial={task}
      submitLabel="Save changes"
      onSubmit={async (input) => {
        await edit(task.id, input);
        haptic('success');
        router.back();
      }}
      onDelete={async () => {
        await remove(task.id);
        router.back();
      }}
    />
  );
}
