import { Modal, ModalProps, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useAppTheme } from '../theme';
import { palette, radius, spacing } from '../tokens';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface SheetProps extends Pick<ModalProps, 'onRequestClose'> {
  visible: boolean;
  onClose: () => void;
  /** Optional centered title row */
  title?: string;
  /** Optional leading action (e.g. back button) */
  headerLeft?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Bottom sheet built on RN Modal — no extra native deps.
 * Backdrop tap and hardware back both route through onRequestClose or onClose.
 */
export function Sheet({ visible, onClose, onRequestClose, title, headerLeft, children, style }: SheetProps) {
  const theme = useAppTheme();
  const handleDismiss = onRequestClose ?? onClose;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss sheet"
        />
        <ThemedView
          surface="surface"
          style={[styles.panel, { borderColor: theme.border }, style]}
        >
          <View style={[styles.handle, { backgroundColor: palette.graphite }]} />
          {title || headerLeft ? (
            <View style={headerLeft ? styles.headerWithLeft : styles.header}>
              {headerLeft ? <View style={styles.headerLeft}>{headerLeft}</View> : null}
              {title ? (
                <ThemedText variant="subheading" color="textBright" style={headerLeft ? styles.headerTitleWithLeft : undefined}>
                  {title}
                </ThemedText>
              ) : null}
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
    maxHeight: '90%',
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
    justifyContent: 'center',
    minHeight: 44,
  },
  headerWithLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  headerLeft: {
    marginLeft: -spacing.xs,
  },
  headerTitleWithLeft: {
    flex: 1,
  },
});
