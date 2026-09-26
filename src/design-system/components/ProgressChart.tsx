import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { springPresets } from '../motion';
import { palette, radius, spacing } from '../tokens';
import { ThemedText } from './ThemedText';

export interface ChartPoint {
  label: string;
  value: number;
}

interface ProgressChartProps {
  points: ChartPoint[];
  /** Bar color (defaults to electric blue). */
  color?: string;
  /** Value suffix, e.g. "m" for minutes. */
  unitSuffix?: string;
}

/** One animated vertical bar (own shared value → staggered feel). */
function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const height = useSharedValue(0);
  useEffect(() => {
    height.value = withSpring(max > 0 ? Math.min(1, value / max) : 0, springPresets.heavy);
  }, [value, max, height]);
  const style = useAnimatedStyle(() => ({
    height: `${Math.max(2, height.value * 100)}%`,
  }));
  return (
    <View style={styles.barCol}>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { backgroundColor: color }, style]} />
      </View>
      <ThemedText variant="caption" color="textFaint">
        {label}
      </ThemedText>
    </View>
  );
}

/**
 * Minimal animated bar chart — weekly minutes, monthly XP, weekly completion.
 * Deliberately dependency-free (no chart library) and impossible to misread.
 */
export function ProgressChart({ points, color = palette.aura, unitSuffix }: ProgressChartProps) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((a, p) => a + p.value, 0);
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {points.map((p) => (
          <Bar key={p.label} value={p.value} max={max} color={color} label={p.label} />
        ))}
      </View>
      <ThemedText variant="caption" color="textDim">
        Total {total.toLocaleString()}
        {unitSuffix ?? ''} this period
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end',
    height: 96,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  barTrack: {
    width: '100%',
    flex: 1,
    borderRadius: radius.sm,
    backgroundColor: palette.steel,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: radius.sm,
  },
});
