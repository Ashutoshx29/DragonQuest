import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
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
  /** Set when the host failed to PERSIST the completed session locally. The
   * timer stays up with an honest error + retry — a cloud-sync failure never
   * reaches this (sync is a separate idempotent pipeline). */
  persistError?: string | null;
}

const KIND_META: Record<
  TrainingKind,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; attribute: string }
> = {
  workout: { label: 'PHYSICAL TRAINING', icon: 'barbell', color: palette.attrPower, attribute: 'POWER' },
  focus: { label: 'FOCUS TRAINING', icon: 'timer', color: palette.attrFocus, attribute: 'FOCUS' },
  mind: { label: 'MIND TRAINING', icon: 'leaf', color: palette.attrMind, attribute: 'MIND' },
  breath: { label: 'RECOVERY BREATHING', icon: 'water', color: palette.attrEnergy, attribute: 'ENERGY' },
};

/**
 * Full-screen "training mode" surface for timed sessions.
 *
 * Architecture (core behavior unchanged):
 * - Countdown math lives in game/engine/timer.ts and derives from TIMESTAMPS
 *   (startedAt + duration); the component only re-reads the clock, so
 *   backgrounding/locking never skews the countdown.
 * - Completion is detected centrally and fired ONCE (host double-guards too).
 * - Rewards come from the single formula (computeTrainingXpPure) — the UI
 *   never duplicates the math.
 *
 * Design:
 * - TRUE CIRCLE by construction: the timer zone is measured (onLayout) and
 *   the ring gets ONE `ringSize` number for width AND height, bounded by the
 *   measured zone and capped for tablets — flexbox can never stretch it.
 * - The progress arc is two half-squares (border trick) clipped to their own
 *   half-window and rotated from -135deg (hidden) to +45deg (full half).
 *   Each half is exactly 180deg of arc, so the fill sweeps clockwise
 *   12 -> 3 -> 6 -> 9 -> 12 with zero overdraw. Pure React Native — no SVG,
 *   no new dependency.
 * - The countdown is the visual hero: kind badge above, session info inside
 *   the ring, reward line below, then primary Finish Early and a tertiary
 *   Abort text link.
 * - Reduced motion (OS setting): looping pulses are replaced by static
 *   styles; state transitions keep short, calm timings.
 * - The start sequence (READY 3 2 1 TRAIN) plays OVER the already-mounted
 *   ring, so the layout never jumps when TRAIN lands.
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
  persistError = null,
}: TrainingSessionModalProps) {
  // ── Ring sizing ─────────────────────────────────────────────────────────
  // Responsive, circular by construction: measured zone provides width and
  // height. An even integer is strictly enforced so half-windows (ringSize / 2)
  // never land on subpixel floats that cause seams or clipping on Android.
  const [zoneSize, setZoneSize] = useState(() => {
    const win = Dimensions.get('window');
    return { w: win.width * 0.88, h: win.height * 0.44 };
  });
  const onTimerZoneLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setZoneSize((prev) =>
      Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height }
    );
  }, []);

  const win = Dimensions.get('window');
  const isTablet = Math.min(win.width, win.height) >= 600;
  // Sizing bounded by measured zone and tablet constraints, forced to an even integer
  const maxRing = isTablet ? 420 : 330;
  const rawRing = Math.min(zoneSize.w * 0.92, zoneSize.h * 0.92, maxRing);
  const ringSize = Math.max(220, Math.floor(rawRing / 2) * 2);
  const ringThickness = Math.max(6, Math.floor(Math.round(ringSize * 0.036) / 2) * 2);
  const countdownFontSize = Math.min(isTablet ? 96 : 82, Math.round(ringSize * 0.28));

  /** Session start timestamp (ms). Lazily initialized ONCE on mount — the
   * host remounts this surface per session via `key`. State (not a ref) so
   * derived countdown values recompute on render — no ref reads during render. */
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [confirmAbort, setConfirmAbort] = useState(false);
  const completedRef = useRef(false);
  const finalTickRef = useRef(0);
  const startPhaseRef = useRef(-1);
  /** Elapsed seconds handed to onComplete last time — the retry path
   * re-fires the SAME value so the host re-persists identically. */
  const lastElapsedRef = useRef(0);
  const reduceMotion = useReducedMotion();

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
  // Clears the interval once the sequence finishes so it does not tick during 25+ min sessions.
  useEffect(() => {
    if (!visible) return;
    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= seqTotal) {
        setStartBeat(null);
        clearInterval(tick);
        return;
      }
      setStartBeat(startSequenceBeat(START_SEQUENCE, elapsed));
    }, 100);
    return () => clearInterval(tick);
  }, [visible, startedAt, seqTotal]);

  // Start-sequence feedback: haptic per beat, sfx on TRAIN.
  useEffect(() => {
    if (!startBeat) return;
    if (startBeat.index !== startPhaseRef.current) {
      startPhaseRef.current = startBeat.index;
      haptic('tap');
      if (startBeat.label === 'TRAIN') sfx.play('complete');
    }
  }, [startBeat]);

  // The countdown BEGINS at the TRAIN beat: while in the start sequence,
  // timer state is held at 0 elapsed and full duration remaining so it does
  // not tick down and then snap backwards when the sequence completes.
  const sequenceOver = now - startedAt >= seqTotal;
  const effectiveStart = startedAt + seqTotal;

  const state = useMemo(() => {
    if (!sequenceOver) {
      return { elapsedSec: 0, remainingSec: durationSec, complete: false, progress: 0 };
    }
    return deriveTimerState(effectiveStart, durationSec, now);
  }, [sequenceOver, effectiveStart, durationSec, now]);

  const inStartSequence = startBeat !== null || !sequenceOver;
  const remaining = state.remainingSec;
  const complete = state.complete && !inStartSequence;

  // Completion: fire exactly once, then let the host show the RewardOverlay.
  useEffect(() => {
    if (!complete || completedRef.current || submitting) return;
    completedRef.current = true;
    haptic('levelUp');
    sfx.play('levelUp');
    fireComplete(durationSec);
    // fireComplete closes over onComplete only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, submitting, durationSec]);

  // Final-10-seconds tension: one haptic + sfx tick per second.
  useEffect(() => {
    if (!state || complete || inStartSequence) return;
    if (state.remainingSec <= FINAL_STRETCH_SEC && finalTickRef.current !== state.remainingSec) {
      finalTickRef.current = state.remainingSec;
      haptic('tap');
      sfx.play('xp');
    }
  }, [state, complete, inStartSequence]);

  // ── Progress arc ────────────────────────────────────────────────────────
  // Animates to the derived fraction each tick; at completion it is driven to
  // exactly 1 (a full circle) so it never freezes short or overshoots.
  // Right half covers 0–50%, left half 50–100%; each rotates -135 -> +45deg.
  const progress = useSharedValue(0);
  useEffect(() => {
    const target = complete ? 1 : state?.progress ?? 0;
    progress.value = withTiming(target, {
      duration: reduceMotion ? 80 : complete ? 400 : 280,
      easing: Easing.out(Easing.quad),
    });
  }, [state?.progress, complete, reduceMotion, progress]);
  const rightHalfStyle = useAnimatedStyle(() => {
    const half = Math.min(Math.max(progress.value, 0), 0.5);
    return { transform: [{ rotate: `${-135 + half * 360}deg` }] };
  });
  const leftHalfStyle = useAnimatedStyle(() => {
    const half = Math.min(Math.max(progress.value - 0.5, 0), 0.5);
    return { transform: [{ rotate: `${-135 + half * 360}deg` }] };
  });

  // ── Aura ────────────────────────────────────────────────────────────────
  // One restrained breathing glow behind the ring (kind color, low opacity).
  // Reduced motion: static dim plate — no loop.
  const auraScale = useSharedValue(1);
  const auraOpacity = useSharedValue(0.08);
  useEffect(() => {
    if (reduceMotion) {
      auraScale.value = 1;
      auraOpacity.value = 0.06;
      return;
    }
    auraScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    auraOpacity.value = withRepeat(
      withSequence(
        withTiming(0.14, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.08, { duration: 1600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [reduceMotion, auraScale, auraOpacity]);
  const auraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: auraScale.value }],
    opacity: auraOpacity.value,
  }));

  // ── Status pulse (● IN TRAINING) ────────────────────────────────────────
  const statusOpacity = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion || complete) {
      statusOpacity.value = 1;
      return;
    }
    statusOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [reduceMotion, complete, statusOpacity]);
  const statusStyle = useAnimatedStyle(() => ({ opacity: statusOpacity.value }));

  // ── Start-sequence beat pop ─────────────────────────────────────────────
  const beatScale = useSharedValue(0.6);
  useEffect(() => {
    if (!startBeat) {
      beatScale.value = 0.6;
      return;
    }
    if (reduceMotion) {
      beatScale.value = 1;
      return;
    }
    beatScale.value = 0.6;
    beatScale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
  }, [startBeat, reduceMotion, beatScale]);
  const beatStyle = useAnimatedStyle(() => ({ transform: [{ scale: beatScale.value }] }));

  if (!kind) return null;
  const meta = KIND_META[kind];
  const elapsedForDisplay = state?.elapsedSec ?? 0;
  const inFinalStretch = !complete && !inStartSequence && remaining <= FINAL_STRETCH_SEC;

  const trainedMinutes = Math.round(elapsedForDisplay / 60);
  const canFinishEarly = !inStartSequence && trainedMinutes >= 1;

  /** Partial reward preview next to Finish Early (uses THE formula).
   * Requires at least 1 rounded minute (>=30s) trained; zero trained → no XP advertised. */
  const showPartialPreview = canFinishEarly;
  const partialPreview = showPartialPreview
    ? computeTrainingXpPure(kind, trainedMinutes * 60)
    : null;

  const handleFinishEarly = () => {
    if (completedRef.current || submitting || complete || inStartSequence) return;
    // Require at least 1 rounded minute (>= 30 seconds) of actual training to award XP.
    // Tapping before 30 seconds routes to safe exit without XP or saving, preventing farming exploits.
    if (trainedMinutes < 1) {
      haptic('warning');
      onClose();
      return;
    }
    completedRef.current = true;
    haptic('warning');
    fireComplete(Math.max(0, Math.min(elapsedForDisplay, durationSec)));
  };

  /** Fire the completion (natural or finish-early) exactly once per attempt,
   * remembering the elapsed value so a failed persist can retry identically. */
  const fireComplete = (elapsedSec: number) => {
    lastElapsedRef.current = elapsedSec;
    onComplete(elapsedSec);
  };

  const handleAbort = () => {
    if (submitting) return;
    setConfirmAbort(false);
    haptic('warning');
    onClose();
  };

  const handleRequestClose = () => {
    if (submitting) return; // Prevent abort mid-write
    if (confirmAbort) {
      setConfirmAbort(false); // Dismiss confirmation dialog on back
      return;
    }
    if (complete) {
      if (persistError) onClose(); // Allow exiting if save failed
      return;
    }
    setConfirmAbort(true); // Active session: confirm abort
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <View style={styles.root}>
        {/* Kind-colored top glow — the only decorative gradient, kept subtle */}
        <LinearGradient
          colors={[`${meta.color}18`, 'transparent']}
          style={styles.topGlow}
          pointerEvents="none"
        />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
          {/* Hierarchy 1 — Training kind identity (+ quiet minimize) */}
          <View style={styles.header}>
            <View style={[styles.kindBadge, { borderColor: `${meta.color}55`, backgroundColor: `${meta.color}14` }]}>
              <Ionicons name={meta.icon} size={16} color={meta.color} />
              <ThemedText variant="label" style={{ color: meta.color, letterSpacing: 3, fontWeight: '700' }}>
                {meta.label}
              </ThemedText>
            </View>
            {onMinimize && !complete ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue in background"
                accessibilityHint="Minimizes the timer; the session keeps running"
                onPress={onMinimize}
                style={styles.minimizeButton}
              >
                <Ionicons name="chevron-down" size={22} color={palette.textDim} />
              </Pressable>
            ) : null}
          </View>

          {/* Hierarchy 2+3 — Countdown Hero + Perfect Circular Progress Ring */}
          <View style={styles.timerZone} onLayout={onTimerZoneLayout}>
            <View
              style={[
                styles.ringBox,
                {
                  width: ringSize,
                  height: ringSize,
                },
              ]}
            >
              {/* Breathing aura behind the ring */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.aura,
                  auraStyle,
                  {
                    width: ringSize + 28,
                    height: ringSize + 28,
                    borderRadius: (ringSize + 28) / 2,
                    backgroundColor: meta.color,
                  },
                ]}
              />
              {/* Track: full faint circle */}
              <View
                style={[
                  styles.ringTrack,
                  {
                    width: ringSize,
                    height: ringSize,
                    borderRadius: ringSize / 2,
                    borderWidth: ringThickness,
                  },
                ]}
              />
              {/* Progress arc: left half (50% - 100%) */}
              <View style={[styles.arcWindow, { left: 0, width: ringSize / 2, height: ringSize }]}>
                <Animated.View
                  style={[
                    styles.arcSquareLeft,
                    leftHalfStyle,
                    {
                      width: ringSize,
                      height: ringSize,
                      left: 0,
                      borderRadius: ringSize / 2,
                      borderWidth: ringThickness,
                      borderBottomColor: meta.color,
                      borderLeftColor: meta.color,
                    },
                  ]}
                />
              </View>
              {/* Progress arc: right half (0% - 50%) */}
              <View style={[styles.arcWindow, { left: ringSize / 2, width: ringSize / 2, height: ringSize }]}>
                <Animated.View
                  style={[
                    styles.arcSquare,
                    rightHalfStyle,
                    {
                      width: ringSize,
                      height: ringSize,
                      left: -ringSize / 2,
                      borderRadius: ringSize / 2,
                      borderWidth: ringThickness,
                      borderTopColor: meta.color,
                      borderRightColor: meta.color,
                    },
                  ]}
                />
              </View>

              {/* Hierarchy 2 — Visual hero countdown inside the ring */}
              <View style={styles.clockWrap} pointerEvents="none">
                <ThemedText
                  variant="display"
                  color="textBright"
                  accessibilityRole="timer"
                  accessibilityLabel={
                    complete
                      ? 'Session complete'
                      : `Time remaining: ${formatCountdown(remaining)}`
                  }
                  style={[
                    styles.clock,
                    {
                      fontSize: countdownFontSize,
                      color: inFinalStretch ? palette.warning : palette.textBright,
                    },
                  ]}
                >
                  {complete || !inStartSequence || startBeat ? formatCountdown(remaining) : ''}
                </ThemedText>
                <ThemedText variant="caption" color="textDim" style={styles.sessionLabel}>
                  {sessionLengthLabel(durationSec)}
                </ThemedText>
              </View>

              {/* Start sequence plays over the ring — layout never jumps */}
              {inStartSequence ? (
                <View style={styles.beatOverlay} pointerEvents="none">
                  <Animated.View style={[styles.beatWrap, beatStyle]}>
                    <ThemedText variant="display" color="textBright" style={styles.beatText}>
                      {startBeat?.label ?? 'READY'}
                    </ThemedText>
                  </Animated.View>
                </View>
              ) : null}
            </View>
          </View>

          {/* Hierarchy 4 — Session / XP Information */}
          <View style={styles.rewardZone}>
            {persistError ? (
              <View style={styles.errorPill}>
                <Ionicons name="alert-circle" size={16} color={palette.danger} />
                <ThemedText variant="caption" style={{ color: palette.danger, textAlign: 'center' }}>
                  {persistError}
                </ThemedText>
              </View>
            ) : complete ? (
              <View style={[styles.xpPill, { borderColor: `${palette.gold}60`, backgroundColor: `${palette.gold}14` }]}>
                <Ionicons name="flash" size={16} color={palette.gold} />
                <ThemedText variant="subheading" color="gold" style={styles.xpText}>
                  {`+${computeTrainingXpPure(kind, durationSec)} ${meta.attribute} XP EARNED`}
                </ThemedText>
              </View>
            ) : inStartSequence ? (
              <Animated.View style={[styles.statusPill, statusStyle, { borderColor: `${meta.color}40` }]}>
                <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                <ThemedText variant="label" style={{ color: meta.color, letterSpacing: 2 }}>
                  PREPARING
                </ThemedText>
              </Animated.View>
            ) : (
              <View style={styles.infoRow}>
                <View style={[styles.xpPill, { borderColor: `${palette.gold}40`, backgroundColor: `${palette.gold}10` }]}>
                  <Ionicons name="flash" size={14} color={palette.gold} />
                  <ThemedText variant="label" color="gold" style={styles.xpText}>
                    {`+${computeTrainingXpPure(kind, durationSec)} ${meta.attribute} XP`}
                  </ThemedText>
                </View>
                <Animated.View style={[styles.statusPill, statusStyle, { borderColor: `${meta.color}35` }]}>
                  <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                  <ThemedText variant="label" color="textDim" style={styles.statusLabel}>
                    IN TRAINING
                  </ThemedText>
                </Animated.View>
              </View>
            )}
          </View>

          {/* Hierarchy 5+6 — Primary action & Secondary actions */}
          <View style={styles.footer}>
            {complete ? (
              <View style={styles.actionColumn}>
                <View style={styles.completeBanner}>
                  <ThemedText variant="heading" color="success" style={styles.completeTitle}>
                    {submitting ? 'SAVING PROGRESS…' : 'TRAINING COMPLETE'}
                  </ThemedText>
                </View>
                {persistError ? (
                  <>
                    <Button
                      label="Retry save"
                      size="lg"
                      variant="primary"
                      loading={submitting}
                      onPress={() => fireComplete(lastElapsedRef.current)}
                      style={styles.primaryButton}
                      accessibilityHint="Saves the completed session again"
                    />
                    <Button
                      label="Close without saving"
                      size="md"
                      variant="ghost"
                      disabled={submitting}
                      onPress={onClose}
                      style={styles.retryCloseButton}
                      accessibilityHint="Dismisses the modal if saving cannot succeed"
                    />
                  </>
                ) : null}
              </View>
            ) : (
              <View style={styles.actionColumn}>
                <Button
                  label={
                    submitting
                      ? 'Saving…'
                      : showPartialPreview
                        ? `Finish early · +${partialPreview} XP`
                        : 'Finish early'
                  }
                  size="lg"
                  variant="secondary"
                  disabled={submitting || inStartSequence}
                  onPress={handleFinishEarly}
                  style={styles.primaryButton}
                  accessibilityHint="Ends the session now and awards XP for the minutes trained"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Abort session"
                  accessibilityHint="Ends the session with no reward — asks for confirmation"
                  disabled={submitting}
                  onPress={() => setConfirmAbort(true)}
                  style={styles.abortLink}
                >
                  <ThemedText variant="label" style={[styles.abortText, { color: palette.danger }]}>
                    Abort Session
                  </ThemedText>
                </Pressable>
              </View>
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
  root: {
    flex: 1,
    backgroundColor: palette.void,
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  safe: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  kindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
    borderWidth: 1.5,
  },
  minimizeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
  },
  timerZone: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBox: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
  },
  ringTrack: {
    position: 'absolute',
    borderColor: palette.graphite,
    opacity: 0.35,
  },
  arcWindow: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  arcSquare: {
    position: 'absolute',
    top: 0,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  arcSquareLeft: {
    position: 'absolute',
    top: 0,
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
  },
  clockWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  clock: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
    fontWeight: '800',
    textAlign: 'center',
  },
  sessionLabel: {
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  beatOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beatWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 8, 12, 0.88)',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.line,
  },
  beatText: {
    fontSize: 56,
    letterSpacing: 8,
    fontWeight: '800',
  },
  rewardZone: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginBottom: spacing.xs,
  },
  errorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: `${palette.danger}15`,
    borderWidth: 1,
    borderColor: `${palette.danger}40`,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
    borderWidth: 1,
  },
  xpText: {
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
    borderWidth: 1,
    backgroundColor: 'rgba(12, 14, 20, 0.65)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radius.round,
  },
  statusLabel: {
    letterSpacing: 2,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  actionColumn: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  completeBanner: {
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  completeTitle: {
    letterSpacing: 4,
  },
  primaryButton: {
    alignSelf: 'stretch',
  },
  retryCloseButton: {
    alignSelf: 'stretch',
    marginTop: spacing.xs,
  },
  abortLink: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  abortText: {
    letterSpacing: 2,
  },
  confirmLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4, 5, 8, 0.65)',
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
