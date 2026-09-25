import { Screen } from '@/design-system/components/Screen';
import { ThemedText } from '@/design-system/components/ThemedText';

/**
 * Training — time-boxed challenges and programs. Arrives in Phase 5.
 */
export default function TrainingScreen() {
  return (
    <Screen padded>
      <ThemedText variant="display" color="textBright">
        Training
      </ThemedText>
      <ThemedText variant="body" color="textDim">
        Challenge programs will appear here.
      </ThemedText>
    </Screen>
  );
}
