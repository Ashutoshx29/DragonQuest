import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { springPresets } from '../motion';
import { useAppTheme } from '../theme';
import { radius, spacing } from '../tokens';
import { ThemedText } from './ThemedText';

interface XPBarProps {
  /** 0..1 progress through the current level. */
  value: number;
  /** XP accumulated within the current level. */
  current?: number;
  /** XP needed to advance from the current level. */
  target?: number;
  color?: string;
  /** Show the numeric "x / y XP" readout. */
  showNumbers?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Counts a number up over ~600ms whenever `target` changes. */
function useCountUp(target: number): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = target;
    if (from === target) return;
    const t0 = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - t0) / 600);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (t >= 1) clearInterval(id);
    }, 32);
    return () => clearInterval(id);
  }, [target]);
  return display;
}

/**
 * XP / progression bar with animated fill and optional count-up numbers.
 * The canonical "power growing" indicator — used by CharacterHeader,
 * Progress and Profile.
 */
export function XPBar({ value, current, target, color, showNumbers = true, style }: XPBarProps) {
  const theme = useAppTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(Math.min(Math.max(value, 0), 1), springPresets.heavy);
  }, [value, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const shown = useCountUp(current ?? 0);

  return (
    <View style={style}>
      <View
        style={[styles.track, { backgroundColor: theme.xpTrack }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      >
        <View style={[StyleSheet.absoluteFill, styles.clip]}>
          <Animated.View
            style={[
              styles.fill,
              { backgroundColor: color ?? theme.xpFill, shadowColor: color ?? theme.xpFill },
              fillStyle,
            ]}
          />
        </View>
      </View>
      {showNumbers && current !== undefined && target !== undefined ? (
        <View style={styles.numbersRow}>
          <ThemedText variant="mono" color="accent">
            {shown.toLocaleString()} / {target.toLocaleString()} XP
          </ThemedText>
          <ThemedText variant="caption" color="textFaint">
            {Math.round(Math.min(1, Math.max(0, value)) * 100)}%
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 14,
    borderRadius: radius.round,
    overflow: 'hidden',
  },
  clip: {
    borderRadius: radius.round,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.round,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  numbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
