import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
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
import { useDailyMissions } from '@/features/progression/hooks/useDailyMissions';
import { MissionCard } from '@/features/progression/components/MissionCard';

type BoardTab = 'habits' | 'routines' | 'tasks' | 'goals';

export default function MissionsBoardScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<BoardTab>('habits');

  // The SAME daily-objective source Home uses — one board, no duplication.
  const daily = useDailyMissions();
  const handleDailyClaim = async (kind: Parameters<typeof daily.claim>[0]) => {
    await daily.claim(kind);
    // Feedback (haptics/sfx/XP toast) is driven by the shared hook.
  };

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
      ? [
          // Daily objectives first — the same missions Home shows.
          ...(daily.board?.missions ?? []).map((m) => ({
            key: `daily-${m.kind}`,
            node: (
              <MissionCard
                key={m.kind}
                mission={m}
                claimed={daily.board?.claimedKinds.includes(m.kind) ?? false}
                claiming={daily.claiming === m.kind}
                onClaim={(kind) => void handleDailyClaim(kind)}
              />
            ),
          })),
          ...habitsState.habits.map((h) => ({ key: h.id, node: <HabitCard habit={h} onToggle={(id) => void habitsState.toggle(id)} onOpen={openHabit} /> })),
        ]
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
      title: 'No missions yet',
      message: 'Missions are your daily training. Create your first one below.',
    },
    routines: {
      icon: 'layers',
      title: 'No rituals yet',
      message: 'Rituals chain missions into morning or evening sequences.',
    },
    tasks: {
      icon: 'checkbox',
      title: 'No objectives yet',
      message: 'One-off objectives. Add your first below.',
    },
    goals: {
      icon: 'flag',
      title: 'No grand quests yet',
      message: 'Long-term objectives with milestones. Add your first below.',
    },
  };

  return (
    <Screen edges={['top']}>
      {/* Pushed screen: an always-visible exit is mandatory (HIG) — the header
          row IS the back affordance, mirroring the detail screens. */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-back"
          label="Back"
          color="text"
          onPress={() => router.back()}
        />
        <ThemedText variant="subheading" color="textBright" style={styles.headerTitle}>
          Mission Board
        </ThemedText>
        <Badge label={`${habitsState.habits.length} active`} variant="accent" />
      </View>

      <SegmentedControl
        options={[
          { label: 'Missions', value: 'habits' },
          { label: 'Rituals', value: 'routines' },
          { label: 'Objectives', value: 'tasks' },
          { label: 'Grand Quests', value: 'goals' },
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
          placeholder={tab === 'tasks' ? 'New objective…' : tab === 'goals' ? 'New grand quest…' : `New ${tab === 'habits' ? 'mission' : 'ritual'}…`}
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
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    flex: 1,
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
