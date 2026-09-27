import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  CalendarHistory,
  Card,
  Screen,
  ThemedText,
  type DayMark,
} from '@/design-system/components';
import { spacing } from '@/design-system/tokens';
import { formatDayLong } from '@/lib/dates';
import { JournalEditor } from '@/features/journal/components/JournalEditor';
import { useJournal, type JournalDraft } from '@/features/journal/hooks/useJournal';
import { getStatsOverview, type StatsOverview } from '@/data/repositories';
import { useAsync } from '@/hooks/useAsync';

/**
 * JOURNAL — the daily training log: a reflective 2-minute ritual with
 * calendar history. First screenful: today's entry. Below: the month grid
 * and recent reflections.
 */
export default function JournalScreen() {
  const journal = useJournal();
  const { data: statsData } = useAsync(() => getStatsOverview(), []);
  const stats = statsData as StatsOverview | null;
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const calendarDays = useMemo(() => {
    const map: Record<string, DayMark[]> = {};
    for (const m of journal.markedDays) {
      if (m.has) map[m.day] = [...(map[m.day] ?? []), 'journal'];
    }
    for (const d of stats?.last14 ?? []) {
      if (d.completions > 0) map[d.day] = [...(map[d.day] ?? []), 'active'];
    }
    return map;
  }, [journal.markedDays, stats]);

  // Save errors must be VISIBLE and non-destructive: on failure the editor is
  // not remounted (key only changes when the entry id changes on a successful
  // reload), so the user's text survives and they can retry.
  const handleSave = async (draft: JournalDraft) => {
    setSaveError(null);
    try {
      const { xpAwarded } = await journal.save(draft);
      if (xpAwarded > 0) {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2500);
      }
    } catch {
      setSaveError("Couldn't save your entry — your text is kept. Please try again.");
    }
  };

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="display" color="textBright">
            Journal
          </ThemedText>
          <ThemedText variant="caption" color="textDim">
            Two minutes of honesty beats an hour of planning
          </ThemedText>
        </View>

        <Card>
          <View style={styles.dateRow}>
            <ThemedText variant="subheading" color="textBright">
              Today
            </ThemedText>
            {savedFlash ? (
              <ThemedText variant="label" color="success">
                +30 XP · LOGGED
              </ThemedText>
            ) : saveError ? (
              <ThemedText variant="caption" color="danger">
                {saveError}
              </ThemedText>
            ) : null}
          </View>
          <JournalEditor
            key={journal.todayEntry?.id ?? 'new-draft'}
            entry={journal.todayEntry}
            saving={journal.saving}
            onSave={(d) => void handleSave(d)}
          />
        </Card>

        {/* Calendar history */}
        <Card>
          <ThemedText variant="subheading" color="textBright">
            History
          </ThemedText>
          <CalendarHistory days={calendarDays} />
        </Card>

        {/* Recent entries */}
        {journal.history.length > 0 ? (
          <Card>
            <ThemedText variant="subheading" color="textBright">
              Recent reflections
            </ThemedText>
            {journal.history.slice(0, 7).map((e) => (
              <View key={e.id} style={styles.logRow}>
                <View style={styles.logText}>
                  <ThemedText variant="caption" color="textFaint">
                    {formatDayLong(e.day)}
                  </ThemedText>
                  <ThemedText variant="body" color="textBright" numberOfLines={2}>
                    {e.accomplished || e.learned || e.tomorrowIntent || 'Logged'}
                  </ThemedText>
                  {/* Mood/Energy/Discipline are the user's own 1–5 self-ratings
                      (same values the editor captures) — show the words, never
                      the raw letter codes. */}
                  {e.mood != null || e.energy != null || e.discipline != null ? (
                    <ThemedText variant="caption" color="textDim">
                      {[
                        e.mood != null ? `Mood ${e.mood}/5` : null,
                        e.energy != null ? `Energy ${e.energy}/5` : null,
                        e.discipline != null ? `Discipline ${e.discipline}/5` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: 2,
    marginTop: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logRow: {
    paddingVertical: spacing.xs,
  },
  logText: {
    gap: 2,
  },
});
