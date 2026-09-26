import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { palette, radius, spacing } from '@/design-system/tokens';
import { Button, ThemedText } from '@/design-system/components';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';

import {
  FINAL_STRETCH_SEC,
  START_SEQUENCE,
  deriveTimerState,
  formatCountdown,
  sessionLengthLabel,
  startSequenceBeat,
  startSequenceTotalMs,
} from '@/game/engine/timer';
import { computeTrainingXpPure } from '@/game/config/training';

import type { TrainingKind } from '@/data/repositories';

interface TrainingSessionModalProps {
  visible: boolean;
  kind: TrainingKind | null;
  /** Session length in seconds. */
  durationSec: number;
  /** True while the session exists (running or minimized) — keeps wall-clock ticking. */
  running?: boolean;
  onClose: () => void;
  /** Fired ONCE per session with the elapsed seconds to reward. */
  onComplete: (elapsedSec: number) => void;
  /** Collapse to a docked resume bar; the session keeps running. */
  onMinimize?: () => void;
  /** True while the host is persisting the completion (disables all exits). */
  submitting?: boolean;
}

const KIND_META: Record<
  TrainingKind,
  { label: string; icon: string; color: string; attribute: string }
> = {
  workout: { label: 'PHYSICAL TRAINING', icon: 'barbell', color: palette.attrPower, attribute: 'POWER' },
  focus: { label: 'FOCUS TRAINING', icon: 'timer', color: palette.attrFocus, attribute: 'FOCUS' },
  mind: { label: 'MIND TRAINING', icon: 'leaf', color: palette.attrMind, attribute: 'MIND' },
  breath: { label: 'RECOVERY BREATHING', icon: 'water', color: palette.attrEnergy, attribute: 'ENERGY' },
};

/** Full-screen/near-full-screen "training mode" surface for timed sessions.
 *
 * Architecture:
 * - Countdown math lives in game/engine/timer.ts and derives from TIMESTAMPS
 *   (startedAt + duration); the component only re-reads the clock, so
 *   backgrounding/locking never skews the countdown.
 * - The ring animates with withTiming driven by the derived progress, so it
 *   moves smoothly every tick and lands exactly on 100% at completion.
 * - Completion is detected centrally and fired ONCE (host double-guards too).
 */
export function TrainingSessionModal({
  visible,
  kind,
  durationSec,
  running = false,
  onClose,
  onComplete,
  onMinimize,
  submitting = false,
}: TrainingSessionModalProps) {
  /** Session start timestamp (ms). Lazily initialized ONCE on mount — the
   * host only mounts this surface when a session starts, and the key-based
   * remount pattern resets it per session. State (not a ref) so derived
   * countdown values recompute on render — no ref reads during render. */
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [showRules, setShowRules] = useState(false);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const completedRef = useRef(false);
  const finalTickRef = useRef(0);
  const startPhaseRef = useRef(-1);

  /** Start sequence state ("READY 3 2 1 TRAIN"). */
  const seqTotal = useMemo(() => startSequenceTotalMs(START_SEQUENCE), []);
  const [startBeat, setStartBeat] = useState<{ label: string; index: number } | null>(null);

  // Central clock loop: derive `now` from timestamps every 250ms. Reading the
  // wall clock each tick makes the countdown self-correcting after background/
  // lock/focus loss — no incrementing counter anywhere. The interval keeps
  // running while minimized (`running`) so resume shows the correct time.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  // Start sequence driver — pure beat resolution from elapsed offsets.
  useEffect(() => {
    if (!visible) return;
    const tick = setInterval(() => {
      setStartBeat(startSequenceBeat(START_SEQUENCE, Date.now() - startedAt));
    }, 100);
    return () => clearInterval(tick);
  }, [visible, startedAt]);

  // Start-sequence feedback: haptic per beat, sfx on TRAIN.
  useEffect(() => {
    if (!startBeat) return;
    if (startBeat.index !== startPhaseRef.current) {
      startPhaseRef.current = startBeat.index;
      haptic('tap');
      if (startBeat.label === 'TRAIN') sfx.play('complete');
    }
  }, [startBeat]);

  // The countdown BEGINS at the TRAIN beat: the effective start shifts by the
  // sequence length once it is over, so the full duration counts from there.
  // (Pure derivation — no extra state, no setState in effects.)
  const sequenceOver = now - startedAt >= seqTotal;
  const effectiveStart = startedAt + (sequenceOver ? seqTotal : 0);

  const state = useMemo(
    () => deriveTimerState(effectiveStart, durationSec, now),
    [effectiveStart, durationSec, now]
  );

  const inStartSequence = startBeat !== null || !sequenceOver;
  const remaining = state.remainingSec;
  const complete = state.complete && !inStartSequence;

  // Completion: fire exactly once, then let the host show the RewardOverlay.
  useEffect(() => {
    if (!complete || completedRef.current || submitting) return;
    completedRef.current = true;
    haptic('levelUp');
    sfx.play('levelUp');
    onComplete(durationSec);
  }, [complete, submitting, onComplete, durationSec]);

  // Final-10-seconds tension: one haptic + sfx tick per second.
  useEffect(() => {
    if (!state || complete || inStartSequence) return;
    if (state.remainingSec <= FINAL_STRETCH_SEC && finalTickRef.current !== state.remainingSec) {
      finalTickRef.current = state.remainingSec;
      haptic('tap');
      sfx.play('xp');
    }
  }, [state, complete, inStartSequence]);

  // Progress ring — animates to the derived fraction each tick; at completion
  // it is driven to exactly 1 so it never freezes short or overshoots.
  const progress = useSharedValue(0);
  useEffect(() => {
    const target = complete ? 1 : state?.progress ?? 0;
    progress.value = withTiming(target, {
      duration: complete ? 400 : 280,
      easing: Easing.out(Easing.quad),
    });
  }, [state?.progress, complete, progress]);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 360}deg` }],
  }));
  const ringOpacityStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + progress.value * 0.75,
  }));

  // Start-sequence beat pop animation.
  const beatScale = useSharedValue(0.6);
  useEffect(() => {
    if (startBeat) beatScale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
  }, [startBeat, beatScale]);
  const beatStyle = useAnimatedStyle(() => ({ transform: [{ scale: beatScale.value }] }));

  if (!kind) return null;
  const meta = KIND_META[kind];
  const elapsedForDisplay = state?.elapsedSec ?? 0;

  /** Partial reward preview shown next to Finish Early (uses THE formula). */
  const partialPreview = computeTrainingXpPure(kind, Math.max(1, Math.round(elapsedForDisplay / 60)) * 60);

  const handleFinishEarly = () => {
    if (completedRef.current || submitting || complete) return;
    completedRef.current = true;
    haptic('warning');
    onComplete(Math.max(0, Math.min(elapsedForDisplay, durationSec)));
  };

  const handleAbort = () => {
    if (submitting) return;
    setConfirmAbort(false);
    haptic('warning');
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setConfirmAbort(true)}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
          {/* Training type */}
          <View style={styles.header}>
            <View style={[styles.kindBadge, { borderColor: meta.color }]}>
              <Ionicons name={meta.icon as never} size={18} color={meta.color} />
              <ThemedText variant="label" style={{ color: meta.color, letterSpacing: 3 }}>
                {meta.label}
              </ThemedText>
            </View>
          </View>

          {/* Countdown + ring — the dominant zone */}
          <View style={styles.timerZone}>
            {inStartSequence ? (
              <Animated.View style={[styles.beatWrap, beatStyle]}>
                <ThemedText variant="display" color="textBright" style={styles.beatText}>
                  {startBeat?.label ?? 'READY'}
                </ThemedText>
              </Animated.View>
            ) : (
              <>
                <View style={[styles.ringTrack, { borderColor: meta.color }]} />
                <Animated.View
                  style={[
                    styles.ringFill,
                    { borderColor: meta.color },
                    { borderLeftColor: 'transparent', borderBottomColor: 'transparent' },
                    ringStyle,
                    ringOpacityStyle,
                  ]}
                />
                <View style={styles.clockWrap} pointerEvents="none">
                  <ThemedText variant="display" color="textBright" style={styles.clock}>
                    {complete ? '0:00' : formatCountdown(remaining)}
                  </ThemedText>
                  <ThemedText variant="caption" color="textDim">
                    {sessionLengthLabel(durationSec)}
                  </ThemedText>
                </View>
              </>
            )}
          </View>

          {/* Reward line + rules disclosure */}
          <View style={styles.rewardZone}>
            <View style={styles.rewardRow}>
              <Ionicons name="flash" size={16} color={palette.gold} />
              <ThemedText variant="subheading" color="gold">
                {`+${computeTrainingXpPure(kind, durationSec)} ${meta.attribute} XP`}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reward rules"
              onPress={() => setShowRules((v) => !v)}
              style={styles.rulesToggle}
            >
              <Ionicons name="information-circle-outline" size={16} color={palette.textDim} />
              <ThemedText variant="caption" color="textDim">
                Reward rules
              </ThemedText>
            </Pressable>
            {showRules ? (
              <View style={styles.rulesCard}>
                <ThemedText variant="caption" color="textDim">
                  Full completion → full reward · Finish early → XP for minutes trained · Abort → no reward
                </ThemedText>
              </View>
            ) : null}
          </View>

          {/* Status / exits */}
          <View style={styles.footer}>
            {complete ? (
              <ThemedText variant="label" color="success" style={styles.statusLine}>
                TRAINING COMPLETE
              </ThemedText>
            ) : (
              <>
                <ThemedText variant="label" color="textDim" style={styles.statusLine}>
                  IN TRAINING
                </ThemedText>
                <View style={styles.exitRow}>
                  <Button
                    label={submitting ? 'Saving…' : `Finish early · +${partialPreview} XP`}
                    variant="secondary"
                    size="sm"
                    disabled={submitting}
                    onPress={handleFinishEarly}
                  />
                  <Button
                    label={submitting ? '…' : 'Abort'}
                    variant="ghost"
                    size="sm"
                    disabled={submitting}
                    onPress={() => setConfirmAbort(true)}
                  />
                </View>
                {onMinimize ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Minimize session"
                    onPress={onMinimize}
                    style={styles.minimizeLink}
                  >
                    <ThemedText variant="caption" color="textFaint">
                      Continue in background
                    </ThemedText>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </SafeAreaView>

        {/* Abort confirmation — accidental taps must not destroy a session */}
        {confirmAbort ? (
          <View style={styles.confirmLayer} pointerEvents="box-none">
            <View style={styles.confirmCard}>
              <ThemedText variant="subheading" color="textBright">
                Abort session?
              </ThemedText>
              <ThemedText variant="caption" color="textDim">
                No XP will be awarded.
              </ThemedText>
              <View style={styles.confirmActions}>
                <Button label="Keep training" size="sm" variant="secondary" onPress={() => setConfirmAbort(false)} />
                <Button label="Abort" size="sm" variant="danger" onPress={handleAbort} />
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 8, 12, 0.55)',
  },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(7, 8, 12, 0.72)',
  },
  header: {
    width: '100%',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  kindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  timerZone: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beatWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  beatText: {
    fontSize: 64,
    letterSpacing: 6,
  },
  ringTrack: {
    position: 'absolute',
    width: '72%',
    aspectRatio: 1,
    maxWidth: 320,
    borderRadius: radius.round,
    borderWidth: 6,
    opacity: 0.18,
  },
  ringFill: {
    position: 'absolute',
    width: '72%',
    aspectRatio: 1,
    maxWidth: 320,
    borderRadius: radius.round,
    borderWidth: 6,
    borderTopColor: 'transparent',
  },
  clockWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  clock: {
    fontSize: 72,
    fontVariant: ['tabular-nums'],
  },
  rewardZone: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rulesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  rulesCard: {
    maxWidth: 320,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.graphite,
    backgroundColor: 'rgba(18, 21, 29, 0.85)',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  statusLine: {
    letterSpacing: 4,
  },
  exitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  minimizeLink: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  confirmLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4, 5, 8, 0.6)',
  },
  confirmCard: {
    width: '86%',
    maxWidth: 340,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.night,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
