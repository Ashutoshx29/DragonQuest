import { StyleSheet, View } from 'react-native';

import { spacing, palette } from '@/design-system/tokens';
import { Button, Sheet, ThemedText } from '@/design-system/components';

interface PhaseResult {
  label: string;
  minutes: number;
  xp: number;
}

interface SessionSummarySheetProps {
  visible: boolean;
  focus: PhaseResult | null;
  recovery: PhaseResult | null;
  /** Breathing pattern label used during recovery ('Coherent' etc.), if any. */
  breathingLabel: string | null;
  onDismiss: () => void;
}

/**
 * SESSION COMPLETE summary — one sheet, three rows, one total.
 * Every number comes from the repository's returned sessions (already
 * computed by the single XP formula); nothing is recomputed or estimated
 * here. Visually rewarding through hierarchy and the gold XP total — no
 * extra confetti layers.
 */
export function SessionSummarySheet({
  visible,
  focus,
  recovery,
  breathingLabel,
  onDismiss,
}: SessionSummarySheetProps) {
  const totalXp = (focus?.xp ?? 0) + (recovery?.xp ?? 0);
  const totalMin = (focus?.minutes ?? 0) + (recovery?.minutes ?? 0);

  return (
    <Sheet visible={visible} onClose={onDismiss} title="SESSION COMPLETE">
      <View style={styles.rows}>
        {focus ? (
          <View style={styles.row}>
            <ThemedText variant="body" color="textBright">
              Focus
            </ThemedText>
            <View style={styles.right}>
              <ThemedText variant="mono" color="textDim" style={{ fontVariant: ['tabular-nums'] }}>
                {focus.minutes}:00
              </ThemedText>
              <ThemedText variant="mono" color="gold" style={styles.xp}>
                {`+${focus.xp} XP`}
              </ThemedText>
            </View>
          </View>
        ) : null}
        {recovery ? (
          <View style={styles.row}>
            <ThemedText variant="body" color="textBright">
              {recovery.label}
            </ThemedText>
            <View style={styles.right}>
              <ThemedText variant="mono" color="textDim" style={{ fontVariant: ['tabular-nums'] }}>
                {recovery.minutes}:00
              </ThemedText>
              {breathingLabel ? (
                <ThemedText variant="caption" color="textFaint">
                  {breathingLabel}
                </ThemedText>
              ) : null}
              <ThemedText variant="mono" color="gold" style={styles.xp}>
                {`+${recovery.xp} XP`}
              </ThemedText>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.totalRow}>
        <ThemedText variant="subheading" color="textDim">
          {`${totalMin} MIN TRAINED`}
        </ThemedText>
        <ThemedText variant="title" color="gold" style={styles.totalXp}>
          {`+${totalXp} XP`}
        </ThemedText>
      </View>

      <Button label="CONTINUE" size="lg" onPress={onDismiss} accessibilityHint="Closes the session summary" />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  rows: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  xp: {
    fontVariant: ['tabular-nums'],
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  totalXp: {
    fontVariant: ['tabular-nums'],
  },
});
