import { StyleSheet, View, ViewStyle } from 'react-native';

import { useAppTheme, Theme } from '../theme';
import { radius, spacing } from '../tokens';
import { ThemedText } from './ThemedText';

type BadgeVariant = 'neutral' | 'accent' | 'gold' | 'power' | 'success' | 'danger';

const badgeColors: Record<BadgeVariant, { bg: keyof Theme; fg: keyof Theme }> = {
  neutral: { bg: 'surfaceElevated', fg: 'textDim' },
  accent: { bg: 'accentDim', fg: 'accent' },
  gold: { bg: 'surfaceElevated', fg: 'gold' },
  power: { bg: 'surfaceElevated', fg: 'power' },
  success: { bg: 'surfaceElevated', fg: 'success' },
  danger: { bg: 'surfaceElevated', fg: 'danger' },
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const theme = useAppTheme();
  const { bg, fg } = badgeColors[variant];
  return (
    <View style={[styles.pill, { backgroundColor: theme[bg] }, style]}>
      <ThemedText variant="caption" style={{ color: theme[fg] }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
