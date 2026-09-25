import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Card, ProgressBar, Screen, ThemedText } from '@/design-system/components';
import { spacing } from '@/design-system/tokens';
import { useProgression } from '@/features/progression/ProgressionProvider';
import { useAchievements } from '@/features/progression/hooks/useAchievements';
import { getAchievementStats } from '@/data/repositories';
import { useAsync } from '@/hooks/useAsync';

export default function ProfileScreen() {
  const router = useRouter();
  const { totals, levelState, title } = useProgression();
  const { achievements } = useAchievements();
  const { data: stats } = useAsync(() => getAchievementStats(), []);
  const s = stats as Awaited<ReturnType<typeof getAchievementStats>> | null;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Screen padded>
      <View style={styles.content}>
        {/* Character plate */}
        <Card accent="#00E5FF" glow>
          <View style={styles.center}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#00E5FF" />
            </View>
            <ThemedText variant="title" color="textBright">
              Trainee
            </ThemedText>
            <ThemedText variant="label" color="gold">
              {title ? `The ${title}` : 'Unranked'}
            </ThemedText>
          </View>

          {levelState ? (
            <View style={styles.levelBlock}>
              <View style={styles.rowBetween}>
                <ThemedText variant="label" color="textDim">
                  Level {levelState.level}
                </ThemedText>
                <ThemedText variant="caption" color="textFaint">
                  {levelState.xpIntoLevel}/{levelState.xpForNext}
                </ThemedText>
              </View>
              <ProgressBar value={levelState.progress} />
            </View>
          ) : null}
        </Card>

        {/* Stats grid */}
        <View style={styles.grid}>
          <Card compact style={styles.cell}>
            <ThemedText variant="heading" color="accent">
              {s ? s.completionsTotal : '—'}
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              Quests done
            </ThemedText>
          </Card>
          <Card compact style={styles.cell}>
            <ThemedText variant="heading" color="power">
              {s ? s.habitStreakBest : '—'}
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              Best streak
            </ThemedText>
          </Card>
          <Card compact style={styles.cell}>
            <ThemedText variant="heading" color="gold">
              {totals ? totals.totalXp.toLocaleString() : '—'}
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              Total XP
            </ThemedText>
          </Card>
          <Card compact style={styles.cell}>
            <ThemedText variant="heading" color="success">
              {unlockedCount}/{achievements.length}
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              Achievements
            </ThemedText>
          </Card>
        </View>

        {/* Records */}
        <Card>
          <ThemedText variant="subheading" color="textBright">
            Records
          </ThemedText>
          <View style={styles.recordRow}>
            <ThemedText variant="body" color="textDim">
              Early quests (before 8am)
            </ThemedText>
            <ThemedText variant="mono" color="textBright">
              {s ? s.earlyCompletions : '—'}
            </ThemedText>
          </View>
          <View style={styles.recordRow}>
            <ThemedText variant="body" color="textDim">
              Habits created
            </ThemedText>
            <ThemedText variant="mono" color="textBright">
              {s ? s.habitsCreated : '—'}
            </ThemedText>
          </View>
        </Card>

        <Button
          label="Settings"
          icon="settings-outline"
          variant="secondary"
          onPress={() => router.push('/settings')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  center: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: '#00E5FF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  levelBlock: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cell: {
    width: '47.5%',
    alignItems: 'center',
    gap: 4,
    marginBottom: 0,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
});
