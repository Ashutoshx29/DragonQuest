import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  Button,
  Card,
  CharacterHeader,
  DailyQuoteCard,
  IconButton,
  RewardOverlay,
  Screen,
  Sheet,
  ThemedText,
} from '@/design-system/components';
import { palette, spacing } from '@/design-system/tokens';
import { useDailyMissions } from '@/features/progression/hooks/useDailyMissions';
// NOTE: level progress in the reward overlay comes from the shared
// ProgressionProvider snapshot (single source of truth), not local state.
import { MissionCard } from '@/features/progression/components/MissionCard';
import { useProgression } from '@/features/progression/ProgressionProvider';
import { useAttributes } from '@/features/progression/hooks/useAttributes';
import { useAvatarStage } from '@/features/profile/hooks/useAvatarStage';
import { resolveAvatarStage } from '@/game/config/avatar';
import { HelpContent } from '@/features/help/components/HelpContent';

/**
 * HOME — the training command center. Answers "who am I becoming?" at a
 * glance: character (level/rank/XP), today's missions, one dominant TRAIN
 * action, the daily quote, and the streak/attribute pulse.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { totals, levelState, title, snapshot } = useProgression();
  const missions = useDailyMissions();
  const attributes = useAttributes();
  const { stage: chosenStage } = useAvatarStage();
  const avatarStage = resolveAvatarStage(chosenStage, levelState?.level);
  // Streak values come from the SINGLE SOURCE OF TRUTH (no separate query).
  const streak = snapshot?.streak ?? null;
  const [reward, setReward] = useState<{
    xp: number;
    streak: number;
    gains: { attribute: 'discipline'; xp: number }[];
  } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const activeAttributes = attributes
    ? (['power', 'focus', 'discipline', 'mind', 'energy'] as const)
        .map((key) => attributes[key])
        .filter((a) => a.xpToday > 0)
    : [];

  const handleClaim = async (kind: Parameters<typeof missions.claim>[0]) => {
    const result = await missions.claim(kind);
    if (result.xpAwarded > 0) {
      // Mission XP feeds DISCIPLINE (see game/config/attributes.ts).
      setReward({
        xp: result.xpAwarded,
        streak: streak?.current ?? 0,
        gains: [{ attribute: 'discipline', xp: result.xpAwarded }],
      });
    }
  };

  const handleClaimBonus = async () => {
    const result = await missions.claimBonus();
    if (result.xpAwarded > 0) {
      setReward({
        xp: result.xpAwarded,
        streak: streak?.current ?? 0,
        gains: [{ attribute: 'discipline', xp: result.xpAwarded }],
      });
    }
  };

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Brand + utility row: ? explains the game (discoverable, quiet),
            ⚙ keeps the existing Settings entry. */}
        <View style={styles.brandRow}>
          <ThemedText variant="caption" color="textDim" style={styles.brandText}>
            {`DRAGONQUEST`}
          </ThemedText>
          <View style={styles.brandActions}>
            <IconButton
              icon="help-circle-outline"
              label="How DragonQuest works"
              size={22}
              color="textDim"
              onPress={() => setHelpOpen(true)}
            />
            <IconButton
              icon="settings-outline"
              label="Settings"
              size={22}
              color="textDim"
              onPress={() => router.push('/settings')}
            />
          </View>
        </View>

        {/* 1. Character / level header */}
        <CharacterHeader
          levelState={levelState}
          title={title}
          streak={streak?.current ?? null}
          streakAtRisk={streak?.atRisk}
          streakDoneToday={streak?.doneToday}
          todayXp={totals?.todayXp}
          avatarStage={avatarStage}
        />

        {/* 2. Today's missions */}
        <View style={styles.sectionHeader}>
          <ThemedText variant="heading" color="textBright">
            Today&apos;s Training
          </ThemedText>
          {missions.board?.allDone ? (
            <ThemedText variant="label" color="success">
              ALL CLEAR
            </ThemedText>
          ) : null}
        </View>
        {missions.board?.missions.map((m) => (
          <MissionCard
            key={m.kind}
            mission={m}
            claimed={missions.board?.claimedKinds.includes(m.kind) ?? false}
            claiming={missions.claiming === m.kind}
            onClaim={(kind) => void handleClaim(kind)}
          />
        ))}

        {/* 3. Primary action — gradient CTA into the Training center */}
        <PressableCta onPress={() => router.push('/(tabs)/training')} />

        {missions.board?.allDone && !missions.board.bonusClaimed ? (
          <Button
            label="Claim bonus chest · +75 XP"
            icon="gift"
            onPress={() => void handleClaimBonus()}
            loading={missions.claiming === 'all_bonus'}
          />
        ) : null}

        {/* 4. Attribute pulse — only when something was earned today */}
        {activeAttributes.length > 0 ? (
          <Card compact>
            <ThemedText variant="label" color="textDim" style={styles.kicker}>
              TODAY&apos;S GAINS
            </ThemedText>
            <View style={styles.attrRow}>
              {activeAttributes.map((a) => (
                <View key={a.key} style={styles.attrChip}>
                  <Ionicons name="trending-up" size={14} color={palette.success} />
                  <ThemedText variant="caption" color="textBright">
                    {a.key.toUpperCase()} +{a.xpToday}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {/* 5. Daily quote */}
        <DailyQuoteCard />

        <Button
          label="Mission board →"
          variant="ghost"
          icon="grid-outline"
          onPress={() => router.push('/missions')}
        />
      </ScrollView>

      <Sheet
        visible={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="HOW DRAGONQUEST WORKS"
      >
        <HelpContent />
      </Sheet>

      {reward ? (
        <RewardOverlay
          info={{
            heading: 'MISSION COMPLETE',
            xp: reward.xp,
            gains: reward.gains,
            streak: reward.streak,
            level: levelState?.level,
            levelProgress:
              levelState && reward.xp > 0
                ? Math.min(
                    1,
                    (levelState.xpIntoLevel + reward.xp) / Math.max(1, levelState.xpForNext)
                  )
                : levelState?.progress,
            onDone: () => setReward(null),
          }}
          onDismiss={() => setReward(null)}
        />
      ) : null}
    </Screen>
  );
}

/** Gradient CTA — the single dominant action on Home. */
function PressableCta({ onPress }: { onPress: () => void }) {
  return (
    <LinearGradient
      colors={['#00C2D9', '#0088A8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.ctaWrap}
    >
      <Button label="⚡ BEGIN TRAINING" size="lg" onPress={onPress} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  brandText: {
    flex: 1,
    letterSpacing: 4,
    textAlign: 'center',
  },
  brandActions: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  kicker: {
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  attrRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  attrChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: palette.steel,
  },
  ctaWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
});
