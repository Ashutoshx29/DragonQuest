import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

import { Screen } from '@/design-system/components/Screen';
import { ThemedText } from '@/design-system/components/ThemedText';
import { radius, spacing } from '@/design-system/tokens';

/**
 * Profile — character sheet, settings entry point. Full build in Phase 5–6.
 */
export default function ProfileScreen() {
  const router = useRouter();

  return (
    <Screen padded>
      <ThemedText variant="display" color="textBright">
        Profile
      </ThemedText>
      <ThemedText variant="body" color="textDim">
        Your character sheet will appear here.
      </ThemedText>

      <TouchableOpacity
        onPress={() => router.push('/settings')}
        style={{
          marginTop: spacing.xl,
          padding: spacing.lg,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: '#2C3242',
          alignItems: 'center',
        }}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
      >
        <ThemedText variant="subheading" color="accent">
          Settings
        </ThemedText>
      </TouchableOpacity>
    </Screen>
  );
}
