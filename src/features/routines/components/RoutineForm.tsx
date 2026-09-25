import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Input, Screen, SegmentedControl, ThemedText } from '@/design-system/components';
import { radius, spacing } from '@/design-system/tokens';
import { WEEKDAY_CHIPS } from '@/lib/schedule';
import { haptic } from '@/services/haptics';

import type { RoutineRow } from '@/data/repositories';

export interface RoutineFormResult {
  name: string;
  timeOfDay: string;
  activeDays: number[];
}

const TIME_OPTIONS = [
  { label: 'Morning', value: 'morning' },
  { label: 'Midday', value: 'afternoon' },
  { label: 'Evening', value: 'evening' },
  { label: 'Anytime', value: 'anytime' },
];

interface RoutineFormFieldsProps {
  initial?: RoutineRow;
  submitLabel: string;
  onSubmit: (input: RoutineFormResult) => Promise<void> | void;
  onArchive?: () => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

/**
 * Bare form fields (no Screen/ScrollView) — composable into screens that
 * render additional sections, e.g. the routine detail's steps editor.
 */
export function RoutineFormFields({
  initial,
  submitLabel,
  onSubmit,
  onArchive,
  onDelete,
}: RoutineFormFieldsProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [timeOfDay, setTimeOfDay] = useState(initial?.timeOfDay ?? 'morning');
  const [activeDays, setActiveDays] = useState<number[]>(
    initial?.activeDays ?? [0, 1, 2, 3, 4, 5, 6]
  );
  const [saving, setSaving] = useState(false);

  const toggleDay = (value: number) => {
    haptic('tap');
    setActiveDays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  };

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your routine a name first.');
      return;
    }
    if (activeDays.length === 0) {
      Alert.alert('Pick days', 'Select at least one active day.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ name, timeOfDay, activeDays });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete routine?', 'Checklist items are removed too. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void onDelete?.() },
    ]);
  };

  return (
    <View style={styles.content}>
      <Input
        label="Routine name"
        placeholder="e.g. Morning ritual"
        value={name}
        onChangeText={setName}
      />

      <View style={styles.field}>
        <ThemedText variant="label" color="textDim">
          Time of day
        </ThemedText>
        <SegmentedControl options={TIME_OPTIONS} value={timeOfDay} onChange={setTimeOfDay} />
      </View>

      <View style={styles.field}>
        <ThemedText variant="label" color="textDim">
          Active days
        </ThemedText>
        <View style={styles.chipsRow}>
          {WEEKDAY_CHIPS.map((chip) => {
            const active = activeDays.includes(chip.value);
            return (
              <Pressable
                key={chip.value}
                onPress={() => toggleDay(chip.value)}
                accessibilityRole="button"
                accessibilityLabel={chip.label}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? '#00E5FF' : 'transparent',
                    borderColor: active ? '#00E5FF' : '#2C3242',
                  },
                ]}
              >
                <ThemedText variant="label" style={{ color: active ? '#07080C' : '#8B93A7' }}>
                  {chip.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button label={submitLabel} icon="checkmark" onPress={submit} loading={saving} />

      {onArchive ? (
        <Button label="Archive" variant="secondary" icon="archive" onPress={() => void onArchive?.()} />
      ) : null}
      {onDelete ? <Button label="Delete" variant="danger" icon="trash" onPress={confirmDelete} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: radius.round,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/** Standalone create/edit form used by the "new routine" flow. */
export function RoutineForm({ submitLabel, onSubmit }: Omit<RoutineFormFieldsProps, 'initial' | 'onArchive' | 'onDelete'>) {
  return (
    <Screen padded>
      <ScrollView contentContainerStyle={scrollStyle.scroll} keyboardShouldPersistTaps="handled">
        <RoutineFormFields submitLabel={submitLabel} onSubmit={onSubmit} />
      </ScrollView>
    </Screen>
  );
}

const scrollStyle = StyleSheet.create({
  scroll: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
