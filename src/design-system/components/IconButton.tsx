import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptic } from '@/services/haptics';

import { springPresets } from '../motion';
import { useAppTheme } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type IconColor = 'text' | 'textDim' | 'accent' | 'danger' | 'success';

interface IconButtonProps extends Omit<PressableProps, 'style'> {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: IconColor;
  label: string;
  style?: StyleProp<ViewStyle>;
}

/** Round icon-only button with press spring and haptic. Always pass `label`. */
export function IconButton({ icon, size = 22, color = 'accent', label, onPress, style, ...rest }: IconButtonProps) {
  const theme = useAppTheme();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={(e) => {
        haptic('tap');
        onPress?.(e);
      }}
      onPressIn={() => {
        scale.value = withSpring(0.88, springPresets.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, springPresets.pop);
      }}
      style={[pressStyle, styles.hit, style]}
    >
      <Ionicons name={icon} size={size} color={theme[color]} />
    </AnimatedPressable>
  );
}

const styles = {
  hit: {
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
