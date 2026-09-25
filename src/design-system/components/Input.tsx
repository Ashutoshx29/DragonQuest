import { StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

import { useAppTheme } from '../theme';
import { radius, spacing } from '../tokens';
import { ThemedText } from './ThemedText';

interface InputProps extends TextInputProps {
  label: string;
  hint?: string;
  multiline?: boolean;
  containerStyle?: ViewStyle;
}

export function Input({ label, hint, multiline = false, containerStyle, style, ...rest }: InputProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      <ThemedText variant="label" color="textDim">
        {label}
      </ThemedText>
      <TextInput
        {...rest}
        multiline={multiline}
        placeholderTextColor={theme.textFaint}
        style={[
          styles.input,
          {
            color: theme.textBright,
            borderColor: theme.border,
            backgroundColor: theme.surfaceSunken,
            minHeight: multiline ? 80 : 48,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
      />
      {hint ? (
        <ThemedText variant="caption" color="textFaint">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
});
