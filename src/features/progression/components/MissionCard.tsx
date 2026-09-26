import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, ProgressBar, ThemedText } from '@/design-system/components';
import { palette, spacing } from '@/design-system/tokens';
import { haptic } from '@/services/haptics';

import type { MissionView } from '@/game/engine/missions';

interface MissionCardProps {
  mission: MissionView;
  claimed: boolean;
  claiming: boolean;
  onClaim: (kind: MissionView['kind']) => void;
}

/** Per-kind objective icon + accent — original glyph language, no IP. */
const KIND_GLYPH: Record<MissionView['kind'], { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  any_three: { icon: 'diamond', color: palette.aura },
  perfect_day: { icon: 'sunny', color: palette.gold },
  routine_run: { icon: 'flame', color: palette.ember },
};

/**
 * A daily training objective — not a checklist row: objective glyph, title,
 * one-line objective, progress toward completion, and the XP bounty styled
 * as a reward. Claim turns the bounty into a gold CLAIMED plate.
 */
export function MissionCard({ mission, claimed, claiming, onClaim }: MissionCardProps) {
  const glyph = KIND_GLYPH[mission.kind];
  const stateColor = claimed ? palette.gold : mission.done ? palette.success : glyph.color;

  return (
    <Card compact accent={mission.done && !claimed ? palette.success : undefined} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { borderColor: stateColor }]}>
          <Ionicons
            name={claimed ? 'shield-checkmark' : mission.done ? 'checkmark-circle' : glyph.icon}
            size={22}
            color={stateColor}
          />
        </View>
        <View style={styles.body}>
          <ThemedText variant="subheading" color="textBright">
            {mission.title}
          </ThemedText>
          <ThemedText variant="caption" color="textDim" numberOfLines={1}>
            {mission.description}
          </ThemedText>
          {!claimed && !mission.done && mission.progressLabel ? (
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <ProgressBar value={mission.progress} height={4} color={glyph.color} />
              </View>
              <ThemedText variant="caption" color="textFaint">
                {mission.progressLabel}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <View style={styles.right}>
          {claimed ? (
            <Badge label="CLAIMED" variant="gold" />
          ) : mission.done ? (
            <Button
              label={`CLAIM +${mission.rewardXp} XP`}
              size="sm"
              variant="primary"
              loading={claiming}
              onPress={() => {
                haptic('tap');
                onClaim(mission.kind);
              }}
            />
          ) : (
            <Badge label={`+${mission.rewardXp} XP`} variant="gold" />
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  progressTrack: {
    flex: 1,
    maxWidth: 120,
  },
  right: {
    alignItems: 'flex-end',
  },
});
