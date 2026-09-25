import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, ProgressBar, Screen, ThemedText } from '@/design-system/components';
import { spacing } from '@/design-system/tokens';
import { useAchievements } from '@/features/progression/hooks/useAchievements';
import { useProgression } from '@/features/progression/ProgressionProvider';
import { getStatsOverview, type StatsOverview } from '@/data/repositories';
import { TIER_META } from '@/game/config/achievements';
import { useAsync } from '@/hooks/useAsync';

export default function ProgressScreen() {
  const { totals, levelState, title } = useProgression();
  const { achievements } = useAchievements();
  const { data: stats } = useAsync(() => getStatsOverview(), []);
  const overview = stats as StatsOverview | null;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="display" color="textBright">
            Progress
          </ThemedText>
          <ThemedText variant="caption" color="textDim">
            {title ? `Rank · ${title}` : 'Your journey begins'}
          </ThemedText>
        </View>

        {/* Stat tiles */}
        <View style={styles.tileRow}>
          <Card compact style={styles.tile}>
            <ThemedText variant="display" color="accent">
              {levelState ? levelState.level : '—'}
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              Level
            </ThemedText>
          </Card>
          <Card compact style={styles.tile}>
            <ThemedText variant="display" color="gold">
              {totals ? totals.totalXp.toLocaleString() : '—'}
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              Total XP
            </ThemedText>
          </Card>
        </View>
        <View style={styles.tileRow}>
          <Card compact style={styles.tile}>
            <ThemedText variant="display" color="power">
              {overview ? overview.totalCompletions : '—'}
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              Quests done
            </ThemedText>
          </Card>
          <Card compact style={styles.tile}>
            <ThemedText variant="display" color="success">
              {overview ? overview.activeDays : '—'}
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              Active days
            </ThemedText>
          </Card>
        </View>

        {/* 14-day activity */}
        <Card>
          <ThemedText variant="subheading" color="textBright">
            Last 14 days
          </ThemedText>
          <View style={styles.stripRow}>
            {(overview?.last14 ?? []).map((d) => {
              const intensity = Math.min(1, d.completions / 5);
              return (
                <View
                  key={d.day}
                  style={[
                    styles.stripCell,
                    {
                      backgroundColor:
                        d.completions > 0 ? `rgba(0, 229, 255, ${0.25 + intensity * 0.75})` : '#1A1E29',
                    },
                  ]}
                />
              );
            })}
          </View>
          <ThemedText variant="caption" color="textFaint">
            {overview ? `${overview.activeDaysLast14} of 14 days active` : '…'}
          </ThemedText>
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
        {achievements.map((a) => {
          const tier = TIER_META[a.def.tier];
          return (
            <Card key={a.def.id} compact accent={a.unlocked ? tier.color : undefined} style={styles.achCard}>
              <View style={styles.achRow}>
                <View
                  style={[
                    styles.achIcon,
                    { borderColor: a.unlocked ? tier.color : '#2C3242' },
                  ]}
                >
                  <Ionicons
                    name={a.def.icon as never}
                    size={22}
                    color={a.unlocked ? tier.color : '#5A6172'}
                  />
                </View>
                <View style={styles.achBody}>
                  <View style={styles.achTitleRow}>
                    <ThemedText
                      variant="subheading"
                      color={a.unlocked ? 'textBright' : 'textDim'}
                      numberOfLines={1}
                    >
                      {a.def.title}
                    </ThemedText>
                    <ThemedText variant="caption" style={{ color: tier.color }}>
                      {tier.label}
                    </ThemedText>
                  </View>
                  <ThemedText variant="caption" color="textDim" numberOfLines={1}>
                    {a.def.description}
                  </ThemedText>
                  {!a.unlocked ? (
                    <ProgressBar value={a.progress} height={4} />
                  ) : (
                    <ThemedText variant="caption" color="success">
                      Unlocked{a.unlockedAt ? ` · ${a.unlockedAt.slice(0, 10)}` : ''}
                    </ThemedText>
                  )}
                </View>
              </View>
            </Card>
          );
        })}
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
  header: {
    gap: 2,
    marginBottom: spacing.sm,
  },
  tileRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  stripRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  stripCell: {
    flex: 1,
    height: 14,
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  achCard: {
    marginBottom: 0,
  },
  achRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  achIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achBody: {
    flex: 1,
    gap: 4,
  },
  achTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
