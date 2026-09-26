import { useCallback, useState } from 'react';

import {
  getJournaledDays,
  getTodayJournal,
  listJournalEntries,
  saveJournalEntry,
  type JournalEntry,
} from '@/data/repositories';
import { todayString } from '@/lib/dates';
import { useAsync } from '@/hooks/useAsync';
import { notifyXpChanged } from '@/features/progression/xpEvents';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';

export interface JournalDraft {
  mood: number | null;
  energy: number | null;
  discipline: number | null;
  accomplished: string;
  challenged: string;
  learned: string;
  tomorrowIntent: string;
}

/**
 * Training Log (journal). The repository persists entries and awards the
 * one-time daily XP; this hook owns feedback and refreshes history.
 */
export function useJournal() {
  const today = useAsync(() => getTodayJournal(), []);
  const history = useAsync(() => listJournalEntries(60), []);
  const marks = useAsync(() => getJournaledDays(35), []);
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (draft: JournalDraft) => {
      setSaving(true);
      try {
        const { entry, xpAwarded } = await saveJournalEntry({ ...draft, day: todayString() });
        if (xpAwarded > 0) {
          haptic('levelUp');
          sfx.play('xp');
          notifyXpChanged();
        }
        today.reload();
        history.reload();
        marks.reload();
        return { entry: entry as JournalEntry, xpAwarded };
      } finally {
        setSaving(false);
      }
    },
    [today, history, marks]
  );

  return {
    todayEntry: (today.data ?? null) as JournalEntry | null,
    history: (history.data ?? []) as JournalEntry[],
    markedDays: (marks.data ?? []) as { day: string; has: boolean }[],
    saving,
    save,
    reloadToday: today.reload,
  };
}
