import { Pressable, StyleSheet, View } from 'react-native';

import { palette, radius, spacing } from '@/design-system/tokens';
import { IconButton, Sheet, ThemedText } from '@/design-system/components';
import { CharacterAvatar } from '@/design-system/components/CharacterAvatar';
import { haptic } from '@/services/haptics';

import type { Stage } from '@/design-system/components/CharacterAvatar';

interface AvatarPickerSheetProps {
  visible: boolean;
  current: Stage;
  onSelect: (stage: Stage) => void;
  onClose: () => void;
}

const OPTIONS: { value: Stage; label: string; hint: string; accent: string }[] = [
  { value: 'ember', label: 'Ember', hint: 'Orange power aura', accent: palette.power },
  { value: 'aura', label: 'Aura', hint: 'Electric cyan aura', accent: palette.aura },
  { value: 'gold', label: 'Gold', hint: 'Champion gold aura', accent: palette.gold },
];

/**
 * AVATAR PICKER — choose the character's aura stage. Three options rendered
 * with the SAME CharacterAvatar used everywhere identity is shown, so what
 * you pick is exactly what you get. One tap selects and saves; the sheet is
 * purely the chooser (no extra confirm step to get wrong).
 */
export function AvatarPickerSheet({ visible, current, onSelect, onClose }: AvatarPickerSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title="CHOOSE YOUR AURA">
      <View style={styles.grid}>
        {OPTIONS.map((option) => {
          const selected = option.value === current;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Avatar ${option.label} — ${option.hint}`}
              onPress={() => {
                haptic('tap');
                onSelect(option.value);
              }}
              style={[styles.option, selected && { borderColor: option.accent }]}
            >
              <CharacterAvatar size={72} stage={option.value} />
              <ThemedText variant="subheading" color="textBright">
                {option.label}
              </ThemedText>
              <ThemedText variant="caption" color="textDim" style={styles.hint}>
                {option.hint}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <ThemedText variant="caption" color="textFaint" style={styles.footerNote}>
          Your aura is saved on this device and shown across the app.
        </ThemedText>
        <IconButton icon="checkmark" label="Done" color="accent" onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 160,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    backgroundColor: palette.slate,
  },
  hint: {
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  footerNote: {
    flex: 1,
  },
});
