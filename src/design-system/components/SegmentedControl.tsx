import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { haptic } from '@/services/haptics';

import { useAppTheme } from '../theme';
import { radius, spacing } from '../tokens';
import { ThemedText } from './ThemedText';

interface SegmentedControlProps<T extends string | number> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const theme = useAppTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.surfaceSunken }, style]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => {
              haptic('tap');
              onChange(option.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.segment,
              {
                backgroundColor: active ? theme.surfaceElevated : 'transparent',
                borderRadius: radius.sm,
              },
            ]}
          >
            <ThemedText
              variant="label"
              style={{
                color: active ? theme.accent : theme.textDim,
                textAlign: 'center',
              }}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 2,
    gap: spacing.xxs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
});
