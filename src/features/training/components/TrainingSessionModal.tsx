import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { palette, radius, spacing } from '@/design-system/tokens';
import { Button, ProgressBar, ThemedText } from '@/design-system/components';
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
import { deriveBreathPhase } from '@/game/config/breathing';

import type { BreathPattern } from '@/game/config/breathing';

import type { TrainingKind } from '@/data/repositories';

interface TrainingSessionModalProps {
  visible: boolean;
  kind: TrainingKind | null;
  /** Session length in seconds. */
  durationSec: number;
  /** True while the session exists (running or minimized) — keeps wall-clock ticking. */
  running?: boolean;
  /** Optional breathing exercise layered onto the SAME timestamp clock. */
  breathing?: BreathPattern | null;
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
 * DragonQuest Training Timer — full-screen focused session surface.
 *
 * ARCHITECTURE (business behavior unchanged):
 * - Countdown math lives in game/engine/timer.ts and derives from TIMESTAMPS
 *   (startedAt + duration); the component only re-reads the clock, so
 *   backgrounding/locking never skews the countdown.
 * - Completion is detected centrally and fired ONCE (host double-guards too).
 * - Rewards come from the single formula (computeTrainingXpPure) — the UI
 *   never duplicates the math. Finish-early below 1 rounded minute routes to
 *   the safe no-XP exit (economy guard).
 *
 * PRESENTATION (rebuilt): ONE flex column, no absolute-positioned text
 * anywhere in the countdown region — overlap is impossible by construction.
 *
 *   TOP     kind identity (one line) · dock affordance
 *   CENTER  state label → HUGE countdown → session length → progress bar + %
 *   BOTTOM  Finish Early (secondary) → Abort (tertiary)
 *
 * The start sequence (READY 3 2 1 TRAIN) renders IN the countdown slot —
 * same content, same slot, no layered overlay. The hero font is derived from
 * the measured viewport (width fit for 5 tabular glyphs + height budget) and
 * clamped for OS font scaling with adjustsFontSizeToFit as a last resort.
 */
export function TrainingSessionModal({
  visible,
  kind,
  durationSec,
  running = false,
  breathing = null,
  onClose,
  onComplete,
  onMinimize,
  submitting = false,
  persistError = null,
}: TrainingSessionModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // ── Hero countdown sizing: deterministic, overlap-proof ──────────────────
  // "25:00" is 5 tabular glyphs (digits ~0.56em, colon ~0.3em ≈ 2.6em total
  // incl. letterSpacing), so the width budget / 2.6 IS the largest safe font
  // size. Cap by the vertical budget left after the fixed top/bottom chrome
  // and the center's supporting rows. adjustsFontSizeToFit stays as a final
  // safety net only — the math keeps it from ever engaging in practice.
  const isCompactHeight = windowHeight < 640;
  const heroWidthBudget = windowWidth - insets.left - insets.right;
  // Vertical: top bar + controls + state/session/progress rows + paddings + gaps.
  const centerFixedRows = isCompactHeight ? 260 : 290;
  const heroHeightCap = Math.max(120, windowHeight - insets.top - insets.bottom - centerFixedRows);
  const heroFontSize = Math.max(64, Math.min(Math.round(heroWidthBudget / 2.6), heroHeightCap, 180));
  const heroLineHeight = Math.round(heroFontSize * 1.1); // predictable, glyphs never touch

  // Start-sequence beats use a DEDICATED size rule — never the countdown's.
  // "25:00" is 5 tabular digit glyphs (≈2.6em), but the longest beat words
  // ("READY", "TRAIN") are 5 heavy CAPS glyphs (≈3.3em incl. bold caps
  // widths). Reusing the countdown size on a 360dp phone makes READY
  // overflow and wrap to "READ" / "Y". budget / 3.6 fits 5 caps with margin
  // on every supported width; capped so tablets stay restrained.
  const beatFontSize = Math.max(48, Math.min(Math.round(heroWidthBudget / 3.6), 120));
  const beatLineHeight = Math.round(beatFontSize * 1.15);

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

  // ── Breathing overlay mode (optional recovery) ────────────────────────
  // Same wall clock, same 250ms tick: the phase is a PURE function of
  // timestamps via deriveBreathPhase — the animation NEVER decides timing.
  // The breath window is the whole session: it begins exactly when the start
  // sequence ends (startedAt + seqTotal — deterministic, no effect state),
  // and completion flows through the SAME onComplete contract.
  const reducedMotion = useReducedMotion();
  // Shared-value visual swell (0 = contracted, 1 = expanded). Presentation only.
  const swell = useSharedValue(0);
  const breathStartMs = startedAt + seqTotal;
  const breathActive = !!breathing && sequenceOver;
  const breathElapsedMs = breathActive ? Math.max(0, now - breathStartMs) : 0;
  const breathRemainingSec =
    breathing && sequenceOver
      ? Math.max(0, durationSec - Math.floor(breathElapsedMs / 1000))
      : durationSec;
  const breathComplete = breathActive && breathRemainingSec === 0;
  const breathState =
    breathActive && breathing ? deriveBreathPhase(breathing, breathStartMs, now) : null;

  // Drive the visual swell toward the phase target; reduced-motion keeps it
  // static at mid-scale so no one gets animation-induced timing cues.
  useEffect(() => {
    if (!breathState) {
      swell.value = 0;
      return;
    }
    if (reducedMotion) {
      swell.value = 0.5;
      return;
    }
    const target = breathState.phase.name === 'exhale' ? 0 : 1;
    swell.value = withTiming(target, { duration: breathState.phase.sec * 1000, easing: Easing.inOut(Easing.ease) });
  }, [breathState, reducedMotion, swell]);

  // Map the shared value to the visual scale of the breathing circle
  // (worklet-safe: shared value → transform only).
  const breathSwellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.6 + swell.value * 0.4 }],
    opacity: 0.5 + swell.value * 0.5,
  }));

  const inStartSequence = startBeat !== null || !sequenceOver;
  const remaining = state.remainingSec;
  const naturalComplete = state.complete && !inStartSequence;
  const isSessionComplete = naturalComplete || earlyFinishElapsed !== null;

  // Completion: fire exactly once, then let the host show the RewardOverlay.
  // Breathing sessions complete through the same single-fire guard.
  useEffect(() => {
    if (breathing) {
      if (breathComplete && !completedRef.current && !submitting) {
        completedRef.current = true;
        haptic('levelUp');
        sfx.play('levelUp');
        fireComplete(durationSec);
      }
      return;
    }
    if (!naturalComplete || completedRef.current || submitting) return;
    completedRef.current = true;
    haptic('levelUp');
    sfx.play('levelUp');
    fireComplete(durationSec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breathing, breathComplete, naturalComplete, submitting, durationSec]);

  // Final-10-seconds tension: haptic + sfx tick per second.
  useEffect(() => {
    if (!state || isSessionComplete || inStartSequence) return;
    if (state.remainingSec <= FINAL_STRETCH_SEC && finalTickRef.current !== state.remainingSec) {
      finalTickRef.current = state.remainingSec;
      haptic('tap');
      sfx.play('xp');
    }
  }, [state, isSessionComplete, inStartSequence]);

  // ── Countdown color: kind accent in sequence, warning in final stretch ──
  const heroColor = isSessionComplete
    ? palette.success
    : !inStartSequence && remaining <= FINAL_STRETCH_SEC
      ? palette.warning
      : palette.textBright;

  if (!kind) return null;
  const meta = KIND_META[kind];
  const elapsedForDisplay = state.elapsedSec;
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

  const progressPercent = Math.min(100, Math.round((state.progress ?? 0) * 100));

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

  // Center content — the single vertical information hierarchy. During the
  // start sequence the beats REPLACE the countdown content in the SAME slot
  // (no overlay layer → overlap impossible). In breathing mode the phase
  // label + countdown share the same slot; the swell circle illustrates but
  // never drives timing.
  const centerContent = breathState && !breathComplete ? (
    <>
      <ThemedText variant="caption" color="textDim" style={styles.stateLabel}>
        {breathState.phase.label}
      </ThemedText>
      <View style={styles.breathStage}>
        <Animated.View
          style={[
            styles.breathCircle,
            breathSwellStyle,
            { backgroundColor: `${meta.color}2E`, borderColor: `${meta.color}66` },
          ]}
        />
        <ThemedText
          variant="display"
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityRole="timer"
          accessibilityLabel={`${breathState.phase.label}, ${breathState.secRemaining} seconds`}
          style={[styles.breathPhaseSec, { color: palette.textBright }]}
        >
          {breathState.secRemaining}
        </ThemedText>
      </View>
      <ThemedText variant="caption" color="textDim" style={styles.sessionLabel}>
        {`${breathing?.label.toUpperCase()} · ${formatCountdown(breathRemainingSec)} LEFT`}
      </ThemedText>
    </>
  ) : isSessionComplete ? (
    <>
      <ThemedText variant="caption" color="textDim" style={styles.stateLabel}>
        TRAINING COMPLETE
      </ThemedText>
      <ThemedText
        variant="display"
        accessibilityRole="text"
        accessibilityLabel={`Training complete. ${awardedXp} ${meta.attribute} XP earned`}
        style={[styles.heroCountdown, { fontSize: heroFontSize, lineHeight: heroLineHeight, color: heroColor }]}
      >
        {`+${awardedXp}`}
      </ThemedText>
      <ThemedText variant="caption" color="textDim" style={styles.sessionLabel}>
        {`${meta.attribute} XP EARNED`}
      </ThemedText>
    </>
  ) : inStartSequence ? (
    <>
      <ThemedText variant="caption" color="textDim" style={styles.stateLabel}>
        PREPARE BODY &amp; MIND
      </ThemedText>
      <ThemedText
        variant="display"
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityRole="text"
        accessibilityLabel={`Starting: ${startBeat?.label ?? 'READY'}`}
        style={[styles.heroCountdown, { fontSize: beatFontSize, lineHeight: beatLineHeight, color: meta.color }]}
      >
        {startBeat?.label ?? 'READY'}
      </ThemedText>
      <ThemedText variant="caption" color="textDim" style={styles.sessionLabel}>
        {sessionLengthLabel(durationSec)}
      </ThemedText>
    </>
  ) : (
    <>
      <ThemedText variant="caption" style={[styles.stateLabel, { color: meta.color }]}>
        {meta.label}
      </ThemedText>
      <ThemedText
        variant="display"
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.2}
        accessibilityRole="timer"
        accessibilityLabel={`Time remaining: ${formatCountdown(remaining)}`}
        style={[styles.heroCountdown, { fontSize: heroFontSize, lineHeight: heroLineHeight, color: heroColor }]}
      >
        {formatCountdown(remaining)}
      </ThemedText>
      <ThemedText variant="caption" color="textDim" style={styles.sessionLabel}>
        {sessionLengthLabel(durationSec)}
      </ThemedText>
      {/* Progress: the design-system bar (spring-animated, self-accessible) + pct */}
      <View style={styles.progressRow}>
        <ProgressBar value={state.progress ?? 0} height={6} color={meta.color} style={styles.progressTrack} />
        <ThemedText variant="caption" color="textDim" style={styles.progressPct}>
          {progressPercent}%
        </ThemedText>
      </View>
    </>
  );

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
        {/* Kind-tinted ambience behind the top edge only — decor, never over text */}
        <LinearGradient
          colors={[`${meta.color}14`, 'transparent']}
          style={styles.ambient}
          pointerEvents="none"
        />

        <View
          style={[
            styles.column,
            {
              paddingTop: Math.max(insets.top, spacing.md),
              paddingBottom: Math.max(insets.bottom, spacing.md),
              paddingLeft: Math.max(insets.left, spacing.lg),
              paddingRight: Math.max(insets.right, spacing.lg),
            },
          ]}
        >
          {/* ── TOP: minimal identity ─────────────────────────────────── */}
          <View style={styles.topBar}>
            <View style={styles.identity}>
              <View style={[styles.identityDot, { backgroundColor: meta.color }]} />
              <ThemedText variant="caption" style={[styles.identityText, { color: meta.color }]}>
                {meta.label}
              </ThemedText>
            </View>
            {onMinimize && !isSessionComplete ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dock timer and continue in background"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={onMinimize}
                style={({ pressed }) => [styles.dockButton, pressed && styles.pressed]}
              >
                <Ionicons name="chevron-down" size={20} color={palette.textDim} />
              </Pressable>
            ) : null}
          </View>

          {/* ── CENTER: the countdown IS the screen ───────────────────── */}
          <View style={styles.center}>{centerContent}</View>

          {/* ── BOTTOM: control hierarchy ─────────────────────────────── */}
          <View style={styles.controls}>
            {isSessionComplete ? (
              persistError ? (
                <>
                  <ThemedText variant="caption" style={styles.persistError} numberOfLines={2}>
                    {persistError}
                  </ThemedText>
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
                </>
              ) : (
                <ThemedText variant="heading" color="success" style={styles.completeHeader}>
                  {submitting ? 'Saving session…' : 'Training complete'}
                </ThemedText>
              )
            ) : (
              <>
                {/* Secondary: Finish Early — clearly below the timer in visual weight */}
                <Button
                  label={
                    submitting
                      ? 'Saving…'
                      : showPartialPreview
                        ? `Finish early · +${partialPreview} XP`
                        : 'Exit session'
                  }
                  size="md"
                  variant="secondary"
                  disabled={submitting || inStartSequence}
                  onPress={handleFinishEarly}
                  style={styles.finishEarlyButton}
                  accessibilityLabel={
                    showPartialPreview
                      ? `Finish session early for ${partialPreview} XP`
                      : 'Exit session without XP'
                  }
                />
                {/* Tertiary: Abort — quiet destructive text with confirmation */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Abort training session"
                  accessibilityHint="Aborts the session with no reward. Prompts for confirmation."
                  disabled={submitting}
                  hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
                  onPress={() => setConfirmAbort(true)}
                  style={({ pressed }) => [styles.abortLink, pressed && styles.pressed]}
                >
                  <ThemedText variant="caption" style={[styles.abortText, inFinalStretch && styles.abortEmphasis]}>
                    Abort Session
                  </ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* ── Abort confirmation — its own layer ABOVE the column ──────── */}
        {confirmAbort ? (
          <View style={styles.confirmBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel="Dismiss confirmation"
              onPress={() => setConfirmAbort(false)}
            />
            <View style={styles.confirmCard}>
              <Ionicons name="warning-outline" size={24} color={palette.danger} />
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
  ambient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },

  // ── TOP ────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  identityDot: {
    width: 8,
    height: 8,
    borderRadius: radius.round,
  },
  identityText: {
    fontWeight: '800',
    letterSpacing: 2.5,
  },
  dockButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    marginRight: -spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },

  // ── CENTER ─────────────────────────────────────────────────────────────
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stateLabel: {
    letterSpacing: 3,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroCountdown: {
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
  sessionLabel: {
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  breathStage: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
    height: 220,
  },
  breathCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    borderWidth: 2,
  },
  breathPhaseSec: {
    fontSize: 72,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  progressRow: {
    width: '72%',
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  progressTrack: {
    flex: 1,
  },
  progressPct: {
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    minWidth: 34,
    textAlign: 'right',
  },
  // (no animation library usage remains in this file — see component docblock)

  // ── BOTTOM ─────────────────────────────────────────────────────────────
  controls: {
    width: '100%',
    alignItems: 'stretch',
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  finishEarlyButton: {
    width: '100%',
  },
  persistError: {
    color: palette.danger,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  completeHeader: {
    letterSpacing: 2,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  abortLink: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abortText: {
    color: palette.textDim,
    letterSpacing: 2,
    fontWeight: '600',
  },
  abortEmphasis: {
    color: palette.danger,
  },

  // ── Abort confirmation ─────────────────────────────────────────────────
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
    borderColor: palette.line,
    backgroundColor: palette.night,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  confirmTitle: {
    fontWeight: '800',
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
  fullWidthAction: {
    width: '100%',
  },
});
