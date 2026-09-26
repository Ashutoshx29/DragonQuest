import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Input, Sheet } from '@/design-system/components';
import { spacing } from '@/design-system/tokens';

interface WorkoutLogSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (workout: { title: string; payload: Record<string, unknown> }) => void;
  saving?: boolean;
}

/**
 * Quick Physical Training log: name + optional sets/reps/notes. Kept to one
 * screen so logging takes under 20 seconds — the reward overlay does the
 * motivating; this just captures the facts.
 */
export function WorkoutLogSheet({ visible, onClose, onSave, saving }: WorkoutLogSheetProps) {
  const [title, setTitle] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [notes, setNotes] = useState('');

  const save = () => {
    const name = title.trim();
    if (!name) return;
    onSave({
      title: name,
      payload: {
        sets: sets.trim() || undefined,
        reps: reps.trim() || undefined,
        notes: notes.trim() || undefined,
      },
    });
    setTitle('');
    setSets('');
    setReps('');
    setNotes('');
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Log Physical Training">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Workout" placeholder="e.g. Morning push-ups" value={title} onChangeText={setTitle} />
        <View style={styles.row}>
          <Input label="Sets" placeholder="3" value={sets} onChangeText={setSets} keyboardType="number-pad" style={styles.half} />
          <Input label="Reps" placeholder="12" value={reps} onChangeText={setReps} keyboardType="number-pad" style={styles.half} />
        </View>
        <Input label="Notes (optional)" placeholder="How did it feel?" value={notes} onChangeText={setNotes} multiline />
        <Button label="Complete training · +50 XP" icon="barbell" onPress={save} loading={saving} disabled={!title.trim()} />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
});
