import { ColorValue, StyleProp, View, ViewProps, ViewStyle } from 'react-native';

import { useAppTheme, Theme } from '../theme';

type Surface = 'bg' | 'surface' | 'elevated' | 'sunken';

interface ThemedViewProps extends ViewProps {
  surface?: Surface;
}

const surfaceColorByRole: Record<Surface, keyof Theme> = {
  bg: 'bg',
  surface: 'surface',
  elevated: 'surfaceElevated',
  sunken: 'surfaceSunken',
};

export function ThemedView({ surface = 'bg', style, ...rest }: ThemedViewProps) {
  const theme = useAppTheme();
  const backgroundColor: ColorValue = theme[surfaceColorByRole[surface]];
  const backgroundStyle: StyleProp<ViewStyle> = { backgroundColor };
  return <View {...rest} style={[backgroundStyle, style]} />;
}
