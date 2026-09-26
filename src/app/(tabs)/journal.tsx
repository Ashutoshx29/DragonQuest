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

  const handleSave = async (draft: JournalDraft) => {
    const { xpAwarded } = await journal.save(draft);
    if (xpAwarded > 0) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
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
                <ThemedText variant="caption" color="textFaint">
                  {e.day}
                </ThemedText>
                <ThemedText variant="body" color="textBright" numberOfLines={1} style={styles.logText}>
                  {e.accomplished || e.learned || e.tomorrowIntent || 'Logged'}
                </ThemedText>
                <View style={styles.gauges}>
                  {[e.mood, e.energy, e.discipline].filter((n): n is number => n != null).length > 0 ? (
                    <ThemedText variant="caption" color="textDim">
                      {[
                        e.mood != null ? `M${e.mood}` : null,
                        e.energy != null ? `E${e.energy}` : null,
                        e.discipline != null ? `D${e.discipline}` : null,
                      ]
                        .filter(Boolean)
                        .join(' ')}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  logText: {
    flex: 1,
  },
  gauges: {
    minWidth: 64,
    alignItems: 'flex-end',
  },
});
