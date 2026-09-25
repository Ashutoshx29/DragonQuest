import { StyleSheet } from 'react-native';

import { APP_TAGLINE } from '@/constants';
import { Screen } from '@/design-system/components/Screen';
import { ThemedText } from '@/design-system/components/ThemedText';
import { ThemedView } from '@/design-system/components/ThemedView';
import { radius, spacing } from '@/design-system/tokens';

/**
 * Today — the daily dashboard. Will host the daily mission board,
 * streak status, and quick-complete habit list in Phase 3–4.
 */
export default function TodayScreen() {
  return (
    <Screen padded>
      <ThemedText variant="display" color="textBright">
        Today
      </ThemedText>
      <ThemedText variant="label" color="textDim">
        {APP_TAGLINE}
      </ThemedText>

      <ThemedView surface="surface" style={styles.card}>
        <ThemedText variant="heading" color="accent">
          ⚡ Training begins soon
        </ThemedText>
        <ThemedText variant="body" color="textDim">
          Daily missions, streaks, and your quest board will appear here.
        </ThemedText>
      </ThemedView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#2C3242',
    padding: spacing.xl,
    gap: spacing.sm,
  },
});
