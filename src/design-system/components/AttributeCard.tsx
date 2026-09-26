import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { springPresets } from '../motion';
import { useAppTheme } from '../theme';
import { radius, spacing } from '../tokens';
import { ThemedText } from './ThemedText';

import { attributeMeta, type AttributeKey } from '@/design-system/tokens';
import type { AttributeView } from '@/game/engine/attributes';

interface AttributeCardProps {
  view: AttributeView;
}

/** Animated fill bar with its own shared value (independent per card). */
function AttributeFill({ progress, color }: { progress: number; color: string }) {
  const value = useSharedValue(0);
  useEffect(() => {
    value.value = withSpring(Math.min(Math.max(progress, 0), 1), springPresets.heavy);
  }, [progress, value]);
  const style = useAnimatedStyle(() => ({ width: `${value.value * 100}%` }));
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, style]} />
    </View>
  );
}

/**
 * One attribute (POWER/FOCUS/…): icon, animated bar, and the rank story —
 * "RANK E · 120 / 250 · Next: D at 250". The bar fills through the CURRENT
 * rank band so low-level progress is visible instead of pinned near zero.
 */
export function AttributeCard({ view }: AttributeCardProps) {
  const theme = useAppTheme();
  const meta = attributeMeta[view.key as AttributeKey];
  const color = meta.color;
  const next = view.nextRank;

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { borderColor: color }]}>
          <Ionicons name={meta.icon as never} size={18} color={color} />
        </View>
        <ThemedText variant="label" style={{ color, letterSpacing: 2 }}>
          {meta.label}
        </ThemedText>
        <View style={styles.right}>
          <ThemedText variant="caption" style={{ color }}>
            RANK {view.tier}
          </ThemedText>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: theme.xpTrack }]}>
        <AttributeFill progress={view.progress} color={color} />
      </View>
      <View style={styles.statRow}>
        <ThemedText variant="caption" color="textDim">
          {view.xp.toLocaleString()}
          {next ? ` / ${next.at.toLocaleString()}` : ' · MAX'}
        </ThemedText>
        <ThemedText variant="caption" color="textFaint">
          {next ? `Next: ${next.label} at ${next.at.toLocaleString()}` : 'Mastered'}
        </ThemedText>
      </View>
      {view.xpToday > 0 ? (
        <ThemedText variant="caption" style={{ color }}>
          +{view.xpToday.toLocaleString()} today
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: 'rgba(18, 21, 29, 0.6)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    marginLeft: 'auto',
  },
  track: {
    height: 8,
    borderRadius: radius.round,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.round,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
