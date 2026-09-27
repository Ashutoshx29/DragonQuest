import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button, IconButton, Input, Sheet } from '@/design-system/components';
import { spacing } from '@/design-system/tokens';
import { hasWorkoutInput } from '@/game/engine/workout';

export { hasWorkoutInput };

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
 *
 * Navigation:
 * - Visible ← back button always accessible at top left.
 * - If clean (no input): returns immediately without confirmation.
 * - If partial input: prompts with "Discard workout?" before leaving.
 * - "Keep Editing": preserves all entered fields.
 * - "Discard": closes without saving, awarding XP, or completing sessions.
 * - Android system back and backdrop tap follow the same safe exit flow.
 */
export function WorkoutLogSheet({ visible, onClose, onSave, saving }: WorkoutLogSheetProps) {
  const [title, setTitle] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [notes, setNotes] = useState('');
  const [prevVisible, setPrevVisible] = useState(visible);

  // Reset inputs when the sheet closes (standard React pattern for adjusting state on prop changes).
  // Keeping inputs during save ensures that if a persistence error occurs, user data is preserved.
  if (prevVisible !== visible) {
    setPrevVisible(visible);
    if (!visible) {
      setTitle('');
      setSets('');
      setReps('');
      setNotes('');
    }
  }

  const hasInput = hasWorkoutInput({ title, sets, reps, notes });

  const handleBack = () => {
    if (saving) return;
    if (!hasInput) {
      onClose();
      return;
    }
    Alert.alert('Discard workout?', 'Your entered workout data will be lost.', [
      { text: 'Keep Editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: onClose,
      },
    ]);
  };

  const save = () => {
    const name = title.trim();
    if (!name || saving) return;
    onSave({
      title: name,
      payload: {
        sets: sets.trim() || undefined,
        reps: reps.trim() || undefined,
        notes: notes.trim() || undefined,
      },
    });
  };

  return (
    <Sheet
      visible={visible}
      onClose={handleBack}
      onRequestClose={handleBack}
      headerLeft={
        <IconButton
          icon="arrow-back"
          label="Back"
          color="text"
          size={22}
          disabled={saving}
          onPress={handleBack}
        />
      }
      title="Log Physical Training"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Input label="Workout" placeholder="e.g. Morning push-ups" value={title} onChangeText={setTitle} />
          <View style={styles.row}>
            <Input label="Sets" placeholder="3" value={sets} onChangeText={setSets} keyboardType="number-pad" containerStyle={styles.half} />
            <Input label="Reps" placeholder="12" value={reps} onChangeText={setReps} keyboardType="number-pad" containerStyle={styles.half} />
          </View>
          <Input label="Notes (optional)" placeholder="How did it feel?" value={notes} onChangeText={setNotes} multiline />
          <Button label="Complete training · +50 XP" icon="barbell" onPress={save} loading={saving} disabled={!title.trim() || saving} />
        </ScrollView>
      </KeyboardAvoidingView>
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
