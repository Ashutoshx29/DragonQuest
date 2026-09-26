import { StyleSheet, View } from 'react-native';

import { QUOTES, type Quote } from '@/data/content/quotes';
import { todayString } from '@/lib/dates';
import { radius, spacing } from '../tokens';
import { ThemedText } from './ThemedText';

/** Deterministic quote of the day (same quote all day, rotates daily). */
export function quoteOfTheDay(day: string = todayString()): Quote {
  let h = 0;
  for (let i = 0; i < day.length; i++) {
    h = (h * 31 + day.charCodeAt(i)) >>> 0;
  }
  return QUOTES[h % QUOTES.length];
}

/** The daily quote — appears once per screen, between major sections. */
export function DailyQuoteCard() {
  const quote = quoteOfTheDay();
  return (
    <View style={styles.card}>
      <ThemedText variant="label" color="gold" style={styles.kicker}>
        DAILY WISDOM
      </ThemedText>
      <ThemedText variant="subheading" color="textBright">
        “{quote.text}”
      </ThemedText>
      <ThemedText variant="caption" color="textDim">
        — {quote.author}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 201, 77, 0.25)',
    backgroundColor: 'rgba(255, 201, 77, 0.05)',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  kicker: {
    letterSpacing: 3,
  },
});
