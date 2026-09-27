import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { palette, radius, spacing } from '@/design-system/tokens';
import { Button, Sheet, ThemedText } from '@/design-system/components';
import { haptic } from '@/services/haptics';
import {
  FOCUS_DURATION_LIMITS,
  FOCUS_DURATION_PRESETS_SEC,
  clampFocusDurationSec,
  computeTrainingXpPure,
  isValidFocusDurationSec,
} from '@/game/config/training';

import type { TrainingKind } from '@/data/repositories';

interface FocusSetupSheetProps {
  visible: boolean;
  /** Timed discipline being configured (focus or mind — never workout). */
  kind: TrainingKind;
  /** Minutes the sheet should open with (last used / preset default). */
  initialMinutes: number;
  onBegin: (durationSec: number) => void;
  onClose: () => void;
}

/**
 * FOCUS SESSION BUILDER — choose the length before the timer opens.
 * One decision per screen: presets as large chips, CUSTOM as a compact
 * − / value / + stepper (clamped to FOCUS_DURATION_LIMITS), XP preview from
 * the single formula, one dominant BEGIN CTA. The choice is remembered via
 * the settings KV (local-only, no new storage).
 */
export function FocusSetupSheet({ visible, kind, initialMinutes, onBegin, onClose }: FocusSetupSheetProps) {
  const [minutes, setMinutes] = useState(() => clampFocusDurationSec(initialMinutes * 60) / 60);
  const [customMode, setCustomMode] = useState(false);
  // Reset-on-open via render-time state adaptation (React "adjusting state
  // during render"): the parent keeps the sheet mounted while `visible`
  // flips, so re-seed when the seed input changes. No effect-setState.
  const [seed, setSeed] = useState(initialMinutes);
  if (visible && seed !== initialMinutes) {
    setSeed(initialMinutes);
    setMinutes(clampFocusDurationSec(initialMinutes * 60) / 60);
    setCustomMode(false);
  }

  const kindIsFocus = kind === 'focus';
  const accent = kindIsFocus ? palette.attrFocus : palette.attrMind;
  const kindLabel = kindIsFocus ? 'FOCUS TRAINING' : 'MIND TRAINING';

  const isValid = isValidFocusDurationSec(minutes * 60);
  const clampedSec = useMemo(() => clampFocusDurationSec(minutes * 60), [minutes]);
  const xpPreview = computeTrainingXpPure(kind, clampedSec);

  const selectMinutes = (m: number) => {
    haptic('tap');
    setCustomMode(false);
    setMinutes(m);
  };

  const enterCustom = () => {
    haptic('tap');
    setCustomMode(true);
  };

  const step = (delta: number) => {
    haptic('tap');
    setCustomMode(true);
    setMinutes((m) => clampFocusDurationSec((m + delta * FOCUS_DURATION_LIMITS.stepSec / 60) * 60) / 60);
  };

  const begin = () => {
    haptic('tap');
    onBegin(clampFocusDurationSec(minutes * 60));
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="CHOOSE YOUR TRAINING">
      <ThemedText variant="caption" style={{ color: accent, letterSpacing: 2, fontWeight: '800' }}>
        {kindLabel}
      </ThemedText>

      {/* Preset chips — large touch targets, 2 rows of grid chips */}
      <View style={styles.chipGrid}>
        {FOCUS_DURATION_PRESETS_SEC.map((sec) => {
          const m = sec / 60;
          const selected = !customMode && m === minutes;
          return (
            <Pressable
              key={sec}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Select ${m} minute session`}
              onPress={() => selectMinutes(m)}
              style={[styles.chip, selected && { borderColor: accent, backgroundColor: `${accent}1A` }]}
            >
              <ThemedText variant="subheading" color="textBright" style={{ fontVariant: ['tabular-nums'] }}>
                {m}
              </ThemedText>
              <ThemedText variant="caption" color="textDim">
                MIN
              </ThemedText>
            </Pressable>
          );
        })}

        {/* CUSTOM — either the active stepper or the entry chip */}
        {customMode ? (
          <View style={[styles.chip, styles.customStepper, { borderColor: accent }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease duration by one minute"
              onPress={() => step(-1)}
              style={styles.stepBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ThemedText variant="heading" color="textBright">
                −
              </ThemedText>
            </Pressable>
            <View style={styles.stepValue} accessibilityLiveRegion="polite">
              <ThemedText variant="subheading" color="textBright" style={{ fontVariant: ['tabular-nums'] }}>
                {minutes}
              </ThemedText>
              <ThemedText variant="caption" color="textDim">
                MIN
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase duration by one minute"
              onPress={() => step(1)}
              style={styles.stepBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ThemedText variant="heading" color="textBright">
                +
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enter a custom duration"
            onPress={enterCustom}
            style={styles.chip}
          >
            <ThemedText variant="subheading" color="textBright">
              CUSTOM
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              STEPPER
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* XP preview — the ONE formula, no UI-side math */}
      <ThemedText variant="caption" color="textDim" style={styles.xpPreview}>
        {isValid
          ? `${Math.round(clampedSec / 60)} min · +${xpPreview} ${kindIsFocus ? 'FOCUS' : 'MIND'} XP`
          : 'Choose between 5 and 90 minutes'}
      </ThemedText>

      <Button
        label={`⚡ BEGIN ${Math.round(minutes)} MIN`}
        size="lg"
        disabled={!isValid}
        onPress={begin}
        accessibilityHint="Starts the session timer with the selected duration"
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 64,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    backgroundColor: palette.slate,
  },
  customStepper: {
    flexDirection: 'row',
    flexBasis: '48%',
  },
  stepBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  stepValue: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    minWidth: 56,
  },
  xpPreview: {
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
