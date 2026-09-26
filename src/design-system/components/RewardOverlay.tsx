import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { springPresets, timingPresets } from '../motion';
import { palette, radius, spacing } from '../tokens';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';
import { ProgressBar } from './ProgressBar';
import { ThemedText } from './ThemedText';
import { attributeMeta, type AttributeKey } from '@/design-system/tokens';

export interface RewardGain {
  attribute: AttributeKey;
  xp: number;
}

export interface RewardInfo {
  /** "TRAINING COMPLETE" by default; "MISSION COMPLETE" etc. for others. */
  heading?: string;
  xp: number;
  gains: RewardGain[];
  /** Training streak after completion (renders the flame line when > 0). */
  streak?: number;
  /** 0..1 progress through the current level (renders the bar when given). */
  levelProgress?: number;
  /** Current level (label above the bar). */
  level?: number;
  /** Optional achievement hint line rendered under the streak. */
  achievementHint?: string;
  onDone?: () => void;
}

interface RewardOverlayProps {
  info: RewardInfo | null;
  onDismiss: () => void;
}

const VISIBLE_MS = 2600;

/** Counts 0 → target over ~500ms with ease-out (XP number animation). */
function useCountUp(target: number, active: boolean): number {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t0 = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - t0) / 500);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(target * eased));
      if (t >= 1) clearInterval(id);
    }, 32);
    return () => clearInterval(id);
  }, [target, active]);
  // When inactive, render 0 without a cascading setState in the effect.
  return active ? display : 0;
}

/**
 * Unified completion ceremony, staged for game feel:
 * 1. backdrop + aura burst  2. plate rises  3. XP counts up
 * 4. attribute gains reveal  5. streak flame  6. level bar movement
 * 7. achievement hint. Shared by missions, training and journal saves.
 */
export function RewardOverlay({ info, onDismiss }: RewardOverlayProps) {
  const backdrop = useSharedValue(0);
  const burstScale = useSharedValue(0.3);
  const burstOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.5);
  const ringOpacity = useSharedValue(0);
  const plateY = useSharedValue(36);
  const plateOpacity = useSharedValue(0);
  const [revealed, setRevealed] = useState(false);
  const xpShown = useCountUp(info?.xp ?? 0, revealed && !!info);

  useEffect(() => {
    if (!info) return;
    haptic('levelUp');
    sfx.play('achievement');

    backdrop.value = withTiming(1, { duration: 180 });
    burstOpacity.value = withTiming(1, { duration: 120 });
    burstScale.value = withSpring(1, springPresets.impact);
    ringOpacity.value = withDelay(140, withTiming(0.9, { duration: 150 }));
    ringScale.value = withDelay(
      140,
      withRepeat(withSequence(withTiming(1.6, { duration: 650 }), withTiming(2.2, { duration: 650 })), 2)
    );
    plateOpacity.value = withDelay(220, withTiming(1, { duration: timingPresets.normal.durationMs }));
    plateY.value = withDelay(220, withSpring(0, springPresets.pop));

    // Stage the numeric/gain reveals just after the plate lands.
    const revealTimer = setTimeout(() => setRevealed(true), 420);
    const timer = setTimeout(() => {
      info.onDone?.();
      onDismiss();
    }, VISIBLE_MS);
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(timer);
    };
  }, [info, backdrop, burstOpacity, burstScale, ringOpacity, ringScale, plateOpacity, plateY, onDismiss]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: burstOpacity.value,
    transform: [{ scale: burstScale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));
  const plateStyle = useAnimatedStyle(() => ({
    opacity: plateOpacity.value,
    transform: [{ translateY: plateY.value }],
  }));

  if (!info) return null;

  return (
    <Modal transparent visible onRequestClose={onDismiss} animationType="none">
      <View style={styles.root}>
        <Animated.View style={[styles.fill, styles.backdrop, backdropStyle]} />
        <View style={[styles.fill, styles.center]} pointerEvents="none">
          <Animated.View style={[styles.burst, burstStyle]} />
          <Animated.View style={[styles.ring, { borderColor: palette.aura }, ringStyle]} />
          <Animated.View style={[styles.plate, plateStyle]}>
            <ThemedText variant="label" color="success" style={styles.kicker}>
              {info.heading ?? 'TRAINING COMPLETE'}
            </ThemedText>
            <ThemedText variant="display" color="gold" style={styles.xpText}>
              ⚡ +{xpShown} XP
            </ThemedText>
            {revealed && info.gains.length > 0 ? (
              <View style={styles.gains}>
                {info.gains.map((g) => {
                  const meta = attributeMeta[g.attribute];
                  return (
                    <ThemedText key={g.attribute} variant="subheading" style={{ color: meta.color }}>
                      {meta.label} +{g.xp}
                    </ThemedText>
                  );
                })}
              </View>
            ) : null}
            {revealed && info.streak && info.streak > 0 ? (
              <View style={styles.streakRow}>
                <Ionicons name="flame" size={18} color={palette.ember} />
                <ThemedText variant="subheading" style={{ color: palette.ember }}>
                  STREAK: {info.streak} DAY{info.streak === 1 ? '' : 'S'}
                </ThemedText>
              </View>
            ) : null}
            {revealed && info.levelProgress !== undefined ? (
              <View style={styles.levelBlock}>
                <ThemedText variant="caption" color="textDim">
                  LEVEL PROGRESS{info.level ? ` · LV ${info.level}` : ''}
                </ThemedText>
                <ProgressBar value={Math.min(1, Math.max(0, info.levelProgress))} height={8} style={{ width: '100%' }} />
              </View>
            ) : null}
            {revealed && info.achievementHint ? (
              <ThemedText variant="caption" color="gold">
                {info.achievementHint}
              </ThemedText>
            ) : null}
          </Animated.View>
        </View>
        <View style={[styles.fill, styles.dismissLayer]} pointerEvents="box-only" onTouchStart={onDismiss} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    // Lighter than the timer/journal backdrops so the celebrating screen
    // stays readable behind the ceremony.
    backgroundColor: 'rgba(4, 5, 8, 0.78)',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  burst: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: radius.round,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
  },
  ring: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: radius.round,
    borderWidth: 2,
  },
  plate: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
  },
  kicker: {
    letterSpacing: 4,
  },
  xpText: {
    letterSpacing: 1,
  },
  gains: {
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.xs,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  levelBlock: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    width: 220,
  },
  dismissLayer: {},
});
