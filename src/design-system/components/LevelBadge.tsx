import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '../theme';
import { radius } from '../tokens';
import { ThemedText } from './ThemedText';

interface LevelBadgeProps {
  level: number | null | undefined;
  /** "LV" by default; pass "RANK" etc. to rebrand. */
  label?: string;
}

/** Compact level plate — "LV 12" chip used on heroes and headers. */
export function LevelBadge({ level, label = 'LV' }: LevelBadgeProps) {
  const theme = useAppTheme();
  return (
    <View
      style={[styles.badge, { borderColor: theme.accent, backgroundColor: theme.accentDim }]}
      accessibilityLabel={`${label} ${level ?? '—'}`}
    >
      <ThemedText variant="label" color="accent">
        {level != null ? `${label} ${level}` : `${label} —`}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
});
