import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/js-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { APP_NAME } from '@/constants';
import { DbGate } from '@/data/db/DbGate';
import { SplashGate } from '@/design-system/components';
import { palette } from '@/design-system/tokens';

/**
 * Navigation theme for react-navigation (tab bar, screen backgrounds),
 * derived from our design tokens so native chrome matches the app theme.
 */
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: palette.void,
    card: palette.night,
    primary: palette.aura,
    text: palette.textBright,
    border: palette.line,
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <DbGate>
          <SplashGate>
            <Stack
              screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: palette.void },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ title: APP_NAME }} />
              <Stack.Screen name="settings" />
              <Stack.Screen name="+not-found" />
            </Stack>
          </SplashGate>
        </DbGate>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
