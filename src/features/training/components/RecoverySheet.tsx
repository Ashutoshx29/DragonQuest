import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { palette, radius, spacing } from '@/design-system/tokens';
import { Button, Sheet, ThemedText } from '@/design-system/components';
import { haptic } from '@/services/haptics';
import { RECOVERY_OPTIONS_SEC } from '@/game/config/training';
import { BREATHING_PATTERNS } from '@/game/config/breathing';

import type { BreathPattern } from '@/game/config/breathing';

interface RecoverySheetProps {
  visible: boolean;
  /** Pattern already chosen before the sheet opened (setup selection). */
  initialPatternId: BreathPattern['id'] | null;
  /** Focus minutes just completed — shown as context. */
  focusMinutes: number;
  onBegin: (durationSec: number, pattern: BreathPattern | null) => void;
  onClose: () => void;
}

/**
 * RECOVERY CHOICE — offered once after a focus session completes.
 * Skip is a first-class option (never forced); 2 or 5 minutes continue the
 * SAME session flow using the same timestamp-timer principles. A breathing
 * pattern is picked in the same sheet so the recovery is one tap to start.
 */
export function RecoverySheet({ visible, initialPatternId, focusMinutes, onBegin, onClose }: RecoverySheetProps) {
  const [durationSec, setDurationSec] = useState<number>(0);
  const [patternId, setPatternId] = useState<BreathPattern['id'] | null>(initialPatternId);
  // Reset-on-open via render-time state adaptation — see FocusSetupSheet.
  const [seed, setSeed] = useState<{ focusMinutes: number; patternId: BreathPattern['id'] | null }>({
    focusMinutes,
    patternId: initialPatternId,
  });
  if (visible && (seed.focusMinutes !== focusMinutes || seed.patternId !== initialPatternId)) {
    setSeed({ focusMinutes, patternId: initialPatternId });
    setDurationSec(0);
    setPatternId(initialPatternId);
  }

  const pattern = patternId ? BREATHING_PATTERNS.find((p) => p.id === patternId) ?? null : null;

  const choose = (sec: number) => {
    haptic('tap');
    setDurationSec(sec);
  };

  const begin = () => {
    haptic('tap');
    if (durationSec > 0) {
      onBegin(durationSec, pattern);
    } else {
      onClose(); // Skip recovery — straight to the completion summary
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="RECOVERY">
      <ThemedText variant="caption" color="textDim" style={styles.context}>
        {`${focusMinutes} min focus complete — recover to lock it in`}
      </ThemedText>

      <View style={styles.optionRow}>
        {RECOVERY_OPTIONS_SEC.map((sec) => {
          const selected = durationSec === sec;
          const label = sec === 0 ? 'SKIP' : `${sec / 60} MIN`;
          return (
            <Pressable
              key={sec}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={sec === 0 ? 'Skip recovery' : `${sec / 60} minute recovery`}
              onPress={() => choose(sec)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <ThemedText variant="subheading" color={selected ? 'textBright' : 'textDim'} style={{ fontVariant: ['tabular-nums'] }}>
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Breathing pattern — only meaningful for a timed recovery */}
      {durationSec > 0 ? (
        <>
          <ThemedText variant="caption" color="textDim" style={styles.sectionLabel}>
            BREATHING PATTERN
          </ThemedText>
          <View style={styles.optionRow}>
            {BREATHING_PATTERNS.map((p) => {
              const selected = patternId === p.id;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${p.label}: ${p.description}`}
                  onPress={() => {
                    haptic('tap');
                    setPatternId(p.id);
                  }}
                  style={[styles.option, styles.patternOption, selected && styles.optionSelected]}
                >
                  <ThemedText variant="label" color={selected ? 'textBright' : 'textDim'}>
                    {p.label.toUpperCase()}
                  </ThemedText>
                  <ThemedText variant="caption" color="textFaint" numberOfLines={1}>
                    {p.description}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Button
        label={durationSec === 0 ? 'CONTINUE →' : `⚡ BEGIN ${durationSec / 60} MIN RECOVERY`}
        size="lg"
        onPress={begin}
        icon={durationSec === 0 ? undefined : 'water'}
        accessibilityHint={
          durationSec === 0
            ? 'Skips recovery and shows the session summary'
            : 'Starts the timed recovery phase'
        }
      />
      <Button label="Stay on the summary" size="sm" variant="ghost" onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  context: {
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    minHeight: 64,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    backgroundColor: palette.slate,
  },
  optionSelected: {
    borderColor: palette.attrEnergy,
    backgroundColor: palette.energyDim,
  },
  patternOption: {
    minHeight: 72,
  },
  sectionLabel: {
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
});
