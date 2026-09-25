import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Screen,
  SegmentedControl,
  ThemedText,
} from '@/design-system/components';
import { spacing } from '@/design-system/tokens';
import { useHabits } from '@/features/habits/hooks/useHabits';
import { HabitCard } from '@/features/habits/components/HabitCard';
import { useRoutines } from '@/features/routines/hooks/useRoutines';
import { RoutineCard } from '@/features/routines/components/RoutineCard';
import { useTasks } from '@/features/tasks/hooks/useTasks';
import { TaskCard } from '@/features/tasks/components/TaskCard';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { getRoutineWithItems } from '@/data/repositories';

type BoardTab = 'habits' | 'routines' | 'tasks' | 'goals';

export default function QuestsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<BoardTab>('habits');

  const habitsState = useHabits();
  const routinesState = useRoutines();
  const tasksState = useTasks();
  const goalsState = useGoals();

  // Item counts for routine cards (cheap per-routine lookups).
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const routines = routinesState.routines;
  useEffect(() => {
    let alive = true;
    void (async () => {
      const entries = await Promise.all(
        routines.map(async (r) => {
          const detail = await getRoutineWithItems(r.id);
          return [r.id, detail?.items.length ?? 0] as const;
        })
      );
      if (alive) setItemCounts(Object.fromEntries(entries));
    })();
    return () => {
      alive = false;
    };
  }, [routines]);

  // Inline "quick add" state
  const [quickName, setQuickName] = useState('');
  const [quickBusy, setQuickBusy] = useState(false);

  const quickAdd = async () => {
    const name = quickName.trim();
    if (!name) return;
    setQuickBusy(true);
    try {
      if (tab === 'habits') await habitsState.save({ name });
      else if (tab === 'routines') await routinesState.save({ name });
      else if (tab === 'goals') {
        await goalsState.save({ title: name });
        setQuickName('');
        return;
      } else await tasksState.save({ title: name });
      setQuickName('');
    } finally {
      setQuickBusy(false);
    }
  };

  const openHabit = (id: string) => router.push(`/habit/${id}`);
  const openRoutine = (id: string) => router.push(`/routine/${id}`);
  const openTask = (id: string) => router.push(`/task/${id}`);
  const openGoal = (id: string) => router.push(`/goal/${id}`);

  const data =
    tab === 'habits'
      ? habitsState.habits.map((h) => ({ key: h.id, node: <HabitCard habit={h} onToggle={(id) => void habitsState.toggle(id)} onOpen={openHabit} /> }))
      : tab === 'routines'
        ? routines.map((r) => ({ key: r.id, node: <RoutineCard routine={r} itemCount={itemCounts[r.id] ?? 0} onPress={openRoutine} /> }))
        : tab === 'goals'
          ? goalsState.goals.filter((g) => g.status === 'active').map((g) => ({
              key: g.id,
              node: (
                <Card key={g.id} compact onPress={() => openGoal(g.id)} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ionicons name="flag" size={20} color="#FFC94D" />
                    <View style={{ flex: 1, gap: 2 }}>
                      <ThemedText variant="subheading" color="textBright">{g.title}</ThemedText>
                      <ThemedText variant="caption" color="textDim">Goal · +{g.xpReward} XP</ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#5A6172" />
                  </View>
                </Card>
              ),
            }))
          : tasksState.tasks.map((t) => ({ key: t.id, node: <TaskCard task={t} onToggle={(id) => void tasksState.toggle(id)} onOpen={openTask} /> }));

  const emptyCopy: Record<BoardTab, { icon: any; title: string; message: string }> = {
    habits: {
      icon: 'flash',
      title: 'No quests yet',
      message: 'Habits are your daily training. Create your first one below.',
    },
    routines: {
      icon: 'layers',
      title: 'No routines yet',
      message: 'Routines chain quests into morning or evening sequences.',
    },
    tasks: {
      icon: 'checkbox',
      title: 'No tasks yet',
      message: 'One-off objectives. Add your first below.',
    },
    goals: {
      icon: 'flag',
      title: 'No goals yet',
      message: 'Long-term objectives with milestones. Add your first below.',
    },
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <ThemedText variant="display" color="textBright">
          Quests
        </ThemedText>
        <Badge label={`${habitsState.habits.length} active`} variant="accent" />
      </View>

      <SegmentedControl
        options={[
          { label: 'Habits', value: 'habits' },
          { label: 'Routines', value: 'routines' },
          { label: 'Tasks', value: 'tasks' },
          { label: 'Goals', value: 'goals' },
        ]}
        value={tab}
        onChange={setTab}
        style={styles.tabs}
      />

      <FlatList
        data={data}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => item.node}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <EmptyState icon={emptyCopy[tab].icon} title={emptyCopy[tab].title} message={emptyCopy[tab].message} />
          </View>
        }
      />

      <View style={styles.quickAdd}>
        <Input
          label=""
          placeholder={tab === 'tasks' ? 'New task…' : tab === 'goals' ? 'New goal…' : `New ${tab === 'habits' ? 'habit' : 'routine'}…`}
          value={quickName}
          onChangeText={setQuickName}
          onSubmitEditing={() => void quickAdd()}
          returnKeyType="done"
          containerStyle={styles.quickInput}
        />
        <Button label="Add" icon="add" onPress={() => void quickAdd()} loading={quickBusy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  tabs: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  empty: {
    marginTop: spacing.xl,
  },
  quickAdd: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#2C3242',
  },
  quickInput: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: 96,
    borderRadius: 999,
  },
});
