import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { BottomTabNavigationOptions } from 'expo-router/js-tabs';

import { TAB_ROUTES } from '@/constants';
import { auraTheme } from '@/design-system/theme';
import { palette } from '@/design-system/tokens';

/**
 * Icon name per tab — keys must match the route file names in src/app/(tabs)/.
 */
const TAB_ICONS: Record<(typeof TAB_ROUTES)[number], keyof typeof Ionicons.glyphMap> = {
  today: 'flash',
  quests: 'shield-checkmark',
  training: 'barbell',
  progress: 'stats-chart',
  profile: 'person',
};

function tabScreenOptions(title: string, iconName: keyof typeof Ionicons.glyphMap): BottomTabNavigationOptions {
  return {
    title,
    tabBarIcon: ({ color, size }) => <Ionicons name={iconName} size={size} color={color} />,
  };
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: auraTheme.bg },
        tabBarActiveTintColor: palette.aura,
        tabBarInactiveTintColor: palette.textDim,
        tabBarStyle: {
          backgroundColor: palette.night,
          borderTopColor: palette.line,
        },
      }}
    >
      <Tabs.Screen name="index" options={tabScreenOptions('Today', TAB_ICONS.today)} />
      <Tabs.Screen name="quests" options={tabScreenOptions('Quests', TAB_ICONS.quests)} />
      <Tabs.Screen name="training" options={tabScreenOptions('Training', TAB_ICONS.training)} />
      <Tabs.Screen name="progress" options={tabScreenOptions('Progress', TAB_ICONS.progress)} />
      <Tabs.Screen name="profile" options={tabScreenOptions('Profile', TAB_ICONS.profile)} />
    </Tabs>
  );
}
