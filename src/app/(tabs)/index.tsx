import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, ProgressBar, Screen, ThemedText } from '@/design-system/components';
import { palette, spacing } from '@/design-system/tokens';
import { useDailyMissions } from '@/features/progression/hooks/useDailyMissions';
import { MissionCard } from '@/features/progression/components/MissionCard';
import { useProgression } from '@/features/progression/ProgressionProvider';
import { getGlobalStreak, type GlobalStreak } from '@/data/repositories';
import { useAsync } from '@/hooks/useAsync';

export default function TodayScreen() {
  const { totals, levelState, title } = useProgression();
  const missions = useDailyMissions();
  const { data: streakData } = useAsync(() => getGlobalStreak(), []);
  const streak = streakData as GlobalStreak | null;

  return (
    <Screen padded>
      <View style={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText variant="display" color="textBright">
              Today
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              {title ? `Rank · ${title}` : 'Begin your training arc'}
            </ThemedText>
          </View>
          <Badge label={levelState ? `LV ${levelState.level}` : 'LV —'} variant="accent" />
        </View>

        {/* XP card */}
        <Card accent={palette.aura}>
          <View style={styles.rowBetween}>
            <ThemedText variant="subheading" color="textBright">
              Experience
            </ThemedText>
            <ThemedText variant="mono" color="accent">
              {totals ? `${totals.totalXp.toLocaleString()} XP` : '…'}
            </ThemedText>
          </View>
          {levelState ? (
            <>
              <ProgressBar value={levelState.progress} />
              <ThemedText variant="caption" color="textFaint">
                {levelState.xpIntoLevel} / {levelState.xpForNext} to level {levelState.level + 1}
                {totals && totals.todayXp > 0 ? ` · +${totals.todayXp} today` : ''}
              </ThemedText>
            </>
          ) : null}
        </Card>

        {/* Global streak */}
        <Card compact>
          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <Ionicons name="flame" size={18} color="#FF8C42" />
              <ThemedText variant="subheading" color="textBright">
                {streak ? `${streak.current} day streak` : 'Streak'}
              </ThemedText>
            </View>
            {streak && streak.atRisk ? <Badge label="AT RISK" variant="danger" /> : null}
            {streak && streak.doneToday ? <Badge label="SECURED" variant="success" /> : null}
          </View>
          <View style={styles.stripRow}>
            {(streak?.last14 ?? []).map((d) => (
              <View
                key={d.day}
                style={[styles.stripCell, { backgroundColor: d.hit ? '#FF8C42' : '#1A1E29' }]}
              />
            ))}
          </View>
        </Card>

        {/* Daily missions */}
        <View style={styles.sectionHeader}>
          <ThemedText variant="heading" color="textBright">
            Daily missions
          </ThemedText>
          {missions.board?.allDone ? <Badge label="ALL CLEAR" variant="gold" /> : null}
        </View>
        {missions.board?.missions.map((m) => (
          <MissionCard
            key={m.kind}
            mission={m}
            claimed={missions.board?.claimedKinds.includes(m.kind) ?? false}
            claiming={missions.claiming === m.kind}
            onClaim={(kind) => void missions.claim(kind)}
          />
        ))}

        {missions.board?.allDone && !missions.board.bonusClaimed ? (
          <Button
            label={`Claim bonus chest · +${75} XP`}
            icon="gift"
            onPress={() => void missions.claimBonus()}
            loading={missions.claiming === 'all_bonus'}
          />
        ) : null}
        {missions.board?.bonusClaimed ? (
          <ThemedText variant="caption" color="success" style={styles.bonusDone}>
            Bonus chest secured. See you tomorrow, warrior.
          </ThemedText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stripRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stripCell: {
    flex: 1,
    height: 10,
    borderRadius: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  bonusDone: {
    textAlign: 'center',
  },
});
