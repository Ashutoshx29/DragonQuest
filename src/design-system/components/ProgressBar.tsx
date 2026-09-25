import { useEffect } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { springPresets } from '../motion';
import { useAppTheme } from '../theme';
import { radius } from '../tokens';

interface ProgressBarProps {
  /** 0..1 */
  value: number;
  /** Bar height in px */
  height?: number;
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({ value, height = 10, color, trackColor, style }: ProgressBarProps) {
  const theme = useAppTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(Math.min(Math.max(value, 0), 1), springPresets.heavy);
  }, [value, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View
      style={[styles.track, { height, backgroundColor: trackColor ?? theme.xpTrack }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    >
      <View style={[StyleSheet.absoluteFill, styles.clip]}>
        <Animated.View
          style={[
            styles.fill,
            { height, backgroundColor: color ?? theme.xpFill, shadowColor: color ?? theme.xpFill },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: radius.round,
    overflow: 'hidden',
  },
  clip: {
    borderRadius: radius.round,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.round,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
