import { Screen } from '@/design-system/components/Screen';
import { ThemedText } from '@/design-system/components/ThemedText';

/**
 * Quests — habits, routines, and tasks. CRUD arrives in Phase 3.
 */
export default function QuestsScreen() {
  return (
    <Screen padded>
      <ThemedText variant="display" color="textBright">
        Quests
      </ThemedText>
      <ThemedText variant="body" color="textDim">
        Your habit board will appear here.
      </ThemedText>
    </Screen>
  );
}
