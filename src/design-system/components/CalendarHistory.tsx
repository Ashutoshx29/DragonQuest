import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { parseDayString, toLocalDayString, todayString } from '@/lib/dates';
import { palette, radius, spacing } from '../tokens';
import { IconButton } from './IconButton';
import { ThemedText } from './ThemedText';

export type DayMark = 'journal' | 'active' | 'perfect';

export interface CalendarDay {
  day: string;
  marks: DayMark[];
}

interface CalendarHistoryProps {
  /** Marks keyed by YYYY-MM-DD. */
  days: Record<string, DayMark[]>;
  /** Called with the day string when the user taps a marked day. */
  onDayPress?: (day: string) => void;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MARK_COLORS: Record<DayMark, string> = {
  journal: palette.attrMind,
  active: palette.aura,
  perfect: palette.gold,
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Month grid with marked days — journal history, active days, perfect days. */
export function CalendarHistory({ days, onDayPress }: CalendarHistoryProps) {
  const today = todayString();
  const [cursor, setCursor] = useState(() => {
    const d = parseDayString(today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const lead = first.getDay();
    const grid: (CalendarDay | null)[] = [];
    // Leading blanks
    for (let i = 0; i < lead; i++) grid.push(null);
    // Days of month
    const cursor_ = new Date(cursor.year, cursor.month, 1);
    while (cursor_.getMonth() === cursor.month) {
      const day = toLocalDayString(cursor_);
      grid.push({ day, marks: days[day] ?? [] });
      cursor_.setDate(cursor_.getDate() + 1);
    }
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [cursor, days]);

  const shift = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <View style={styles.root}>
      <View style={styles.navRow}>
        <IconButton icon="chevron-back" label="Previous month" onPress={() => shift(-1)} />
        <ThemedText variant="subheading" color="textBright">
          {MONTHS[cursor.month]} {cursor.year}
        </ThemedText>
        <IconButton icon="chevron-forward" label="Next month" onPress={() => shift(1)} />
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((w, i) => (
          <ThemedText key={`${w}${i}`} variant="caption" color="textFaint" style={styles.weekCell}>
            {w}
          </ThemedText>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, i) => {
          if (!cell) return <View key={`blank-${i}`} style={styles.dayCell} />;
          const isToday = cell.day === today;
          const marked = cell.marks.length > 0;
          const dotColors = cell.marks.map((m) => MARK_COLORS[m]);
          return (
            <View key={cell.day} style={styles.dayCell}>
              <View
                style={[
                  styles.dayCircle,
                  isToday && { borderColor: palette.aura, borderWidth: 1.5 },
                  marked && !isToday && { borderColor: palette.graphite, borderWidth: 1 },
                ]}
              >
                <ThemedText
                  variant="caption"
                  color={marked ? 'textBright' : isToday ? 'accent' : 'textFaint'}
                >
                  {Number(cell.day.slice(8, 10))}
                </ThemedText>
              </View>
              <View style={styles.dotsRow}>
                {dotColors.slice(0, 3).map((c, j) => (
                  <View key={j} style={[styles.dot, { backgroundColor: c }]} />
                ))}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        {(Object.keys(MARK_COLORS) as DayMark[]).map((m) => (
          <View key={m} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: MARK_COLORS[m] }]} />
            <ThemedText variant="caption" color="textFaint">
              {m === 'journal' ? 'Logged' : m === 'active' ? 'Trained' : 'Perfect'}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekCell: {
    flex: 1,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: spacing.xxs,
    minHeight: 44,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'transparent',
    borderWidth: 1.5,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    height: 4,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
