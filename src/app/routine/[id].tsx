import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  EmptyState,
  IconButton,
  Input,
  Screen,
  Sheet,
  ThemedText,
} from '@/design-system/components';
import { createTask } from '@/data/repositories';
import { radius, spacing } from '@/design-system/tokens';
import { useHabits } from '@/features/habits/hooks/useHabits';
import { RoutineFormFields } from '@/features/routines/components/RoutineForm';
import { useRoutineDetail } from '@/features/routines/hooks/useRoutines';
import { haptic } from '@/services/haptics';

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const detail = useRoutineDetail(id ?? null);
  const habitsState = useHabits(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const routine = detail.routine;

  useEffect(() => {
    if (!detail.loading && id && !routine) {
      router.back();
    }
  }, [detail.loading, id, routine, router]);

  if (detail.loading) {
    return (
      <Screen padded>
        <ThemedText color="textDim">Loading…</ThemedText>
      </Screen>
    );
  }

  if (!routine) return null;

  const createTaskAndAttach = async () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    const task = await createTask({ title });
    await detail.addItem({ taskId: task.id });
    setNewTaskTitle('');
    setPickerOpen(false);
    haptic('success');
  };

  return (
    <Screen padded>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <RoutineFormFields
          initial={routine}
          submitLabel="Save changes"
          onSubmit={async (input) => {
            await detail.edit(input);
            haptic('success');
          }}
          onArchive={async () => {
            await detail.edit({ archived: true });
            haptic('warning');
            router.back();
          }}
          onDelete={async () => {
            await detail.remove(routine.id);
            router.back();
          }}
        />

        {/* Steps editor */}
        <View style={styles.stepsHeader}>
          <ThemedText variant="heading" color="textBright">
            Steps
          </ThemedText>
          <IconButton icon="add" label="Add step" onPress={() => setPickerOpen(true)} />
        </View>

        {routine.items.length === 0 ? (
          <EmptyState
            icon="list"
            title="No steps yet"
            message="Add habits or tasks as steps — they complete here and on your quest board."
          />
        ) : (
          routine.items.map((item, index) => (
            <View key={item.id} style={styles.stepRow}>
              <View style={styles.stepIndex}>
                <ThemedText variant="mono" color="accent">
                  {index + 1}
                </ThemedText>
              </View>
              <ThemedText variant="subheading" color="textBright" style={styles.stepName}>
                {item.refName}
              </ThemedText>
              <IconButton
                icon="close"
                label={`Remove ${item.refName}`}
                color="textDim"
                onPress={() => void detail.removeItem(item.id)}
              />
            </View>
          ))
        )}
      </ScrollView>

      <Sheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Add a step">
        <ThemedText variant="label" color="textDim">
          From your habits
        </ThemedText>
        {habitsState.habits.length === 0 ? (
          <ThemedText variant="body" color="textDim">
            No habits yet — create habits on the Quests tab first.
          </ThemedText>
        ) : (
          habitsState.habits.map((h) => (
            <Button
              key={h.id}
              label={h.name}
              icon="flash"
              variant="secondary"
              onPress={() => {
                void detail.addItem({ habitId: h.id });
                setPickerOpen(false);
              }}
            />
          ))
        )}

        <ThemedText variant="label" color="textDim">
          Or create a quick one-off task
        </ThemedText>
        <View style={styles.quickRow}>
          <Input
            label=""
            placeholder="e.g. Review plan for the day"
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            onSubmitEditing={() => void createTaskAndAttach()}
            returnKeyType="done"
            containerStyle={styles.quickInput}
          />
          <Button label="Add" icon="add" onPress={() => void createTaskAndAttach()} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  stepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#2C3242',
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: '#2C3242',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepName: {
    flex: 1,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  quickInput: {
    flex: 1,
  },
});
