import { Modal, ModalProps, StyleSheet, View, ViewStyle } from 'react-native';

import { useAppTheme } from '../theme';
import { palette, radius, spacing } from '../tokens';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface SheetProps extends Pick<ModalProps, 'onRequestClose'> {
  visible: boolean;
  onClose: () => void;
  /** Optional centered title row */
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Bottom sheet built on RN Modal — no extra native deps.
 * Backdrop tap and hardware back both call onClose.
 */
export function Sheet({ visible, onClose, title, children, style }: SheetProps) {
  const theme = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={StyleSheet.absoluteFill} />
        <ThemedView
          surface="surface"
          style={[styles.panel, { borderColor: theme.border }, style]}
        >
          <View style={[styles.handle, { backgroundColor: palette.graphite }]} />
          {title ? (
            <View style={styles.header}>
              <ThemedText variant="subheading" color="textBright">
                {title}
              </ThemedText>
            </View>
          ) : null}
          {children}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(4, 5, 8, 0.6)',
  },
  panel: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.round,
  },
  header: {
    alignItems: 'center',
  },
});
