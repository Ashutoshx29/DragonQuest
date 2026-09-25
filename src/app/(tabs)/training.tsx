import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, EmptyState, Screen, ThemedText } from '@/design-system/components';
import { spacing } from '@/design-system/tokens';
import { QUOTES } from '@/data/content/quotes';
import { CHALLENGES } from '@/game/config/challenges';
import { useChallenges } from '@/features/progression/hooks/useChallenges';
import { todayString } from '@/lib/dates';
/** Deterministic quote of the day (same quote all day, rotates daily). */
function quoteOfTheDay(day: string) {
  let h = 0;
  for (let i = 0; i < day.length; i++) {
    h = (h * 31 + day.charCodeAt(i)) >>> 0;
  }
  return QUOTES[h % QUOTES.length];
}

export default function TrainingScreen() {
  const { challenges, start, abandon, syncRewards, busy } = useChallenges();
  const quote = quoteOfTheDay(todayString());

  const activeByChallenge = new Map<string, ChallengeViewLike>();
  for (const c of challenges) {
    if (c.status === 'active') activeByChallenge.set(c.def.id, c);
  }

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText variant="display" color="textBright">
          Training
        </ThemedText>

        {/* Quote of the day */}
        <Card accent="#FFC94D">
          <ThemedText variant="subheading" color="gold">
            “{quote.text}”
          </ThemedText>
          <ThemedText variant="caption" color="textDim">
            — {quote.author}
          </ThemedText>
        </Card>

        {/* Active runs */}
        {challenges.filter((c) => c.status === 'active').map((run) => (
          <Card key={run.runId} accent={run.def.accent} glow>
            <View style={styles.rowBetween}>
              <View style={styles.row}>
                <Ionicons name={run.def.icon as never} size={22} color={run.def.accent} />
                <ThemedText variant="subheading" color="textBright">
                  {run.def.title}
                </ThemedText>
                <Badge label={`Day ${Math.min(run.daysElapsed, run.def.durationDays)}/${run.def.durationDays}`} variant="accent" />
              </View>
              <Button label="Quit" size="sm" variant="ghost" onPress={() => void abandon(run.runId)} />
            </View>
            <View style={styles.dotRow}>
              {run.dayHits.map((d, i) => (
                <View key={d.day} style={[styles.dot, { backgroundColor: d.hit ? run.def.accent : '#1A1E29' }]} />
              ))}
            </View>
            <ThemedText variant="caption" color="textDim">
              {run.hitDays}/{run.def.minHitDays} days hit · {run.daysLeft} days left · +{run.def.xpReward} XP
            </ThemedText>
          </Card>
        ))}

        {/* Completed / failed history */}
        {challenges.filter((c) => c.status !== 'active').map((run) => (
          <Card key={run.runId} compact accent={run.status === 'completed' ? '#4ADE80' : '#2C3242'}>
            <View style={styles.rowBetween}>
              <ThemedText variant="subheading" color={run.status === 'completed' ? 'success' : 'textDim'}>
                {run.def.title} · {run.status === 'completed' ? 'COMPLETED' : 'FAILED'}
              </ThemedText>
              <ThemedText variant="caption" color="textFaint">
                {run.hitDays} days
              </ThemedText>
            </View>
          </Card>
        ))}

        {/* Catalog: only programs without an active run */}
        <ThemedText variant="heading" color="textBright">
          Programs
        </ThemedText>
        {CHALLENGES.filter((c) => !activeByChallenge.has(c.id)).map((def) => (
          <Card key={def.id} compact accent={def.accent}>
            <View style={styles.col}>
              <View style={styles.rowBetween}>
                <View style={styles.row}>
                  <Ionicons name={def.icon as never} size={20} color={def.accent} />
                  <ThemedText variant="subheading" color="textBright">
                    {def.title}
                  </ThemedText>
                </View>
                <Badge label={`+${def.xpReward} XP`} variant="power" />
              </View>
              <ThemedText variant="caption" color="textDim">
                {def.description}
              </ThemedText>
              <ThemedText variant="caption" color="textFaint">
                {def.durationDays} days · {def.requiredPerDay}/day · at least {def.minHitDays} days
              </ThemedText>
              <Button
                label="Begin program"
                icon="play"
                size="sm"
                variant="secondary"
                loading={busy === def.id}
                onPress={() => {
                  void start(def.id);
                  void syncRewards();
                }}
              />
            </View>
          </Card>
        ))}

        {CHALLENGES.length === challenges.filter((c) => c.status === 'active').length ? (
          <EmptyState icon="barbell" title="All programs running" message="Finish an active program to begin another." />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

interface ChallengeViewLike {
  def: { id: string };
  status: string;
  runId: string;
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
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
    flex: 1,
  },
  col: {
    gap: spacing.sm,
  },
  dotRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
});
