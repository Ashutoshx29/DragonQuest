import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, PressableProps, StyleSheet, StyleProp, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptic } from '@/services/haptics';

import { springPresets } from '../motion';
import { useAppTheme } from '../theme';
import { radius, spacing } from '../tokens';
import { ThemedText } from './ThemedText';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Optional Ionicons name shown before the label */
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SIZES: Record<
  ButtonSize,
  { height: number; px: number; font: 'label' | 'subheading' | 'heading'; icon: number }
> = {
  sm: { height: 36, px: spacing.md, font: 'label', icon: 16 },
  md: { height: 48, px: spacing.xl, font: 'subheading', icon: 20 },
  lg: { height: 56, px: spacing.xxl, font: 'heading', icon: 24 },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const theme = useAppTheme();
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, springPresets.snappy);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, springPresets.pop);
  };
  const handlePress = (e: any) => {
    haptic('tap');
    onPress?.(e);
  };

  const colors = {
    primary: { bg: theme.accent, text: theme.bg, border: 'transparent' },
    secondary: { bg: theme.surfaceElevated, text: theme.accent, border: theme.border },
    ghost: { bg: 'transparent', text: theme.accent, border: 'transparent' },
    danger: { bg: theme.danger, text: theme.bg, border: 'transparent' },
  }[variant];

  const s = SIZES[size];

  return (
    <AnimatedPressable
      {...rest}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      style={[pressStyle, style]}
    >
      <View
        style={[
          styles.inner,
          {
            height: s.height,
            paddingHorizontal: s.px,
            backgroundColor: colors.bg,
            borderColor: colors.border,
            opacity: isDisabled ? 0.5 : 1,
          },
        ]}
      >
        {icon && !loading ? <Ionicons name={icon} size={s.icon} color={colors.text} /> : null}
        <ThemedText variant={s.font} style={{ color: colors.text }}>
          {loading ? '…' : label}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
