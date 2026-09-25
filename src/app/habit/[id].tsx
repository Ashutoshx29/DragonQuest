import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { Screen, ThemedText } from '@/design-system/components';
import { HabitForm } from '@/features/habits/components/HabitForm';
import { useHabits } from '@/features/habits/hooks/useHabits';
import { haptic } from '@/services/haptics';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { habits, loading, edit, remove } = useHabits(true);
  const habit = habits.find((h) => h.id === id) ?? null;

  // Auto-close if the habit disappears (deleted/archived).
  useEffect(() => {
    if (!loading && id && !habit) {
      router.back();
    }
  }, [loading, id, habit, router]);

  if (loading) {
    return (
      <Screen padded>
        <ThemedText color="textDim">Loading…</ThemedText>
      </Screen>
    );
  }

  if (!habit) return null;

  return (
    <HabitForm
      initial={habit}
      submitLabel="Save changes"
      onSubmit={async (input) => {
        await edit(habit.id, input);
        haptic('success');
        router.back();
      }}
      onArchive={async () => {
        await edit(habit.id, { archived: true });
        haptic('warning');
        router.back();
      }}
      onDelete={async () => {
        await remove(habit.id);
        router.back();
      }}
    />
  );
}
