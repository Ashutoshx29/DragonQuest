import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Button, Screen, ThemedText } from '@/design-system/components';
import { spacing } from '@/design-system/tokens';

/**
 * Settings — sound/haptics/theme toggles arrive in Phase 5.
 */
export default function SettingsScreen() {
  const router = useRouter();

  return (
    <Screen padded>
      <ThemedText variant="display" color="textBright">
        Settings
      </ThemedText>
      <ThemedText variant="body" color="textDim">
        Sound, haptics, and theme options will appear here.
      </ThemedText>

      <Button
        label="Back"
        icon="arrow-back"
        variant="secondary"
        onPress={() => router.back()}
        style={styles.back}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignSelf: 'flex-start',
    marginTop: spacing.xl,
  },
});
