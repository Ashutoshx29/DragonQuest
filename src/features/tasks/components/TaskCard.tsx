import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Badge, Card, ThemedText } from '@/design-system/components';
import { springPresets } from '@/design-system/motion';
import { radius, spacing } from '@/design-system/tokens';
import { addDays, todayString } from '@/lib/dates';
import { haptic } from '@/services/haptics';

import type { TaskRow } from '@/data/repositories';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TaskCardProps {
  task: TaskRow;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}

function dueLabel(dueDay: string | null): string | null {
  if (!dueDay) return null;
  const today = todayString();
  if (dueDay === today) return 'Today';
  if (dueDay === addDays(today, 1)) return 'Tomorrow';
  if (dueDay < today) return 'Overdue';
  return dueDay;
}

export function TaskCard({ task, onToggle, onOpen }: TaskCardProps) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const done = task.completedAt !== null;
  const label = dueLabel(task.dueDay);

  return (
    <Card compact style={styles.card}>
      <View style={styles.row}>
        <AnimatedPressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={done ? `Undo ${task.title}` : `Complete ${task.title}`}
          onPress={() => {
            haptic(done ? 'tap' : 'success');
            onToggle(task.id);
          }}
          onPressIn={() => {
            scale.value = withSpring(0.85, springPresets.snappy);
          }}
          onPressOut={() => {
            scale.value = withSpring(1, springPresets.pop);
          }}
          style={[styles.check, pressStyle, done && styles.checkDone]}
        >
          {done ? <Ionicons name="checkmark-sharp" size={18} color="#07080C" /> : null}
        </AnimatedPressable>

        <Pressable style={styles.body} onPress={() => onOpen(task.id)} accessibilityRole="button">
          <ThemedText variant="subheading" color={done ? 'textDim' : 'textBright'} numberOfLines={1}>
            {task.title}
          </ThemedText>
        </Pressable>

        {label ? <Badge label={label} variant={label === 'Overdue' ? 'danger' : 'neutral'} /> : null}
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
  check: {
    width: 34,
    height: 34,
    borderRadius: radius.round,
    borderWidth: 2,
    borderColor: '#4ADE80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: '#4ADE80',
    borderColor: '#4ADE80',
  },
  body: {
    flex: 1,
  },
});
