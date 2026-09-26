import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  AchievementCard,
  AttributeCard,
  CalendarHistory,
  Card,
  ProgressChart,
  Screen,
  ThemedText,
  XPBar,
  type DayMark,
} from '@/design-system/components';
import { spacing } from '@/design-system/tokens';
import { useAchievements } from '@/features/progression/hooks/useAchievements';
import { useProgression } from '@/features/progression/ProgressionProvider';
import { useAttributes } from '@/features/progression/hooks/useAttributes';
import { useTrainingSessions } from '@/features/training/hooks/useTrainingSessions';
import { getStatsOverview, type StatsOverview } from '@/data/repositories';
import { useAsync } from '@/hooks/useAsync';

/**
 * PROGRESS — answers "how am I progressing?" Attributes first, then the
 * level/XP/streak summary, weekly training chart, activity history and
 * achievements. First screenful = the five attribute bars.
 */
export default function ProgressScreen() {
  const { totals, levelState, snapshot } = useProgression();
  const attributes = useAttributes();
  const { achievements } = useAchievements();
  const { data: statsData } = useAsync(() => getStatsOverview(), []);
  const training = useTrainingSessions();
  const overview = statsData as StatsOverview | null;
  // Streak/training-day values from the SINGLE SOURCE OF TRUTH.
  const streak = snapshot?.streak ?? null;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const calendarDays = useMemo(() => {
    const map: Record<string, DayMark[]> = {};
    for (const d of overview?.last14 ?? []) {
      if (d.completions > 0) map[d.day] = [...(map[d.day] ?? []), 'active'];
    }
    return map;
  }, [overview]);

  const weeklyPoints = training.weeklyMinutes.map((d) => ({
    label: d.day.slice(8, 10),
    value: d.minutes,
  }));

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText variant="display" color="textBright">
          Progress
        </ThemedText>

        {/* Attributes first — the RPG stat sheet */}
        <View style={styles.attrList}>
          {attributes
            ? (['power', 'focus', 'discipline', 'mind', 'energy'] as const).map((key) => (
                <AttributeCard key={key} view={attributes[key]} />
              ))
            : null}
        </View>

        {/* Level / XP / streak summary */}
        <Card>
          <View style={styles.rowBetween}>
            <ThemedText variant="subheading" color="textBright">
              Level {levelState?.level ?? '—'}
            </ThemedText>
            <ThemedText variant="mono" color="gold">
              {totals ? totals.totalXp.toLocaleString() : '—'} total XP
            </ThemedText>
          </View>
          <XPBar
            value={levelState?.progress ?? 0}
            current={levelState?.xpIntoLevel}
            target={levelState?.xpForNext}
          />
          <ThemedText variant="caption" color="textDim">
            🔥 {streak?.current ?? 0}-day training streak · {snapshot?.trainingDaysLast14 ?? overview?.activeDaysLast14 ?? 0}/14 days active · {snapshot?.trainingDays ?? overview?.activeDays ?? 0} all-time
          </ThemedText>
        </Card>

        {/* Weekly training minutes */}
        <Card>
          <ThemedText variant="subheading" color="textBright">
            Training minutes · last 7 days
          </ThemedText>
          <ProgressChart points={weeklyPoints} unitSuffix=" min" />
        </Card>

        {/* Quest completion history + calendar */}
        <Card>
          <ThemedText variant="subheading" color="textBright">
            Activity
          </ThemedText>
          <ProgressChart
            points={(overview?.last14 ?? []).slice(-7).map((d) => ({
              label: d.day.slice(8, 10),
              value: d.completions,
            }))}
            color="#4ADE80"
          />
          <CalendarHistory days={calendarDays} />
        </Card>

        {/* Achievements */}
        <View style={styles.sectionHeader}>
          <ThemedText variant="heading" color="textBright">
            Achievements
          </ThemedText>
          <ThemedText variant="caption" color="textDim">
            {unlockedCount}/{achievements.length}
          </ThemedText>
        </View>
        {achievements.map((a) => (
          <AchievementCard
            key={a.def.id}
            def={a.def}
            unlocked={a.unlocked}
            unlockedAt={a.unlockedAt}
            progress={a.progress}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  attrList: {
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
});
