import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { springPresets } from '../motion';
import { radius, spacing } from '../tokens';
import { haptic } from '@/services/haptics';
import { ThemedText } from './ThemedText';

interface TrainingCardProps {
  icon: string;
  title: string;
  subtitle: string;
  accent: string;
  /** Breathing glow pulse — use on the ONE primary card only. */
  emphasized?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Right-side slot: status badge, "+XP" chip, timer result… */
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Large training-center card. Strong vertical rhythm: icon plate → title →
 * subtitle → CTA row. `emphasized` adds a slow aura pulse — reserve it for
 * the single primary action on screen.
 */
export function TrainingCard({
  icon,
  title,
  subtitle,
  accent,
  emphasized = false,
  onPress,
  disabled,
  trailing,
  style,
}: TrainingCardProps) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.35);

  useEffect(() => {
    if (!emphasized) {
      glow.value = 0.35;
      return;
    }
    glow.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 1200 }), withTiming(0.35, { duration: 1200 })),
      -1,
      true
    );
  }, [emphasized, glow]);

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || !onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, springPresets.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, springPresets.pop);
      }}
      onPress={() => {
        if (!onPress) return;
        haptic('tap');
        onPress();
      }}
      style={[pressStyle, style]}
    >
      <Animated.View
        style={[
          styles.panel,
          {
            shadowColor: accent,
            shadowOpacity: glow.value,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(18, 21, 29, 0.9)', 'rgba(7, 8, 12, 0.95)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.inner, { borderColor: accent }]}>
          <View style={[styles.iconPlate, { borderColor: accent }]}>
            <Ionicons name={icon as never} size={26} color={accent} />
          </View>
          <View style={styles.body}>
            <ThemedText variant="subheading" color="textBright">
              {title}
            </ThemedText>
            <ThemedText variant="caption" color="textDim" numberOfLines={2}>
              {subtitle}
            </ThemedText>
          </View>
          {trailing}
        </View>
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#232837',
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderLeftWidth: 3,
  },
  iconPlate: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  body: {
    flex: 1,
    gap: 2,
  },
});
