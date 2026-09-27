import { DarkTheme, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { Stack } from 'expo-router/js-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { APP_NAME } from '@/constants';
import { DbGate } from '@/data/db/DbGate';
import { SplashGate } from '@/design-system/components';
import { palette } from '@/design-system/tokens';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { getSettings } from '@/data/repositories';
import { DevPerfBadge, setDevPerfVisible } from '@/services/devPerf';
import { useSyncTriggers } from '@/services/sync/syncTriggers';
import { ProgressionProvider } from '@/features/progression/ProgressionProvider';

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

/** Root-level side effects that need auth + progression contexts. */
function AppEffects() {
  useSyncTriggers();

  // F: dev-only FPS badge — restore the persisted toggle once at startup;
  // the badge itself subscribes to live changes from Settings. Release
  // builds never render it (__DEV__ gate inside the component).
  useEffect(() => {
    if (!__DEV__) return;
    let alive = true;
    void getSettings().then((s) => {
      if (alive) setDevPerfVisible(s.devPerfBadge);
    });
    return () => {
      alive = false;
    };
  }, []);
  return <DevPerfBadge />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <DbGate>
          <SplashGate>
            <AuthProvider>
              <ProgressionProvider>
                <AppEffects />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    cardStyle: { backgroundColor: palette.void },
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ title: APP_NAME }} />
                  <Stack.Screen name="(auth)/sign-in" />
                  <Stack.Screen name="settings" />
                  <Stack.Screen name="+not-found" />
                </Stack>
              </ProgressionProvider>
            </AuthProvider>
          </SplashGate>
        </DbGate>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
