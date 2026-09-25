import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { spacing } from '../tokens';
import { ThemedText } from './ThemedText';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  style?: ViewStyle;
}

/** Friendly empty-state block for lists with nothing in them yet. */
export function EmptyState({ icon = 'sparkles', title, message, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name={icon} size={40} color="#5A6172" />
      <ThemedText variant="subheading" color="textBright">
        {title}
      </ThemedText>
      <ThemedText variant="caption" color="textDim">
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
});
