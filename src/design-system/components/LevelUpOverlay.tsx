import { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '../theme';
import { palette, radius, spacing } from '../tokens';
import { springPresets, timingPresets } from '../motion';
import { ThemedText } from './ThemedText';

export interface LevelUpInfo {
  fromLevel: number;
  toLevel: number;
  title: string;
}

interface LevelUpOverlayProps {
  info: LevelUpInfo | null;
  onDismiss: () => void;
}

const VISIBLE_MS = 2600;

/**
 * Level-up ceremony: aura burst + rising "LEVEL UP" plate.
 * Auto-dismisses; also dismisses on tap. Sequencing on JS timers (reliable),
 * visuals on the UI thread. All hooks run before any early return.
 */
export function LevelUpOverlay({ info, onDismiss }: LevelUpOverlayProps) {
  const theme = useAppTheme();

  const backdrop = useSharedValue(0);
  const burstScale = useSharedValue(0.3);
  const burstOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.4);
  const ringOpacity = useSharedValue(0);
  const plateY = useSharedValue(40);
  const plateOpacity = useSharedValue(0);

  useEffect(() => {
    if (!info) return;

    backdrop.value = withTiming(1, { duration: 180 });
    burstOpacity.value = withTiming(1, { duration: 120 });
    burstScale.value = withSpring(1, springPresets.impact);
    ringOpacity.value = withDelay(150, withTiming(0.9, { duration: 150 }));
    ringScale.value = withDelay(
      150,
      withRepeat(withSequence(withTiming(1.8, { duration: 700 }), withTiming(2.4, { duration: 700 })), 2)
    );
    plateOpacity.value = withDelay(250, withTiming(1, { duration: timingPresets.normal.durationMs }));
    plateY.value = withDelay(250, withSpring(0, springPresets.pop));

    const timer = setTimeout(onDismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
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
          <Animated.View style={[styles.ring, { borderColor: theme.accent }, ringStyle]} />
          <Animated.View style={[styles.plate, plateStyle]}>
            <ThemedText variant="label" color="accent" style={styles.kicker}>
              POWER RISING
            </ThemedText>
            <ThemedText variant="display" color="textBright" style={styles.levelText}>
              LEVEL {info.toLevel}
            </ThemedText>
            <ThemedText variant="subheading" color="gold">
              {info.title}
            </ThemedText>
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
    backgroundColor: 'rgba(4, 5, 8, 0.88)',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  burst: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: radius.round,
    backgroundColor: palette.auraDim,
  },
  ring: {
    position: 'absolute',
    width: 200,
    height: 200,
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
  levelText: {
    letterSpacing: 1,
  },
  dismissLayer: {},
});
