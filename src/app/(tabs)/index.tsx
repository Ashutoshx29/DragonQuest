import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, ProgressBar, Screen, Sheet, ThemedText } from '@/design-system/components';
import { questPalettes, spacing } from '@/design-system/tokens';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

/**
 * Today — daily dashboard. Currently showcases the Phase 2 design system;
 * becomes the live mission board in Phase 3–4.
 */
export default function TodayScreen() {
  const [xp] = useState(1240);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pressed, setPressed] = useState(0);

  const levelXpIntoLevel = 340;
  const levelXpRequired = 634;

  return (
    <Screen padded>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText variant="display" color="textBright">
            Today
          </ThemedText>
          <ThemedText variant="caption" color="textDim">
            Day 1 of your training arc
          </ThemedText>
        </View>
        <Badge label="LV 5" variant="accent" />
      </View>

      <Card accent={questPalettes.mind.base}>
        <View style={styles.rowBetween}>
          <ThemedText variant="subheading" color="textBright">
            Experience
          </ThemedText>
          <ThemedText variant="mono" color="accent">
            {xp.toLocaleString()} XP
          </ThemedText>
        </View>
        <ProgressBar value={levelXpIntoLevel / levelXpRequired} />
        <ThemedText variant="caption" color="textFaint">
          {levelXpIntoLevel} / {levelXpRequired} to level 6
        </ThemedText>
      </Card>

      <Card accent={questPalettes.body.base} compact>
        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <View style={[styles.questDot, { backgroundColor: questPalettes.body.base }]} />
            <View>
              <ThemedText variant="subheading" color="textBright">
                Morning training
              </ThemedText>
              <ThemedText variant="caption" color="textDim">
                Body · 20 XP · 6 day streak
              </ThemedText>
            </View>
          </View>
          <Badge label="×1.25" variant="power" />
        </View>
      </Card>

      <View style={styles.row}>
        <Button
          label="Complete quest"
          icon="checkmark"
          onPress={() => {
            sfx.play('complete');
            haptic('success');
            setPressed((p) => p + 1);
          }}
          style={styles.flex1}
        />
        <Button
          label="Sheet"
          icon="ellipsis-horizontal"
          variant="secondary"
          onPress={() => setSheetOpen(true)}
        />
      </View>

      {pressed > 0 ? (
        <ThemedText variant="caption" color="success">
          Quest completed {pressed}× — haptics + sound pipeline working.
        </ThemedText>
      ) : null}

      <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Quest options">
        <ThemedText variant="body" color="textDim">
          Edit, archive, and reminder options for this quest will live here.
        </ThemedText>
        <Button label="Close" variant="ghost" onPress={() => setSheetOpen(false)} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerText: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flex1: {
    flex: 1,
  },
  questDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
});
