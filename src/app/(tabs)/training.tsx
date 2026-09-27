import { useCallback, useEffect, useRef, useState } from 'react';
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
import { FocusSetupSheet } from '@/features/training/components/FocusSetupSheet';
import { RecoverySheet } from '@/features/training/components/RecoverySheet';
import { SessionSummarySheet } from '@/features/training/components/SessionSummarySheet';
import { WorkoutLogSheet } from '@/features/training/components/WorkoutLogSheet';
import { RewardOverlay } from '@/design-system/components/RewardOverlay';
import { TRAINING_KIND_META, type TrainingKind } from '@/data/repositories';
import { summarizeSessionHistory } from '@/game/engine/sessionHistory';
import { useProgression } from '@/features/progression/ProgressionProvider';
import { createLogger } from '@/services/logger';
import { getSettings, setSetting } from '@/data/repositories/settings';
import { clampFocusDurationSec } from '@/game/config/training';

import type { BreathPattern } from '@/game/config/breathing';

const logger = createLogger('training-screen');

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
  /** Focus/mind session builder — choose duration before the timer opens. */
  const [setupSheet, setSetupSheet] = useState<{ kind: TrainingKind; initialMinutes: number } | null>(null);
  /** Remembered focus duration (minutes) — loaded once from settings KV. */
  const [lastFocusMinutes, setLastFocusMinutes] = useState(25);
  /** Recovery choice, offered after a focus/mind session completes. */
  const [recoverySheet, setRecoverySheet] = useState<{ focusMinutes: number } | null>(null);
  /** Breathing pattern chosen for the pending recovery (null = silent recovery). */
  const [recoveryPattern, setRecoveryPattern] = useState<BreathPattern | null>(null);
  /** Composite summary shown after the whole flow ends. */
  const [summary, setSummary] = useState<{
    focus: { label: string; minutes: number; xp: number } | null;
    recovery: { label: string; minutes: number; xp: number } | null;
    breathingLabel: string | null;
  } | null>(null);
  /** Persist failure of the completion write — shown on the completed timer
   * face instead of hanging on "Saving…"; the user's run is not lost (they
   * see TRAINING COMPLETE + the error), and sync never touches this path. */
  const [persistError, setPersistError] = useState<string | null>(null);
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

  // Timed kinds route through the SESSION BUILDER (choose duration first);
  // openTimer stays available for direct preset entry if ever needed.
  const openSetup = useCallback(
    (kind: TrainingKind) => {
      if (kind === 'workout') {
        setWorkoutSheet(true);
        return;
      }
      setSetupSheet({ kind, initialMinutes: kind === 'focus' ? lastFocusMinutes : 10 });
    },
    [lastFocusMinutes]
  );

  // Remember the last focus duration for the next setup (settings KV —
  // local-only, no new storage; failure is non-fatal).
  useEffect(() => {
    let alive = true;
    getSettings()
      .then((s) => {
        if (alive) setLastFocusMinutes(s.lastFocusMinutes);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const beginFromSetup = (kind: TrainingKind, durationSec: number) => {
    setSetupSheet(null);
    if (kind === 'focus') {
      const minutes = Math.round(durationSec / 60);
      setLastFocusMinutes(minutes);
      void setSetting('lastFocusMinutes', minutes).catch(() => {});
    }
    setTimer({ kind, durationSec: clampFocusDurationSec(durationSec) });
    setTimerMinimized(false);
  };

  /**
   * Complete a timed session. IDEMPOTENT: the in-flight ref makes it
   * impossible to double-fire (Finish Early tapped twice, completion racing
   * with Finish Early, retry racing a natural completion…). XP comes from
   * the repository's single formula; the timer stays visible in its
   * completed state until success closes it — completion is never a silent
   * close, and a failed local persist shows an honest retry instead of
   * hanging on "Saving…".
   */
  const completeTimer = async (elapsedSec: number) => {
    if (!timer || completionInFlightRef.current) return;
    completionInFlightRef.current = true;
    setSubmitting(true);
    setPersistError(null);
    const { kind } = timer;
    try {
      const session = await training.complete(kind, { durationSec: elapsedSec });
      if (session.xpAwarded > 0) {
        const attr = TRAINING_KIND_META[kind].attribute;
        setReward({ xp: session.xpAwarded, gains: [{ attribute: attr, xp: session.xpAwarded }] });
      }
      setTimer(null);
      setTimerMinimized(false);
      // Record the phase in the composite summary; after FOCUS/MIND, offer
      // the optional recovery step (skip is first-class).
      if (kind === 'focus' || kind === 'mind') {
        setSummary((prev) => ({
          focus: {
            label: TRAINING_KIND_META[kind].label,
            minutes: Math.max(1, Math.round(elapsedSec / 60)),
            xp: session.xpAwarded,
          },
          recovery: prev?.recovery ?? null,
          breathingLabel: null,
        }));
        setRecoverySheet({ focusMinutes: Math.max(1, Math.round(elapsedSec / 60)) });
      } else if (kind === 'breath') {
        setSummary((prev) => ({
          focus: prev?.focus ?? null,
          recovery: {
            label: 'Recovery',
            minutes: Math.max(1, Math.round(elapsedSec / 60)),
            xp: session.xpAwarded,
          },
          breathingLabel: recoveryPattern?.label ?? prev?.breathingLabel ?? null,
        }));
      }
    } catch (err) {
      // Failed LOCAL persist: keep the timer's completed face up and show an
      // honest error + retry. The user's training happened; cloud sync is a
      // separate idempotent pipeline and never affects this path.
      logger.error('training completion persist failed', err);
      setPersistError('Could not save this session. Your training is kept — retry the save.');
    } finally {
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
      openSetup(nextSession.kind);
    }
  };

  void openTimer;

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
                onPress={() => (kind === 'workout' ? setWorkoutSheet(true) : openSetup(kind))}
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
        persistError={persistError}
        onClose={() => {
          setTimer(null);
          setTimerMinimized(false);
          setPersistError(null);
        }}
        onComplete={(sec) => void completeTimer(sec)}
        onMinimize={() => setTimerMinimized(true)}
      />
      <FocusSetupSheet
        visible={!!setupSheet}
        kind={setupSheet?.kind ?? 'focus'}
        initialMinutes={setupSheet?.initialMinutes ?? 25}
        onBegin={(sec) => setupSheet && beginFromSetup(setupSheet.kind, sec)}
        onClose={() => setSetupSheet(null)}
      />
      <RecoverySheet
        visible={!!recoverySheet}
        initialPatternId={recoveryPattern?.id ?? null}
        focusMinutes={recoverySheet?.focusMinutes ?? 0}
        onBegin={(sec, pattern) => {
          setRecoveryPattern(pattern);
          setRecoverySheet(null);
          setTimer({ kind: 'breath', durationSec: sec });
          setTimerMinimized(false);
        }}
        onClose={() => {
          setRecoverySheet(null);
          // Skip (or dismiss) reveals the composite summary if a focus ran.
          if (summary?.focus) setSummary({ ...summary });
        }}
      />
      <SessionSummarySheet
        visible={!!summary}
        focus={summary?.focus ?? null}
        recovery={summary?.recovery ?? null}
        breathingLabel={summary?.breathingLabel ?? null}
        onDismiss={() => setSummary(null)}
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
