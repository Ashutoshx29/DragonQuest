import { Screen } from '@/design-system/components/Screen';
import { ThemedText } from '@/design-system/components/ThemedText';

/**
 * Progress — statistics, achievements, and history. Arrives in Phase 5.
 */
export default function ProgressScreen() {
  return (
    <Screen padded>
      <ThemedText variant="display" color="textBright">
        Progress
      </ThemedText>
      <ThemedText variant="body" color="textDim">
        Stats, achievements, and history will appear here.
      </ThemedText>
    </Screen>
  );
}
