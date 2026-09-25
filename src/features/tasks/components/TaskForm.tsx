import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Input, Screen, SegmentedControl, ThemedText } from '@/design-system/components';
import { spacing } from '@/design-system/tokens';
import { addDays, todayString } from '@/lib/dates';

import type { TaskRow } from '@/data/repositories';

export interface TaskFormResult {
  title: string;
  notes: string | null;
  dueDay: string | null;
  priority: number;
}

interface TaskFormProps {
  initial?: TaskRow;
  submitLabel: string;
  onSubmit: (input: TaskFormResult) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

export function TaskForm({ initial, submitLabel, onSubmit, onDelete }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [dueChoice, setDueChoice] = useState<'none' | 'today' | 'tomorrow'>(() => {
    if (initial?.dueDay === todayString()) return 'today';
    if (initial?.dueDay === addDays(todayString(), 1)) return 'tomorrow';
    return 'none';
  });
  const [priority, setPriority] = useState(String(initial?.priority ?? 2));
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your task a title first.');
      return;
    }
    setSaving(true);
    try {
      const dueDay =
        dueChoice === 'today' ? todayString() : dueChoice === 'tomorrow' ? addDays(todayString(), 1) : null;
      await onSubmit({ title, notes: notes.trim() ? notes : null, dueDay, priority: Number(priority) });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete task?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void onDelete?.() },
    ]);
  };

  return (
    <Screen padded>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Task" placeholder="e.g. Stretch 10 minutes" value={title} onChangeText={setTitle} autoFocus={!initial} />
        <Input label="Notes" placeholder="Optional details…" value={notes} onChangeText={setNotes} multiline />

        <View style={styles.field}>
          <ThemedText variant="label" color="textDim">
            Due
          </ThemedText>
          <SegmentedControl
            options={[
              { label: 'Someday', value: 'none' },
              { label: 'Today', value: 'today' },
              { label: 'Tomorrow', value: 'tomorrow' },
            ]}
            value={dueChoice}
            onChange={setDueChoice}
          />
        </View>

        <View style={styles.field}>
          <ThemedText variant="label" color="textDim">
            Priority
          </ThemedText>
          <SegmentedControl
            options={[
              { label: 'Low', value: '0' },
              { label: 'Normal', value: '2' },
              { label: 'High', value: '1' },
            ]}
            value={priority}
            onChange={setPriority}
          />
        </View>

        <Button label={submitLabel} icon="checkmark" onPress={submit} loading={saving} />
        {onDelete ? <Button label="Delete" variant="danger" icon="trash" onPress={confirmDelete} /> : null}
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
});
