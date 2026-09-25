import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  Input,
  Screen,
  SegmentedControl,
  ThemedText,
} from '@/design-system/components';
import { questPalettes, radius, spacing } from '@/design-system/tokens';
import { DIFFICULTY_LABELS, DIFFICULTY_LEVELS } from '@/game/config/xp';
import { WEEKDAY_CHIPS, type HabitSchedule } from '@/lib/schedule';
import { haptic } from '@/services/haptics';

import type { HabitRow } from '@/data/repositories';

export interface HabitFormResult {
  name: string;
  notes: string | null;
  difficulty: number;
  schedule: HabitSchedule;
  color: string;
}

const COLOR_OPTIONS = Object.entries(questPalettes).map(([key, p]) => ({
  key,
  base: p.base,
}));

interface HabitFormProps {
  initial?: HabitRow;
  submitLabel: string;
  onSubmit: (input: HabitFormResult) => Promise<void> | void;
  onArchive?: () => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

export function HabitForm({ initial, submitLabel, onSubmit, onArchive, onDelete }: HabitFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [difficulty, setDifficulty] = useState(String(initial?.difficulty ?? 3));
  const [scheduleType, setScheduleType] = useState<'daily' | 'days'>(
    initial?.schedule.type === 'days' ? 'days' : 'daily'
  );
  const [days, setDays] = useState<number[]>(initial?.schedule.type === 'days' ? initial.schedule.days : []);
  const [color, setColor] = useState(initial?.color ?? questPalettes.mind.base);
  const [saving, setSaving] = useState(false);

  const toggleDay = (value: number) => {
    haptic('tap');
    setDays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]));
  };

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your quest a name first.');
      return;
    }
    if (scheduleType === 'days' && days.length === 0) {
      Alert.alert('Pick days', 'Select at least one day for a custom schedule.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name,
        notes: notes.trim() ? notes : null,
        difficulty: Number(difficulty),
        schedule: scheduleType === 'daily' ? { type: 'daily' } : { type: 'days', days },
        color,
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete quest?', 'This also removes its completion history. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void onDelete?.() },
    ]);
  };

  return (
    <Screen padded>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input
          label="Quest name"
          placeholder="e.g. Morning training"
          value={name}
          onChangeText={setName}
          autoFocus={!initial}
        />
        <Input
          label="Notes"
          placeholder="Optional details…"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <View style={styles.field}>
          <ThemedText variant="label" color="textDim">
            Difficulty
          </ThemedText>
          <SegmentedControl
            options={DIFFICULTY_LEVELS.map((d) => ({
              label: String(d),
              value: String(d),
            }))}
            value={difficulty}
            onChange={setDifficulty}
          />
          <ThemedText variant="caption" color="textFaint">
            {DIFFICULTY_LABELS[Number(difficulty) as 1 | 2 | 3 | 4 | 5]}
          </ThemedText>
        </View>

        <View style={styles.field}>
          <ThemedText variant="label" color="textDim">
            Schedule
          </ThemedText>
          <SegmentedControl
            options={[
              { label: 'Every day', value: 'daily' },
              { label: 'Custom days', value: 'days' },
            ]}
            value={scheduleType}
            onChange={setScheduleType}
          />
          {scheduleType === 'days' ? (
            <View style={styles.chipsRow}>
              {WEEKDAY_CHIPS.map((chip) => {
                const active = days.includes(chip.value);
                return (
                  <Pressable
                    key={chip.value}
                    onPress={() => toggleDay(chip.value)}
                    accessibilityRole="button"
                    accessibilityLabel={chip.label}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? color : 'transparent', borderColor: active ? color : '#2C3242' },
                    ]}
                  >
                    <ThemedText variant="label" style={{ color: active ? '#07080C' : '#8B93A7' }}>
                      {chip.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.field}>
          <ThemedText variant="label" color="textDim">
            Aura color
          </ThemedText>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => {
                  haptic('tap');
                  setColor(option.base);
                }}
                accessibilityRole="button"
                accessibilityLabel={option.key}
                style={[
                  styles.colorDot,
                  { backgroundColor: option.base, borderColor: color === option.base ? '#F4F6FB' : 'transparent' },
                ]}
              />
            ))}
          </View>
        </View>

        <Button label={submitLabel} icon="checkmark" onPress={submit} loading={saving} />

        {onArchive ? (
          <Button label="Archive" variant="secondary" icon="archive" onPress={() => void onArchive?.()} />
        ) : null}
        {onDelete ? (
          <Button label="Delete" variant="danger" icon="trash" onPress={confirmDelete} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
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
  colorRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: radius.round,
    borderWidth: 3,
  },
});
