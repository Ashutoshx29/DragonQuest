import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { BottomTabNavigationOptions } from 'expo-router/js-tabs';

import { auraTheme } from '@/design-system/theme';
import { palette } from '@/design-system/tokens';

/**
 * Training-RPG navigation: HOME · TRAINING · JOURNAL · PROGRESS · PROFILE.
 * The full mission board lives at /missions (reached from Home/Training).
 */
const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'flash',
  training: 'barbell',
  journal: 'book',
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
      <Tabs.Screen name="index" options={tabScreenOptions('Home', TAB_ICONS.index)} />
      <Tabs.Screen name="training" options={tabScreenOptions('Training', TAB_ICONS.training)} />
      <Tabs.Screen name="journal" options={tabScreenOptions('Journal', TAB_ICONS.journal)} />
      <Tabs.Screen name="progress" options={tabScreenOptions('Progress', TAB_ICONS.progress)} />
      <Tabs.Screen name="profile" options={tabScreenOptions('Profile', TAB_ICONS.profile)} />
    </Tabs>
  );
}
