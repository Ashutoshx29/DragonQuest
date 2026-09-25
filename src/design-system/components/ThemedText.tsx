import { Text, TextProps, StyleSheet, StyleProp, TextStyle } from 'react-native';

import { useAppTheme, Theme } from '../theme';
import { typography } from '../tokens';

type TextVariant = keyof typeof typography;
type TextColor = keyof Pick<
  Theme,
  'text' | 'textBright' | 'textDim' | 'textFaint' | 'accent' | 'gold' | 'power' | 'success' | 'danger'
>;

interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
  color?: TextColor;
}

const styles = StyleSheet.create({
  base: {},
});

export function ThemedText({ variant = 'body', color = 'text', style, ...rest }: ThemedTextProps) {
  const theme = useAppTheme();
  const variantStyle: StyleProp<TextStyle> = typography[variant];
  return <Text {...rest} style={[styles.base, variantStyle, { color: theme[color] }, style]} />;
}
