import { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { spacing } from '../tokens';
import { ThemedView } from './ThemedView';

interface ScreenProps {
  children: React.ReactNode;
  /** Add standard horizontal padding around content */
  padded?: boolean;
  /** Which safe-area edges to respect (default: top; the tab bar handles the bottom) */
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, padded = false, edges = ['top'], style }: ScreenProps) {
  return (
    <ThemedView style={[{ flex: 1 }, style]}>
      <SafeAreaView style={{ flex: 1 }} edges={edges}>
        <ThemedView style={[{ flex: 1 }, padded && { paddingHorizontal: spacing.lg }]}>
          {children}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}
