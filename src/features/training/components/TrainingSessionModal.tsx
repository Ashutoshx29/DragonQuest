import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; attribute: string; tag: string }
> = {
  workout: { label: 'PHYSICAL TRAINING', icon: 'barbell', color: palette.attrPower, attribute: 'POWER', tag: 'STRENGTH & GRIT' },
  focus: { label: 'FOCUS TRAINING', icon: 'timer', color: palette.attrFocus, attribute: 'FOCUS', tag: 'DEEP CLARITY' },
  mind: { label: 'MIND TRAINING', icon: 'leaf', color: palette.attrMind, attribute: 'MIND', tag: 'STILLNESS & AWARENESS' },
  breath: { label: 'RECOVERY BREATHING', icon: 'water', color: palette.attrEnergy, attribute: 'ENERGY', tag: 'RECHARGE & FLOW' },
};

/**
 * Full-screen immersive "Training Chamber" for timed DragonQuest sessions.
 *
 * Architecture (core behavior unchanged):
 * - Countdown math lives in game/engine/timer.ts and derives from TIMESTAMPS
 *   (startedAt + duration); the component only re-reads the clock, so
 *   backgrounding/locking never skews the countdown.
 * - Completion is detected centrally and fired ONCE (host double-guards too).
 * - Rewards come from the single formula (computeTrainingXpPure) — the UI
 *   never duplicates the math.
 *
 * Major Visual Redesign:
 * - DEDICATED TRAINING CHRONOMETER: Dominates the viewport with a high-contrast
 *   circular progress ring, cardinal HUD reticle ticks, and ambient energy pulse.
 * - COUNTDOWN AS HERO: Massive 84–98px tabular numbers with maximum legibility.
 * - INTEGRATED TACTICAL HUD: XP yield, attribute category, and real-time training
 *   pulse consolidated directly into the chronometer composition.
 * - BALANCED ACTION HIERARCHY: "Finish Early" is a refined secondary action
 *   rather than a shouting primary CTA; "Abort" is tertiary with confirmation.
 * - STABLE RESPONSIVE METRICS: Deterministic sizing calculated directly from
 *   useWindowDimensions() + useSafeAreaInsets() — zero Yoga aspect-ratio stretch,
 *   zero onLayout measurement jitter.
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
  // ── Deterministic Viewport-Derived Geometry ────────────────────────────
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = Math.min(windowWidth, windowHeight) >= 600;

  // Vertical reservations: Top HUD (~52px) + Tactical Info HUD (~72px) + Footer actions (~90px) + Insets + Padding
  const verticalBudget = 52 + 72 + 90 + insets.top + insets.bottom + spacing.xl * 2;
  const usableHeight = Math.max(240, windowHeight - verticalBudget);
  const usableWidth = Math.max(240, windowWidth - insets.left - insets.right - spacing.xl * 2);

  // Allow the chronometer ring to occupy a dominant portion of the screen without arbitrary tight caps
  const maxAllowedRing = isTablet ? 460 : 370;
  const rawRingSize = Math.min(usableWidth * 0.92, usableHeight * 0.94, maxAllowedRing);
  // Force an even integer to prevent subpixel seams on Android native rendering
  const ringSize = Math.max(250, Math.floor(rawRingSize / 2) * 2);
  const ringThickness = Math.max(8, Math.floor(Math.round(ringSize * 0.044) / 2) * 2);
  const countdownFontSize = Math.min(isTablet ? 98 : 84, Math.round(ringSize * 0.27));

  /** Session start timestamp (ms). Lazily initialized ONCE on mount — the
   * host remounts this surface per session via `key`. State (not a ref) so
   * derived countdown values recompute on render — no ref reads during render. */
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [earlyFinishElapsed, setEarlyFinishElapsed] = useState<number | null>(null);
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
  // lock/focus loss — no incrementing counter anywhere.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  // Instant AppState clock re-sync on foregrounding: eliminate up to 250ms tick latency
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setNow(Date.now());
      }
    });
    return () => sub.remove();
  }, []);

  // Start sequence driver — pure beat resolution from elapsed offsets.
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

  // Countdown BEGINS at the TRAIN beat: while in start sequence,
  // timer state is held at 0 elapsed and full duration remaining.
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
  const naturalComplete = state.complete && !inStartSequence;
  const isSessionComplete = naturalComplete || earlyFinishElapsed !== null;

  // Completion: fire exactly once, then let the host show the RewardOverlay.
  useEffect(() => {
    if (!naturalComplete || completedRef.current || submitting) return;
    completedRef.current = true;
    haptic('levelUp');
    sfx.play('levelUp');
    fireComplete(durationSec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naturalComplete, submitting, durationSec]);

  // Final-10-seconds tension: haptic + sfx tick per second.
  useEffect(() => {
    if (!state || isSessionComplete || inStartSequence) return;
    if (state.remainingSec <= FINAL_STRETCH_SEC && finalTickRef.current !== state.remainingSec) {
      finalTickRef.current = state.remainingSec;
      haptic('tap');
      sfx.play('xp');
    }
  }, [state, isSessionComplete, inStartSequence]);

  // ── Progress Arc Animation (UI Thread) ──────────────────────────────────
  const progress = useSharedValue(0);
  useEffect(() => {
    const target = isSessionComplete ? 1 : state?.progress ?? 0;
    progress.value = withTiming(target, {
      duration: reduceMotion ? 80 : isSessionComplete ? 400 : 280,
      easing: Easing.out(Easing.quad),
    });
  }, [state?.progress, isSessionComplete, reduceMotion, progress]);

  const rightHalfStyle = useAnimatedStyle(() => {
    const half = Math.min(Math.max(progress.value, 0), 0.5);
    return { transform: [{ rotate: `${-135 + half * 360}deg` }] };
  });

  const leftHalfStyle = useAnimatedStyle(() => {
    const half = Math.min(Math.max(progress.value - 0.5, 0), 0.5);
    return { transform: [{ rotate: `${-135 + half * 360}deg` }] };
  });

  // ── Ambient Core Energy Aura ────────────────────────────────────────────
  const auraScale = useSharedValue(1);
  const auraOpacity = useSharedValue(0.12);
  useEffect(() => {
    if (reduceMotion) {
      auraScale.value = 1;
      auraOpacity.value = 0.08;
      return;
    }
    auraScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    auraOpacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.1, { duration: 1800, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [reduceMotion, auraScale, auraOpacity]);

  const auraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: auraScale.value }],
    opacity: auraOpacity.value,
  }));

  // ── Status Pulse Indicator ──────────────────────────────────────────────
  const statusPulse = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion || isSessionComplete) {
      statusPulse.value = 1;
      return;
    }
    statusPulse.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 850, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [reduceMotion, isSessionComplete, statusPulse]);

  const statusDotStyle = useAnimatedStyle(() => ({ opacity: statusPulse.value }));

  // ── Start-Sequence Beat Animation ───────────────────────────────────────
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
    beatScale.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.back(1.5)) });
  }, [startBeat, reduceMotion, beatScale]);

  const beatStyle = useAnimatedStyle(() => ({ transform: [{ scale: beatScale.value }] }));

  if (!kind) return null;
  const meta = KIND_META[kind];
  const elapsedForDisplay = state?.elapsedSec ?? 0;
  const inFinalStretch = !isSessionComplete && !inStartSequence && remaining <= FINAL_STRETCH_SEC;

  const trainedMinutes = Math.round(elapsedForDisplay / 60);
  const canFinishEarly = !inStartSequence && trainedMinutes >= 1;

  /** Partial reward preview next to Finish Early (uses THE formula).
   * Requires at least 1 rounded minute (>=30s) trained; zero trained → no XP advertised. */
  const showPartialPreview = canFinishEarly;
  const partialPreview = showPartialPreview
    ? computeTrainingXpPure(kind, trainedMinutes * 60)
    : null;

  const fullSessionXp = computeTrainingXpPure(kind, durationSec);
  const awardedXp = earlyFinishElapsed !== null
    ? computeTrainingXpPure(kind, Math.max(1, Math.round(earlyFinishElapsed / 60)) * 60)
    : fullSessionXp;

  const progressPercent = Math.min(100, Math.round((state?.progress ?? 0) * 100));

  const handleFinishEarly = () => {
    if (completedRef.current || submitting || isSessionComplete || inStartSequence) return;
    // Require at least 1 rounded minute (>= 30 seconds) of actual training to award XP.
    // Tapping before 30 seconds routes to safe exit without XP or saving, preventing farming exploits.
    if (trainedMinutes < 1) {
      haptic('warning');
      onClose();
      return;
    }
    const elapsedSec = Math.max(0, Math.min(elapsedForDisplay, durationSec));
    setEarlyFinishElapsed(elapsedSec);
    completedRef.current = true;
    haptic('warning');
    fireComplete(elapsedSec);
  };

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
    if (submitting) return;
    if (confirmAbort) {
      setConfirmAbort(false);
      return;
    }
    if (isSessionComplete) {
      if (persistError) onClose();
      return;
    }
    setConfirmAbort(true);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <View style={styles.root}>
        {/* Immersive Top Atmospheric Glow */}
        <LinearGradient
          colors={[`${meta.color}22`, `${meta.color}08`, 'transparent']}
          style={styles.topAtmosphere}
          pointerEvents="none"
        />

        <View
          style={[
            styles.container,
            {
              paddingTop: Math.max(insets.top, spacing.md),
              paddingBottom: Math.max(insets.bottom, spacing.md),
              paddingLeft: Math.max(insets.left, spacing.lg),
              paddingRight: Math.max(insets.right, spacing.lg),
            },
          ]}
        >
          {/* ── TOP HUD: Minimalist Tactical Bar ─────────────────────────── */}
          <View style={styles.topHud}>
            <View style={styles.hudLeft}>
              <View style={[styles.disciplineDot, { backgroundColor: meta.color }]} />
              <View>
                <ThemedText variant="caption" style={[styles.hudDiscipline, { color: meta.color }]}>
                  {meta.label}
                </ThemedText>
                <ThemedText variant="caption" color="textDim" style={styles.hudTag}>
                  {meta.tag}
                </ThemedText>
              </View>
            </View>

            {onMinimize && !isSessionComplete ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dock timer and continue in background"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={onMinimize}
                style={({ pressed }) => [styles.minimizeAffordance, pressed && styles.minimizeAffordancePressed]}
              >
                <Ionicons name="chevron-down" size={18} color={palette.textDim} />
                <ThemedText variant="caption" color="textDim" style={styles.minimizeText}>
                  DOCK
                </ThemedText>
              </Pressable>
            ) : null}
          </View>

          {/* ── CENTER: Dominant Training Chronometer ─────────────────────── */}
          <View style={styles.chronometerViewport}>
            <View
              style={[
                styles.chronometerFrame,
                {
                  width: ringSize,
                  height: ringSize,
                },
              ]}
            >
              {/* Radial Energy Aura */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.auraGlow,
                  auraStyle,
                  {
                    width: ringSize + 40,
                    height: ringSize + 40,
                    borderRadius: (ringSize + 40) / 2,
                    backgroundColor: meta.color,
                  },
                ]}
              />

              {/* Outer Subtle Gauge Bezel */}
              <View
                pointerEvents="none"
                style={[
                  styles.outerBezel,
                  {
                    width: ringSize + 12,
                    height: ringSize + 12,
                    borderRadius: (ringSize + 12) / 2,
                  },
                ]}
              />

              {/* Primary Circular Track */}
              <View
                style={[
                  styles.trackRing,
                  {
                    width: ringSize,
                    height: ringSize,
                    borderRadius: ringSize / 2,
                    borderWidth: ringThickness,
                  },
                ]}
              />

              {/* Cardinal HUD Reticle Ticks (Explicitly Anchored for Android Yoga) */}
              <View style={[styles.reticleTick, { top: -2, left: (ringSize - 2) / 2, width: 2, height: ringThickness + 4 }]} />
              <View style={[styles.reticleTick, { bottom: -2, left: (ringSize - 2) / 2, width: 2, height: ringThickness + 4 }]} />
              <View style={[styles.reticleTick, { left: -2, top: (ringSize - 2) / 2, height: 2, width: ringThickness + 4 }]} />
              <View style={[styles.reticleTick, { right: -2, top: (ringSize - 2) / 2, height: 2, width: ringThickness + 4 }]} />

              {/* Animated Progress Arc: Left Half (50% - 100%) */}
              <View style={[styles.arcWindow, { left: 0, width: ringSize / 2, height: ringSize }]}>
                <Animated.View
                  style={[
                    styles.arcLeft,
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

              {/* Animated Progress Arc: Right Half (0% - 50%) */}
              <View style={[styles.arcWindow, { left: ringSize / 2, width: ringSize / 2, height: ringSize }]}>
                <Animated.View
                  style={[
                    styles.arcRight,
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

              {/* Central Chronometer Face (Hero Countdown, Accessible to Screen Readers) */}
              <View style={styles.centerFace}>
                {/* Upper Inner Discipline Label */}
                <View style={styles.faceHeader}>
                  <Ionicons name={meta.icon} size={15} color={meta.color} />
                  <ThemedText variant="caption" style={[styles.faceHeaderLabel, { color: meta.color }]}>
                    {meta.attribute} CADENCE
                  </ThemedText>
                </View>

                {/* The Hero Countdown Display with Font Scaling Protection */}
                <ThemedText
                  variant="display"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  maxFontSizeMultiplier={1.15}
                  accessibilityRole="timer"
                  accessibilityLabel={
                    isSessionComplete
                      ? 'Training complete'
                      : `Time remaining: ${formatCountdown(remaining)}`
                  }
                  style={[
                    styles.heroCountdown,
                    {
                      fontSize: countdownFontSize,
                      color: inFinalStretch ? palette.warning : palette.textBright,
                    },
                  ]}
                >
                  {isSessionComplete || !inStartSequence || startBeat ? formatCountdown(remaining) : ''}
                </ThemedText>

                {/* Lower Inner Status / Metrics */}
                <View style={styles.faceFooter}>
                  <ThemedText variant="caption" color="textDim" style={styles.faceFooterLabel}>
                    {isSessionComplete
                      ? 'GOAL REACHED'
                      : inStartSequence
                        ? 'FOCUS MIND'
                        : `${sessionLengthLabel(durationSec)} · ${progressPercent}%`}
                  </ThemedText>
                </View>
              </View>

              {/* Start Sequence Beat Overlay ("READY 3 2 1 TRAIN") */}
              {inStartSequence ? (
                <View style={styles.beatOverlay} pointerEvents="none">
                  <Animated.View style={[styles.beatCard, beatStyle]}>
                    <ThemedText variant="display" color="textBright" style={styles.beatText}>
                      {startBeat?.label ?? 'READY'}
                    </ThemedText>
                    <ThemedText variant="caption" color="textDim" style={styles.beatSub}>
                      {startBeat?.label === 'TRAIN' ? 'BEGIN YOUR RUN' : 'PREPARE BODY & MIND'}
                    </ThemedText>
                  </Animated.View>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── TACTICAL HUD MODULE: XP & Live Status Console ─────────────── */}
          <View style={styles.tacticalHud}>
            {persistError ? (
              <View style={styles.hudError}>
                <Ionicons name="alert-circle" size={18} color={palette.danger} />
                <ThemedText variant="caption" style={styles.hudErrorText}>
                  {persistError}
                </ThemedText>
              </View>
            ) : isSessionComplete ? (
              <View style={styles.hudComplete}>
                <Ionicons name="sparkles" size={18} color={palette.gold} />
                <ThemedText variant="subheading" color="gold" style={styles.hudCompleteText}>
                  {`+${awardedXp} ${meta.attribute} XP AWARDED`}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.hudConsole}>
                {/* Potential / Target XP */}
                <View style={styles.consoleSegment}>
                  <ThemedText variant="caption" color="textDim" style={styles.consoleHeader}>
                    TARGET REWARD
                  </ThemedText>
                  <View style={styles.consoleValueRow}>
                    <Ionicons name="flash" size={14} color={palette.gold} />
                    <ThemedText variant="label" color="gold" style={styles.consoleGoldText}>
                      {`+${fullSessionXp} ${meta.attribute} XP`}
                    </ThemedText>
                  </View>
                </View>

                {/* Tactical Divider */}
                <View style={styles.consoleDivider} />

                {/* Session Mode & Real-time State */}
                <View style={styles.consoleSegment}>
                  <ThemedText variant="caption" color="textDim" style={styles.consoleHeader}>
                    STATUS
                  </ThemedText>
                  <View style={styles.consoleValueRow}>
                    <Animated.View
                      style={[
                        styles.liveDot,
                        statusDotStyle,
                        { backgroundColor: inStartSequence ? palette.warning : meta.color },
                      ]}
                    />
                    <ThemedText variant="label" color="textBright" style={styles.consoleStatusText}>
                      {inStartSequence ? 'INITIALIZING' : 'IN TRAINING'}
                    </ThemedText>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* ── ACTION FOOTER: Calibrated Hierarchy ───────────────────────── */}
          <View style={styles.actionFooter}>
            {isSessionComplete ? (
              <View style={styles.completeActions}>
                <View style={styles.completeCelebration}>
                  <ThemedText variant="heading" color="success" style={styles.completeHeader}>
                    {submitting ? 'SAVING SESSION…' : 'TRAINING COMPLETE'}
                  </ThemedText>
                </View>

                {persistError ? (
                  <View style={styles.errorButtonStack}>
                    <Button
                      label="Retry save"
                      size="lg"
                      variant="primary"
                      loading={submitting}
                      onPress={() => fireComplete(lastElapsedRef.current)}
                      style={styles.fullWidthAction}
                      accessibilityHint="Saves the completed session again"
                    />
                    <Button
                      label="Close without saving"
                      size="md"
                      variant="ghost"
                      disabled={submitting}
                      onPress={onClose}
                      accessibilityHint="Dismisses the modal if saving cannot succeed"
                    />
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.trainingControls}>
                {/* Secondary: Finish Early (Refined, not screaming for attention) */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPartialPreview
                      ? `Finish session early for ${partialPreview} XP`
                      : 'Exit session without XP'
                  }
                  disabled={submitting || inStartSequence}
                  onPress={handleFinishEarly}
                  style={({ pressed }) => [
                    styles.secondaryActionPill,
                    (submitting || inStartSequence) && styles.actionDisabled,
                    pressed && styles.actionPressed,
                  ]}
                >
                  <Ionicons
                    name={canFinishEarly ? 'checkmark-circle-outline' : 'stop-circle-outline'}
                    size={18}
                    color={canFinishEarly ? palette.text : palette.textDim}
                  />
                  <ThemedText
                    variant="label"
                    style={[styles.secondaryActionText, { color: canFinishEarly ? palette.text : palette.textDim }]}
                  >
                    {submitting
                      ? 'Saving…'
                      : showPartialPreview
                        ? `Finish early · +${partialPreview} XP`
                        : 'Exit session'}
                  </ThemedText>
                </Pressable>

                {/* Tertiary: Abort Session with Confirmation */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Abort training session"
                  accessibilityHint="Aborts the session with no reward. Prompts for confirmation."
                  disabled={submitting}
                  hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
                  onPress={() => setConfirmAbort(true)}
                  style={styles.tertiaryAbortAffordance}
                >
                  <ThemedText variant="caption" style={styles.abortText}>
                    Abort Session
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* ── Confirmation Modal Layer (Accidental Tap Protection & A11y Touch Targets) ── */}
        {confirmAbort ? (
          <View style={styles.confirmBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel="Dismiss confirmation"
              onPress={() => setConfirmAbort(false)}
            />
            <View style={styles.confirmCard}>
              <View style={styles.confirmIconWrap}>
                <Ionicons name="warning-outline" size={24} color={palette.danger} />
              </View>
              <ThemedText variant="subheading" color="textBright" style={styles.confirmTitle}>
                Abort Training?
              </ThemedText>
              <ThemedText variant="caption" color="textDim" style={styles.confirmMessage}>
                Leaving now will discard your progress. No XP will be awarded for this session.
              </ThemedText>
              <View style={styles.confirmButtons}>
                <Button
                  label="Keep training"
                  size="md"
                  variant="secondary"
                  onPress={() => setConfirmAbort(false)}
                  style={styles.confirmFlexBtn}
                />
                <Button
                  label="Abort"
                  size="md"
                  variant="danger"
                  onPress={handleAbort}
                  style={styles.confirmFlexBtn}
                />
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
  topAtmosphere: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    justifyContent: 'space-between',
  },

  // ── Top HUD ─────────────────────────────────────────────────────────────
  topHud: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.xs,
  },
  hudLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  disciplineDot: {
    width: 8,
    height: 8,
    borderRadius: radius.round,
  },
  hudDiscipline: {
    fontWeight: '800',
    letterSpacing: 2.5,
  },
  hudTag: {
    letterSpacing: 1.5,
    marginTop: 1,
    fontSize: 10,
  },
  minimizeAffordance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  minimizeAffordancePressed: {
    opacity: 0.6,
  },
  minimizeText: {
    letterSpacing: 1.5,
    fontWeight: '700',
    fontSize: 10,
  },

  // ── Chronometer Viewport ────────────────────────────────────────────────
  chronometerViewport: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chronometerFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraGlow: {
    position: 'absolute',
  },
  outerBezel: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  trackRing: {
    position: 'absolute',
    borderColor: '#161A24',
    borderWidth: 10,
  },
  reticleTick: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  arcWindow: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  arcRight: {
    position: 'absolute',
    top: 0,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  arcLeft: {
    position: 'absolute',
    top: 0,
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
  },

  // ── Central Chronometer Face ────────────────────────────────────────────
  centerFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  faceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  faceHeaderLabel: {
    fontWeight: '800',
    letterSpacing: 2,
    fontSize: 11,
  },
  heroCountdown: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
  faceFooter: {
    marginTop: spacing.xxs,
  },
  faceFooterLabel: {
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 11,
  },

  // ── Start Sequence Beat Overlay ─────────────────────────────────────────
  beatOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beatCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 8, 12, 0.94)',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: spacing.xxs,
  },
  beatText: {
    fontSize: 60,
    letterSpacing: 8,
    fontWeight: '900',
  },
  beatSub: {
    letterSpacing: 2.5,
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Tactical HUD Module ─────────────────────────────────────────────────
  tacticalHud: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
    marginVertical: spacing.xs,
  },
  hudConsole: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(16, 19, 27, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  consoleSegment: {
    alignItems: 'flex-start',
    gap: 2,
  },
  consoleHeader: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
  },
  consoleValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  consoleGoldText: {
    fontWeight: '800',
    letterSpacing: 1,
  },
  consoleDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: radius.round,
  },
  consoleStatusText: {
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  hudError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: `${palette.danger}18`,
    borderWidth: 1,
    borderColor: `${palette.danger}40`,
  },
  hudErrorText: {
    color: palette.danger,
    textAlign: 'center',
    fontWeight: '600',
  },
  hudComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: `${palette.gold}16`,
    borderWidth: 1,
    borderColor: `${palette.gold}50`,
  },
  hudCompleteText: {
    letterSpacing: 2,
    fontWeight: '800',
  },

  // ── Action Footer ───────────────────────────────────────────────────────
  actionFooter: {
    width: '100%',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  trainingControls: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  secondaryActionPill: {
    width: '100%',
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(22, 26, 36, 0.75)',
    paddingHorizontal: spacing.lg,
  },
  secondaryActionText: {
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  actionDisabled: {
    opacity: 0.45,
  },
  actionPressed: {
    opacity: 0.75,
  },
  tertiaryAbortAffordance: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abortText: {
    color: `${palette.danger}CC`,
    letterSpacing: 2,
    fontWeight: '600',
    fontSize: 12,
  },
  completeActions: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  completeCelebration: {
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  completeHeader: {
    letterSpacing: 4,
    fontWeight: '900',
  },
  errorButtonStack: {
    width: '100%',
    gap: spacing.sm,
  },
  fullWidthAction: {
    width: '100%',
  },

  // ── Confirmation Modal ──────────────────────────────────────────────────
  confirmBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4, 5, 8, 0.82)',
  },
  confirmCard: {
    width: '88%',
    maxWidth: 340,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: palette.night,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  confirmIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.round,
    backgroundColor: `${palette.danger}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  confirmTitle: {
    fontWeight: '800',
    letterSpacing: 1,
  },
  confirmMessage: {
    textAlign: 'center',
    lineHeight: 18,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: '100%',
  },
  confirmFlexBtn: {
    flex: 1,
  },
});
