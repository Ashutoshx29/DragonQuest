import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  Screen,
  ThemedText,
} from '@/design-system/components';
import {
  getGoalWithMilestones,
  toggleMilestone,
  removeMilestone,
  addMilestone,
  type GoalWithMilestones,
} from '@/data/repositories';
import { spacing } from '@/design-system/tokens';
import { useAsync } from '@/hooks/useAsync';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { haptic } from '@/services/haptics';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, reload } = useAsync(() => getGoalWithMilestones(id), [id]);
  const goal = data as GoalWithMilestones | null;
  const goalsState = useGoals();
  const [newMilestone, setNewMilestone] = useState('');

  useEffect(() => {
    if (id && data === null) {
      // useAsync sets data null while loading too, so only close when a load finished.
    }
  }, [id, data]);

  const add = useCallback(async () => {
    const title = newMilestone.trim();
    if (!title || !id) return;
    await addMilestone(id, title);
    setNewMilestone('');
    haptic('tap');
    reload();
  }, [newMilestone, id, reload]);

  if (!goal) {
    return (
      <Screen padded>
        <ThemedText color="textDim">Loading…</ThemedText>
      </Screen>
    );
  }

  const doneCount = goal.milestones.filter((m) => m.completedAt).length;

  return (
    <Screen padded>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText variant="title" color="textBright">
              {goal.title}
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              Goal · +{goal.xpReward} XP reward
            </ThemedText>
          </View>
          <Badge label={goal.status} variant={goal.status === 'done' ? 'success' : 'accent'} />
        </View>

        {goal.description ? (
          <ThemedText variant="body" color="textDim">
            {goal.description}
          </ThemedText>
        ) : null}

        {/* Milestones */}
        <View style={styles.sectionHeader}>
          <ThemedText variant="heading" color="textBright">
            Milestones
          </ThemedText>
          <ThemedText variant="caption" color="textDim">
            {doneCount}/{goal.milestones.length}
          </ThemedText>
        </View>

        {goal.milestones.length === 0 ? (
          <EmptyState
            icon="flag"
            title="No milestones yet"
            message="Break the goal into steps — each one is a checkpoint."
          />
        ) : (
          goal.milestones.map((m) => {
            const done = m.completedAt !== null;
            return (
              <Card key={m.id} compact>
                <View style={styles.milestoneRow}>
                  <IconButton
                    icon={done ? 'checkmark-circle' : 'ellipse-outline'}
                    color={done ? 'success' : 'textDim'}
                    label={done ? `Undo ${m.title}` : `Complete ${m.title}`}
                    onPress={() => {
                      void (async () => {
                        await toggleMilestone(m.id);
                        reload();
                      })();
                    }}
                  />
                  <ThemedText
                    variant="subheading"
                    color={done ? 'textDim' : 'textBright'}
                    style={styles.milestoneTitle}
                  >
                    {m.title}
                  </ThemedText>
                  <IconButton
                    icon="close"
                    color="textDim"
                    label={`Remove ${m.title}`}
                    onPress={() => {
                      void (async () => {
                        await removeMilestone(m.id);
                        reload();
                      })();
                    }}
                  />
                </View>
              </Card>
            );
          })
        )}

        {/* Add milestone */}
        <View style={styles.addRow}>
          <Input
            label=""
            placeholder="New milestone…"
            value={newMilestone}
            onChangeText={setNewMilestone}
            onSubmitEditing={() => void add()}
            returnKeyType="done"
            containerStyle={styles.addInput}
          />
          <Button label="Add" icon="add" onPress={() => void add()} />
        </View>

        {/* Goal actions */}
        {goal.status === 'active' ? (
          <View style={styles.actions}>
            <Button
              label="Complete goal"
              icon="trophy"
              onPress={() => {
                void (async () => {
                  await goalsState.complete(goal.id);
                  router.back();
                })();
              }}
            />
            <Button
              label="Abandon"
              variant="secondary"
              icon="close-circle"
              onPress={() => {
                void (async () => {
                  await goalsState.edit(goal.id, { status: 'abandoned' });
                  router.back();
                })();
              }}
            />
          </View>
        ) : null}
        <Button
          label="Delete goal"
          variant="danger"
          icon="trash"
          onPress={() => {
            Alert.alert('Delete goal?', 'Milestones are removed too. This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  void (async () => {
                    await goalsState.remove(goal.id);
                    router.back();
                  })();
                },
              },
            ]);
          }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  milestoneTitle: {
    flex: 1,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  addInput: {
    flex: 1,
  },
  actions: {
    gap: spacing.md,
  },
});
