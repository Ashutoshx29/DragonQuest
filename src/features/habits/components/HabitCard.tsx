import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Badge, Card, ThemedText } from '@/design-system/components';
import { radius, spacing } from '@/design-system/tokens';
import { BASE_XP, computeXpAward } from '@/game/config/xp';
import { describeSchedule } from '@/lib/schedule';
import { haptic } from '@/services/haptics';
import { springPresets } from '@/design-system/motion';

import type { HabitWithProgress } from '@/data/repositories';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface HabitCardProps {
  habit: HabitWithProgress;
  busy?: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}

export function HabitCard({ habit, busy = false, onToggle, onOpen }: HabitCardProps) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const done = habit.doneToday;
  const scheduled = habit.scheduledToday;
  const xpToday = computeXpAward(BASE_XP.habit, habit.difficulty, habit.streak.current);

  const handleToggle = () => {
    haptic(done ? 'tap' : 'success');
    onToggle(habit.id);
  };

  return (
    <Card compact accent={habit.color} style={styles.card}>
      <View style={styles.row}>
        <AnimatedPressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={done ? `Undo ${habit.name}` : `Complete ${habit.name}`}
          disabled={busy}
          onPress={handleToggle}
          onPressIn={() => {
            scale.value = withSpring(0.85, springPresets.snappy);
          }}
          onPressOut={() => {
            scale.value = withSpring(1, springPresets.pop);
          }}
          style={[styles.check, pressStyle, done && styles.checkDone, { borderColor: habit.color }]}
        >
          {done ? <Ionicons name="checkmark-sharp" size={18} color="#07080C" /> : null}
        </AnimatedPressable>

        <Pressable style={styles.body} onPress={() => onOpen(habit.id)} accessibilityRole="button">
          <ThemedText variant="subheading" color="textBright" numberOfLines={1}>
            {habit.name}
          </ThemedText>
          <View style={styles.meta}>
            <ThemedText variant="caption" color="textDim">
              {describeSchedule(habit.schedule)} · {xpToday} XP
            </ThemedText>
          </View>
        </Pressable>

        <View style={styles.right}>
          {habit.streak.current > 0 ? (
            <View style={styles.streak}>
              <Ionicons name="flame" size={16} color="#FF8C42" />
              <ThemedText variant="mono" color="power">
                {habit.streak.current}
              </ThemedText>
            </View>
          ) : (
            <Badge label={scheduled ? '—' : 'Rest'} variant="neutral" />
          )}
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  right: {
    alignItems: 'flex-end',
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
