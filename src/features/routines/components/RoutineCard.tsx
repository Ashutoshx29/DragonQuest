import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Card, ThemedText } from '@/design-system/components';
import { spacing } from '@/design-system/tokens';

import type { RoutineRow } from '@/data/repositories';

const TIME_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  morning: { icon: 'sunny', label: 'Morning' },
  afternoon: { icon: 'partly-sunny', label: 'Midday' },
  evening: { icon: 'moon', label: 'Evening' },
  anytime: { icon: 'time', label: 'Anytime' },
};

interface RoutineCardProps {
  routine: RoutineRow;
  itemCount: number;
  onPress: (id: string) => void;
}

export function RoutineCard({ routine, itemCount, onPress }: RoutineCardProps) {
  const meta = TIME_META[routine.timeOfDay] ?? TIME_META.anytime;
  return (
    <Card compact onPress={() => onPress(routine.id)} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name={meta.icon} size={20} color="#00E5FF" />
        </View>
        <View style={styles.body}>
          <ThemedText variant="subheading" color="textBright" numberOfLines={1}>
            {routine.name}
          </ThemedText>
          <ThemedText variant="caption" color="textDim">
            {meta.label} · {itemCount} {itemCount === 1 ? 'step' : 'steps'}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#5A6172" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
  },
  body: {
    flex: 1,
    gap: 2,
  },
});
