import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { gradients, radius, spacing } from '../tokens';
import { CharacterAvatar } from './CharacterAvatar';
import { LevelBadge } from './LevelBadge';
import { StreakBadge } from './StreakBadge';
import { ThemedText } from './ThemedText';
import { XPBar } from './XPBar';

import type { LevelState } from '@/game/config/levels';

interface CharacterHeaderProps {
  levelState: LevelState | null;
  /** Rank/title from game/config/levels. */
  title: string;
  streak: number | null | undefined;
  streakAtRisk?: boolean;
  streakDoneToday?: boolean;
  /** Total XP across all levels (displayed by the bar). */
  todayXp?: number;
}

/**
 * Character header — the hero panel used on Home and Profile. The character
 * is visually PROMINENT: a large original silhouette avatar with aura ring,
 * identity block (rank + title), level plate and animated XP bar. Abstract
 * on purpose — no licensed shapes — and swappable for original artwork.
 */
export function CharacterHeader({
  levelState,
  title,
  streak,
  streakAtRisk,
  streakDoneToday,
  todayXp,
}: CharacterHeaderProps) {
  return (
    <LinearGradient
      colors={[gradients.heroAccent[0], gradients.heroAccent[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.panel}
    >
      <View style={styles.topRow}>
        <CharacterAvatar size={96} stage={levelState && levelState.level >= 15 ? 'gold' : 'aura'} />
        <View style={styles.idBlock}>
          <ThemedText variant="title" color="textBright">
            Warrior
          </ThemedText>
          <ThemedText variant="subheading" color="gold">
            {title ? `THE ${title.toUpperCase()}` : 'UNRANKED'}
          </ThemedText>
          <View style={styles.levelRow}>
            <LevelBadge level={levelState?.level ?? null} />
            {todayXp && todayXp > 0 ? (
              <ThemedText variant="caption" color="accent">
                +{todayXp.toLocaleString()} today
              </ThemedText>
            ) : null}
          </View>
        </View>
      </View>

      <XPBar
        value={levelState?.progress ?? 0}
        current={levelState?.xpIntoLevel}
        target={levelState?.xpForNext}
      />

      <StreakBadge current={streak ?? null} atRisk={streakAtRisk} doneToday={streakDoneToday} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#1E3242',
    padding: spacing.xl,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  idBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});
