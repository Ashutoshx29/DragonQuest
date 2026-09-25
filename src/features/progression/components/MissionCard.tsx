import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, ThemedText } from '@/design-system/components';
import { spacing } from '@/design-system/tokens';
import { haptic } from '@/services/haptics';

import type { MissionView } from '@/game/engine/missions';

interface MissionCardProps {
  mission: MissionView;
  claimed: boolean;
  claiming: boolean;
  onClaim: (kind: MissionView['kind']) => void;
}

export function MissionCard({ mission, claimed, claiming, onClaim }: MissionCardProps) {
  return (
    <Card compact accent={mission.done ? '#4ADE80' : undefined} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={mission.done ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={mission.done ? '#4ADE80' : '#00E5FF'}
          />
        </View>
        <View style={styles.body}>
          <ThemedText variant="subheading" color="textBright">
            {mission.title}
          </ThemedText>
          <ThemedText variant="caption" color="textDim">
            {mission.description}
          </ThemedText>
        </View>
        <View style={styles.right}>
          {claimed ? (
            <Badge label="CLAIMED" variant="success" />
          ) : mission.done ? (
            <Button
              label={`+${mission.rewardXp}`}
              size="sm"
              variant="primary"
              loading={claiming}
              onPress={() => {
                haptic('tap');
                onClaim(mission.kind);
              }}
            />
          ) : (
            <Badge label={`+${mission.rewardXp} XP`} variant="neutral" />
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
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
});
