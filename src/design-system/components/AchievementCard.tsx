import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { palette, radius, spacing } from '../tokens';
import { ProgressBar } from './ProgressBar';
import { ThemedText } from './ThemedText';

import { TIER_META, type AchievementDef } from '@/game/config/achievements';

interface AchievementCardProps {
  def: AchievementDef;
  unlocked: boolean;
  unlockedAt?: string | null;
  /** 0..1 progress for locked achievements. */
  progress?: number;
}

/** Tier-colored achievement medal — used on Progress and Profile. */
export function AchievementCard({ def, unlocked, unlockedAt, progress = 0 }: AchievementCardProps) {
  const tier = TIER_META[def.tier];
  return (
    <View style={[styles.card, { borderColor: unlocked ? tier.color : palette.line }]}>
      <View style={[styles.medal, { borderColor: unlocked ? tier.color : palette.graphite }]}>
        <Ionicons name={def.icon as never} size={22} color={unlocked ? tier.color : palette.textFaint} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <ThemedText variant="subheading" color={unlocked ? 'textBright' : 'textDim'} numberOfLines={1}>
            {def.title}
          </ThemedText>
          <ThemedText variant="caption" style={{ color: tier.color }}>
            {tier.label}
          </ThemedText>
        </View>
        <ThemedText variant="caption" color="textDim" numberOfLines={1}>
          {def.description} · +{def.xpReward} XP
        </ThemedText>
        {unlocked ? (
          <ThemedText variant="caption" color="success">
            Unlocked{unlockedAt ? ` · ${unlockedAt.slice(0, 10)}` : ''}
          </ThemedText>
        ) : (
          <ProgressBar value={progress} height={4} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    backgroundColor: 'rgba(18, 21, 29, 0.6)',
  },
  medal: {
    width: 44,
    height: 44,
    borderRadius: radius.round,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
