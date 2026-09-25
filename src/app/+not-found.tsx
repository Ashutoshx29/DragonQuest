import { Stack } from 'expo-router/js-stack';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/design-system/components/Screen';
import { ThemedText } from '@/design-system/components/ThemedText';
import { palette, radius, spacing } from '@/design-system/tokens';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen padded>
        <View style={styles.container}>
          <View style={styles.emblem} />
          <ThemedText variant="title" color="textBright">
            Lost in the void
          </ThemedText>
          <ThemedText variant="body" color="textDim">
            This screen doesn&apos;t exist.
          </ThemedText>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emblem: {
    width: 64,
    height: 64,
    borderRadius: radius.round,
    backgroundColor: palette.steel,
    marginBottom: spacing.sm,
  },
});
