import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ProgressBar,
  Screen,
  ThemedText,
  TrainingCard,
} from '@/design-system/components';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '@/design-system/tokens';
import { CHALLENGES } from '@/game/config/challenges';
import { useChallenges } from '@/features/progression/hooks/useChallenges';
import { useTrainingSessions } from '@/features/training/hooks/useTrainingSessions';
import { TrainingSessionModal } from '@/features/training/components/TrainingSessionModal';
import { WorkoutLogSheet } from '@/features/training/components/WorkoutLogSheet';
import { RewardOverlay } from '@/design-system/components/RewardOverlay';
import { TRAINING_KIND_META, type TrainingKind } from '@/data/repositories';
import { summarizeSessionHistory } from '@/game/engine/sessionHistory';
import { useProgression } from '@/features/progression/ProgressionProvider';

/**
 * TRAINING CENTER — the dojo. NEXT TRAINING dominates: what to do, how long,
 * what it pays, one BEGIN TRAINING button. Quick chips, programs and today's
 * logged sessions support it. The timer minimizes; the session keeps running
 * and a resume bar stays docked at the top.
 */
export default function TrainingScreen() {
  const router = useRouter();
  const { challenges, start, abandon, syncRewards, busy } = useChallenges();
  const training = useTrainingSessions();
  const { levelState, snapshot } = useProgression();

  const [timer, setTimer] = useState<{ kind: TrainingKind; durationSec: number } | null>(null);
  const [timerMinimized, setTimerMinimized] = useState(false);
  /** True while a completion is being persisted — timer shows TRAINING COMPLETE. */
  const [submitting, setSubmitting] = useState(false);
  /** Hard idempotency guard: one completion flow per session, ever. */
  const completionInFlightRef = useRef(false);
  const [workoutSheet, setWorkoutSheet] = useState(false);
  const [reward, setReward] = useState<{
    xp: number;
    gains: { attribute: 'power' | 'focus' | 'mind' | 'energy'; xp: number }[];
  } | null>(null);

  const activeByChallenge = new Set(challenges.filter((c) => c.status === 'active').map((c) => c.def.id));

  // Recommended session: the discipline trained least today (focus first).
  const nextSession: { kind: TrainingKind; durationSec: number } = (() => {
    const counts = training.summary.byKind;
    const order: TrainingKind[] = ['focus', 'mind', 'workout', 'breath'];
    const next = [...order].sort((a, b) => (counts[a]?.count ?? 0) - (counts[b]?.count ?? 0))[0];
    const preset = next === 'focus' ? 1500 : next === 'mind' ? 600 : 300;
    return { kind: next, durationSec: preset };
  })();

  const openTimer = (kind: TrainingKind) => {
    const preset = kind === 'focus' ? 1500 : kind === 'mind' ? 600 : 300; // 25 / 10 / 5 min
    setTimer({ kind, durationSec: preset });
    setTimerMinimized(false);
  };

  /**
   * Complete a timed session. IDEMPOTENT: the in-flight ref makes it
   * impossible to double-fire (Finish Early tapped twice, completion racing
   * with Finish Early, etc.). XP comes from the repository's single formula;
   * the timer stays visible in its TRAINING COMPLETE state until the
   * RewardOverlay takes over — completion is never a silent close.
   */
  const completeTimer = async (elapsedSec: number) => {
    if (!timer || completionInFlightRef.current) return;
    completionInFlightRef.current = true;
    setSubmitting(true);
    const { kind } = timer;
    try {
      const session = await training.complete(kind, { durationSec: elapsedSec });
      if (session.xpAwarded > 0) {
        const attr = TRAINING_KIND_META[kind].attribute;
        setReward({ xp: session.xpAwarded, gains: [{ attribute: attr, xp: session.xpAwarded }] });
      }
    } finally {
      setTimer(null);
      setTimerMinimized(false);
      setSubmitting(false);
      completionInFlightRef.current = false;
    }
  };

  const saveWorkout = async (w: { title: string; payload: Record<string, unknown> }) => {
    const session = await training.complete('workout', { title: w.title, payload: w.payload });
    setWorkoutSheet(false);
    if (session.xpAwarded > 0) {
      setReward({ xp: session.xpAwarded, gains: [{ attribute: 'power', xp: session.xpAwarded }] });
    }
  };

  const startProgram = async (id: string) => {
    await start(id);
    await syncRewards();
    router.setParams({});
  };

  const nextMeta = TRAINING_KIND_META[nextSession.kind];
  const nextMin = Math.max(1, Math.round(nextSession.durationSec / 60));
  const quickKinds: TrainingKind[] = (['focus', 'mind', 'workout', 'breath'] as const).filter(
    (k) => k !== nextSession.kind
  );
  const grouped = summarizeSessionHistory(training.sessionsToday);

  const beginTraining = () => {
    if (nextSession.kind === 'workout') {
      setWorkoutSheet(true);
    } else {
      openTimer(nextSession.kind);
    }
  };

  return (
    <Screen edges={['top']}>
      {/* Resume bar — visible while a session runs minimized */}
      {timer && timerMinimized ? (
        <View style={styles.resumeBar}>
          <Card compact accent={TRAINING_KIND_META[timer.kind].accent} style={styles.resumeCard}>
            <View style={styles.rowBetween}>
              <ThemedText variant="caption" color="textDim">
                {TRAINING_KIND_META[timer.kind].label} running…
              </ThemedText>
              <Button label="Resume" size="sm" variant="secondary" onPress={() => setTimerMinimized(false)} />
            </View>
          </Card>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText variant="caption" color="textDim" style={styles.brandRow}>
          {`TRAINING CENTER`}
        </ThemedText>

        {/* NEXT TRAINING — hero (display); the gradient CTA below is the action */}
        <TrainingCard
          icon={nextMeta.icon}
          title={`⚡ ${nextMeta.label.toUpperCase()}`}
          subtitle={`${nextMin} MIN · +${nextMin * 6} ${nextMeta.attribute.toUpperCase()} XP`}
          accent={nextMeta.accent}
        />

        <LinearGradient
          colors={['#00C2D9', '#0088A8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaWrap}
        >
          <Button label="⚡ BEGIN TRAINING" size="lg" onPress={beginTraining} />
        </LinearGradient>

        {/* QUICK TRAINING */}
        <ThemedText variant="heading" color="textBright" style={styles.sectionHeader}>
          Quick Training
        </ThemedText>
        <View style={styles.quickRow}>
          {quickKinds.map((kind) => {
            const meta = TRAINING_KIND_META[kind];
            return (
              <Card
                key={kind}
                compact
                onPress={() => (kind === 'workout' ? setWorkoutSheet(true) : openTimer(kind))}
                style={[styles.quickChip, { borderColor: meta.accent }]}
              >
                <View style={styles.quickInner}>
                  <ThemedText variant="label" style={{ color: meta.accent }}>
                    {meta.label.split(' ')[0].toUpperCase()}
                  </ThemedText>
                </View>
              </Card>
            );
          })}
        </View>

        {/* TODAY'S TRAINING — grouped, human-readable */}
        <ThemedText variant="heading" color="textBright" style={styles.sectionHeader}>
          Today&apos;s Training
        </ThemedText>
        {grouped.length > 0 ? (
          <Card compact>
            {grouped.map((g, i) => {
              const meta = TRAINING_KIND_META[g.kind as TrainingKind] ?? TRAINING_KIND_META.workout;
              return (
                <View key={`${g.label}-${i}`} style={styles.sessionRow}>
                  <View style={styles.sessionLeft}>
                    <ThemedText variant="subheading" style={{ color: meta.accent }}>
                      ✓
                    </ThemedText>
                    <ThemedText variant="body" color="textBright" numberOfLines={1} style={styles.sessionName}>
                      {g.label}
                    </ThemedText>
                    {g.count > 1 ? (
                      <Badge label={`×${g.count}`} variant="neutral" />
                    ) : null}
                    {g.totalMinutes > 0 ? (
                      <ThemedText variant="caption" color="textFaint">
                        {g.totalMinutes} min
                      </ThemedText>
                    ) : null}
                  </View>
                  <ThemedText variant="mono" color="gold">
                    +{g.totalXp} XP
                  </ThemedText>
                </View>
              );
            })}
          </Card>
        ) : (
          <EmptyState
            icon="barbell-outline"
            title="Nothing logged yet"
            message="Complete the next training to feed your attributes."
          />
        )}

        {/* TRAINING PROGRAMS */}
        <ThemedText variant="heading" color="textBright" style={styles.sectionHeader}>
          Training Programs
        </ThemedText>
        {challenges.filter((c) => c.status === 'active').map((run) => {
          const progressPct = Math.min(1, run.daysElapsed / run.def.durationDays);
          return (
            <Card key={run.runId} accent={run.def.accent} glow>
              <View style={styles.rowBetween}>
                <ThemedText variant="subheading" color="textBright">
                  {run.def.title.toUpperCase()}
                </ThemedText>
                <Badge label={`DAY ${Math.min(run.daysElapsed, run.def.durationDays)}/${run.def.durationDays}`} variant="accent" />
              </View>
              <ProgressBar value={progressPct} height={6} color={run.def.accent} />
              <ThemedText variant="caption" color="textDim">
                Today&apos;s challenge: complete {run.def.requiredPerDay} mission{run.def.requiredPerDay === 1 ? '' : 's'}
              </ThemedText>
              <View style={styles.rowBetween}>
                <ThemedText variant="caption" color="gold">
                  {run.hitDays}/{run.def.minHitDays} days hit · +{run.def.xpReward} XP
                </ThemedText>
                <Button label="Quit" size="sm" variant="ghost" onPress={() => void abandon(run.runId)} />
              </View>
            </Card>
          );
        })}
        {CHALLENGES.filter((c) => !activeByChallenge.has(c.id)).map((def) => (
          <TrainingCard
            key={def.id}
            icon={def.icon}
            title={def.title}
            subtitle={`${def.description} · ${def.durationDays} days · +${def.xpReward} XP`}
            accent={def.accent}
            trailing={<Badge label="BEGIN" variant="accent" />}
            disabled={busy === def.id}
            onPress={() => void startProgram(def.id)}
          />
        ))}

        {challenges.length === 0 ? (
          <EmptyState icon="barbell" title="No programs yet" message="Begin a training program to build a streak." />
        ) : null}
      </ScrollView>

      <TrainingSessionModal
        key={timer ? `${timer.kind}-${timer.durationSec}` : 'timer-closed'}
        visible={!!timer && !timerMinimized}
        running={!!timer}
        kind={timer?.kind ?? null}
        durationSec={timer?.durationSec ?? 0}
        submitting={submitting}
        onClose={() => {
          setTimer(null);
          setTimerMinimized(false);
        }}
        onComplete={(sec) => void completeTimer(sec)}
        onMinimize={() => setTimerMinimized(true)}
      />
      <WorkoutLogSheet
        visible={workoutSheet}
        onClose={() => setWorkoutSheet(false)}
        onSave={(w) => void saveWorkout(w)}
        saving={training.completing === 'workout'}
      />
      {reward ? (
        <RewardOverlay
          info={{
            xp: reward.xp,
            gains: reward.gains,
            // Real training streak from the shared snapshot — not session count.
            streak: snapshot?.streak.current ?? 0,
            level: levelState?.level,
            levelProgress: levelState?.progress,
          }}
          onDismiss={() => setReward(null)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  resumeBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  resumeCard: {
    marginBottom: 0,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  brandRow: {
    letterSpacing: 4,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  sectionHeader: {
    marginTop: spacing.md,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickChip: {
    flex: 1,
    minHeight: 56,
  },
  quickInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    width: '100%',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  sessionName: {
    flex: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  ctaWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
});
