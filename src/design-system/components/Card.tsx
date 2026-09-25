import { Pressable, PressableProps, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptic } from '@/services/haptics';

import { springPresets } from '../motion';
import { useAppTheme } from '../theme';
import { radius, spacing } from '../tokens';
import { ThemedView } from './ThemedView';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CardProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  /** Accent color for the border (e.g. quest palette color); defaults to theme border */
  accent?: string;
  /** Tighter padding for dense list items */
  compact?: boolean;
  /** Renders a colored glow shadow (use sparingly for "energized" cards) */
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  accent,
  compact = false,
  glow = false,
  onPress,
  style,
  ...rest
}: CardProps) {
  const theme = useAppTheme();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    if (!onPress) return;
    scale.value = withSpring(0.98, springPresets.snappy);
  };
  const handlePressOut = () => {
    if (!onPress) return;
    scale.value = withSpring(1, springPresets.pop);
  };

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    compact ? { padding: spacing.md } : { padding: spacing.xl },
    { borderColor: accent ?? theme.border },
    glow && {
      shadowColor: accent ?? theme.accent,
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
    style,
  ];

  if (onPress) {
    return (
      <AnimatedPressable
        {...rest}
        onPress={(e) => {
          haptic('tap');
          onPress(e);
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        style={pressStyle}
      >
        <ThemedView surface="surface" style={cardStyle}>
          {children}
        </ThemedView>
      </AnimatedPressable>
    );
  }

  return (
    <ThemedView surface="surface" style={cardStyle} {...(rest as object)}>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
});
