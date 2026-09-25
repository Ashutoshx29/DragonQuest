import { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { springPresets, timingPresets } from '../motion';
import { TIER_META } from '@/game/config/achievements';
import { radius, spacing } from '../tokens';
import { ThemedText } from './ThemedText';

import type { AchievementDef } from '@/game/config/achievements';

interface AchievementOverlayProps {
  achievement: AchievementDef | null;
  onDismiss: () => void;
}

const VISIBLE_MS = 2400;

/** Achievement unlock ceremony: tier-colored medal reveal. */
export function AchievementOverlay({ achievement, onDismiss }: AchievementOverlayProps) {
  const backdrop = useSharedValue(0);
  const medalScale = useSharedValue(0.4);
  const medalOpacity = useSharedValue(0);
  const textY = useSharedValue(24);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    if (!achievement) return;
    backdrop.value = withTiming(1, { duration: 180 });
    medalOpacity.value = withTiming(1, { duration: 140 });
    medalScale.value = withSpring(1, springPresets.impact);
    textOpacity.value = withDelay(220, withTiming(1, { duration: timingPresets.normal.durationMs }));
    textY.value = withDelay(220, withSpring(0, springPresets.pop));

    const timer = setTimeout(onDismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [achievement, backdrop, medalScale, medalOpacity, textOpacity, textY, onDismiss]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const medalStyle = useAnimatedStyle(() => ({
    opacity: medalOpacity.value,
    transform: [{ scale: medalScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));

  if (!achievement) return null;
  const tier = TIER_META[achievement.tier];

  return (
    <Modal transparent visible onRequestClose={onDismiss} animationType="none">
      <View style={styles.root}>
        <Animated.View style={[styles.fill, styles.backdrop, backdropStyle]} />
        <View style={[styles.fill, styles.center]} pointerEvents="none">
          <Animated.View style={[styles.medal, { borderColor: tier.color }, medalStyle]}>
            <Ionicons name={achievement.icon as never} size={44} color={tier.color} />
          </Animated.View>
          <Animated.View style={[styles.textBlock, textStyle]}>
            <ThemedText variant="label" style={{ color: tier.color, letterSpacing: 3 }}>
              ACHIEVEMENT UNLOCKED
            </ThemedText>
            <ThemedText variant="title" color="textBright">
              {achievement.title}
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              {achievement.description} · +{achievement.xpReward} XP
            </ThemedText>
          </Animated.View>
        </View>
        <View
          style={[styles.fill, styles.dismissLayer]}
          pointerEvents="box-only"
          onTouchStart={onDismiss}
        />
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
  medal: {
    width: 104,
    height: 104,
    borderRadius: radius.round,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 21, 29, 0.9)',
  },
  textBlock: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  dismissLayer: {},
});
