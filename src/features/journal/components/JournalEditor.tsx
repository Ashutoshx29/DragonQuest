import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Input, ThemedText } from '@/design-system/components';
import { palette, radius, spacing } from '@/design-system/tokens';
import { haptic } from '@/services/haptics';

import type { JournalDraft } from '../hooks/useJournal';
import type { JournalEntry } from '@/data/repositories';

interface JournalEditorProps {
  entry: JournalEntry | null;
  saving: boolean;
  onSave: (draft: JournalDraft) => void;
}

const RATINGS: { key: keyof Pick<JournalDraft, 'mood' | 'energy' | 'discipline'>; label: string; icon: string }[] = [
  { key: 'mood', label: 'Mood', icon: 'happy-outline' },
  { key: 'energy', label: 'Energy', icon: 'battery-charging-outline' },
  { key: 'discipline', label: 'Discipline', icon: 'shield-outline' },
];

const EMPTY: JournalDraft = {
  mood: null,
  energy: null,
  discipline: null,
  accomplished: '',
  challenged: '',
  learned: '',
  tomorrowIntent: '',
};

function draftFromEntry(entry: JournalEntry | null): JournalDraft {
  if (!entry) return EMPTY;
  return {
    mood: entry.mood,
    energy: entry.energy,
    discipline: entry.discipline,
    accomplished: entry.accomplished ?? '',
    challenged: entry.challenged ?? '',
    learned: entry.learned ?? '',
    tomorrowIntent: entry.tomorrowIntent ?? '',
  };
}

/**
 * The 60-second daily ritual: rate three gauges, answer four prompts.
 * Everything is optional; the save button always works.
 * NOTE: state is initialized from `entry` — the parent must pass `key` so a
 * freshly loaded entry remounts the editor with the saved values.
 */
export function JournalEditor({ entry, saving, onSave }: JournalEditorProps) {
  const [draft, setDraft] = useState<JournalDraft>(() => draftFromEntry(entry));

  const set = <K extends keyof JournalDraft>(key: K, value: JournalDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <View style={styles.root}>
      {/* Ratings */}
      <View style={styles.ratingsRow}>
        {RATINGS.map((r) => (
          <View key={r.key} style={styles.ratingBlock}>
            <View style={styles.ratingHeader}>
              <Ionicons name={r.icon as never} size={14} color={palette.textDim} />
              <ThemedText variant="caption" color="textDim">
                {r.label}
              </ThemedText>
            </View>
            <View style={styles.pips}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (draft[r.key] ?? 0) >= n;
                return (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.label} ${n} of 5`}
                    onPress={() => {
                      haptic('tap');
                      set(r.key, n);
                    }}
                    style={[styles.pip, active && { backgroundColor: palette.aura }]}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {/* Prompts */}
      <Input
        label="What did I accomplish?"
        placeholder="Wins big and small…"
        value={draft.accomplished}
        onChangeText={(v) => set('accomplished', v)}
        multiline
      />
      <Input
        label="What challenged me?"
        placeholder="Friction, resistance, setbacks…"
        value={draft.challenged}
        onChangeText={(v) => set('challenged', v)}
        multiline
      />
      <Input
        label="What did I learn?"
        placeholder="A lesson worth keeping…"
        value={draft.learned}
        onChangeText={(v) => set('learned', v)}
        multiline
      />
      <Input
        label="Tomorrow's mission"
        placeholder="One clear intention…"
        value={draft.tomorrowIntent}
        onChangeText={(v) => set('tomorrowIntent', v)}
        multiline
      />

      <Button
        label={entry ? 'Update entry' : 'Save entry · +30 XP'}
        icon="save"
        onPress={() => onSave(draft)}
        loading={saving}
      />
      {entry ? (
        <ThemedText variant="caption" color="success">
          Logged today — reward already claimed. Editing is free.
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.lg,
  },
  ratingsRow: {
    gap: spacing.md,
  },
  ratingBlock: {
    gap: spacing.xs,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pip: {
    width: 34,
    height: 10,
    borderRadius: radius.round,
    backgroundColor: palette.steel,
  },
});
