import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { palette, radius, spacing } from '../tokens';
import { ThemedText } from './ThemedText';

interface StreakBadgeProps {
  current: number | null | undefined;
  /** "TRAINING STREAK" caption under the number. */
  atRisk?: boolean;
  doneToday?: boolean;
}

/** Ember streak flame — "🔥 7 DAY STREAK" with risk/secured states. */
export function StreakBadge({ current, atRisk, doneToday }: StreakBadgeProps) {
  const color = atRisk ? palette.warning : palette.ember;
  const state = doneToday ? 'SECURED' : atRisk ? 'AT RISK' : null;
  return (
    <View style={[styles.badge, { borderColor: color }]} accessibilityLabel={`Streak ${current ?? 0} days`}>
      <Ionicons name="flame" size={18} color={color} />
      <ThemedText variant="label" style={{ color }}>
        {current != null ? `${current} DAY${current === 1 ? '' : 'S'}` : '—'}
      </ThemedText>
      {state ? (
        <ThemedText variant="caption" style={{ color: palette.textDim }}>
          {state}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
