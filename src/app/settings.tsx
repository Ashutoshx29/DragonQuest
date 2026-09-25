import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button, Card, Screen, ThemedText } from '@/design-system/components';
import { spacing } from '@/design-system/tokens';
import { getSettings, setSetting, type SettingsShape } from '@/data/repositories';
import { setHapticsEnabled } from '@/services/haptics';
import { sfx } from '@/services/audio';

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setLocal] = useState<SettingsShape | null>(null);

  useEffect(() => {
    void getSettings().then(setLocal);
  }, []);

  const update = useCallback(
    async (key: keyof SettingsShape, value: boolean) => {
      setLocal((prev) => (prev ? { ...prev, [key]: value } : prev));
      await setSetting(key, value);
      if (key === 'haptics') setHapticsEnabled(value);
      if (key === 'sound') sfx.setEnabled(value);
    },
    []
  );

  return (
    <Screen padded>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText variant="display" color="textBright">
          Settings
        </ThemedText>

        <Card>
          <View style={styles.rowBetween}>
            <View style={styles.rowText}>
              <ThemedText variant="subheading" color="textBright">
                Sound effects
              </ThemedText>
              <ThemedText variant="caption" color="textDim">
                Completion chimes, XP ticks, ceremonies
              </ThemedText>
            </View>
            <Switch
              value={settings?.sound ?? true}
              onValueChange={(v) => void update('sound', v)}
              trackColor={{ true: '#00E5FF', false: '#232837' }}
            />
          </View>
          <View style={styles.rowBetween}>
            <View style={styles.rowText}>
              <ThemedText variant="subheading" color="textBright">
                Haptic feedback
              </ThemedText>
              <ThemedText variant="caption" color="textDim">
                Vibration on completions and level-ups
              </ThemedText>
            </View>
            <Switch
              value={settings?.haptics ?? true}
              onValueChange={(v) => void update('haptics', v)}
              trackColor={{ true: '#00E5FF', false: '#232837' }}
            />
          </View>
        </Card>

        <Card>
          <View style={styles.rowText}>
            <ThemedText variant="subheading" color="textBright">
              Cloud sync
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              Arrives in Phase 7 — your data will sync across devices with a free account.
            </ThemedText>
          </View>
        </Card>

        <Button label="Back" variant="secondary" icon="arrow-back" onPress={() => router.back()} style={styles.back} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  back: {
    alignSelf: 'flex-start',
  },
});
