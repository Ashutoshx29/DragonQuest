import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  AchievementCard,
  AttributeCard,
  Button,
  Card,
  CharacterAvatar,
  LevelBadge,
  Screen,
  StreakBadge,
  ThemedText,
  XPBar,
} from '@/design-system/components';
import { gradients, palette, radius, spacing } from '@/design-system/tokens';
import { useProgression } from '@/features/progression/ProgressionProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSyncStatus } from '@/features/auth/useSyncStatus';
import { useAchievements } from '@/features/progression/hooks/useAchievements';
import { useAttributes } from '@/features/progression/hooks/useAttributes';
import { countTrainingSessions, getAchievementStats } from '@/data/repositories';
import { useAsync } from '@/hooks/useAsync';

/**
 * PROFILE — the character sheet. Identity first: avatar, rank, title, level
 * and the XP bar. Then ATTRIBUTES (the five training stats), then RECORDS
 * (lifetime numbers), then medals. Numbers support identity — never compete
 * with it.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { snapshot, totals, levelState, title } = useProgression();
  const auth = useAuth();
  const syncStatus = useSyncStatus();
  const attributes = useAttributes();
  const { achievements } = useAchievements();
  const { data: statsData } = useAsync(() => getAchievementStats(), []);
  const { data: sessionCount } = useAsync(() => countTrainingSessions(), []);
  const s = statsData as Awaited<ReturnType<typeof getAchievementStats>> | null;

  // Sign-out is irreversible in the moment (session ends, re-auth required),
  // so it needs two deliberate taps — no modal component needed.
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const signOutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (signOutTimer.current) clearTimeout(signOutTimer.current);
    },
    []
  );
  const handleSignOut = () => {
    if (confirmSignOut) {
      if (signOutTimer.current) clearTimeout(signOutTimer.current);
      setConfirmSignOut(false);
      void auth.signOut();
      return;
    }
    setConfirmSignOut(true);
    signOutTimer.current = setTimeout(() => setConfirmSignOut(false), 3000);
  };

  // Streak values come from the SINGLE SOURCE OF TRUTH (ProgressionProvider).
  const streak = snapshot?.streak ?? null;
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Character plate */}
        <LinearGradient
          colors={[gradients.hero[0], gradients.hero[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <CharacterAvatar size={84} stage={levelState && levelState.level >= 15 ? 'gold' : 'aura'} />
            <View style={styles.heroId}>
              <ThemedText variant="title" color="textBright">
                Warrior
              </ThemedText>
              <ThemedText variant="label" color="gold">
                {title ? `THE ${title.toUpperCase()}` : 'UNRANKED'}
              </ThemedText>
            </View>
            <LevelBadge level={levelState?.level ?? null} />
          </View>
          <XPBar
            value={levelState?.progress ?? 0}
            current={levelState?.xpIntoLevel}
            target={levelState?.xpForNext}
          />
          <StreakBadge
            current={streak?.current ?? null}
            atRisk={streak?.atRisk}
            doneToday={streak?.doneToday}
          />
        </LinearGradient>

        {/* Attributes — the five training stats, right after identity */}
        <View style={styles.sectionHeader}>
          <ThemedText variant="heading" color="textBright">
            Attributes
          </ThemedText>
          <ThemedText variant="caption" color="textDim">
            Rank climbs E → S as the score grows
          </ThemedText>
        </View>
        <View style={styles.attrList}>
          {attributes
            ? (['power', 'focus', 'discipline', 'mind', 'energy'] as const).map((key) => (
                <AttributeCard key={key} view={attributes[key]} />
              ))
            : null}
        </View>

        {/* Records — numbers after identity */}
        <View style={styles.sectionHeader}>
          <ThemedText variant="heading" color="textBright">
            Records
          </ThemedText>
        </View>
        <View style={styles.grid}>
          <Card compact style={styles.cell}>
            <ThemedText variant="heading" color="gold">
              {totals ? totals.totalXp.toLocaleString() : '—'}
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              TOTAL XP
            </ThemedText>
          </Card>
          <Card compact style={styles.cell}>
            <ThemedText variant="heading" color="power">
              {streak ? streak.best : '—'}
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              Longest streak
            </ThemedText>
          </Card>
          <Card compact style={styles.cell}>
            <ThemedText variant="heading" color="accent">
              {snapshot ? snapshot.trainingDays : '—'}
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              Training days
            </ThemedText>
          </Card>
          <Card compact style={styles.cell}>
            <ThemedText variant="heading" color="power">
              {sessionCount ?? '—'}
            </ThemedText>
            <ThemedText variant="caption" color="textDim">
              Training sessions
            </ThemedText>
          </Card>
        </View>

        {/* Achievement cabinet */}
        <View style={styles.sectionHeader}>
          <ThemedText variant="heading" color="textBright">
            Medals
          </ThemedText>
          <ThemedText variant="caption" color="textDim">
            {unlockedCount}/{achievements.length}
          </ThemedText>
        </View>
        {achievements
          .filter((a) => a.unlocked)
          .map((a) => (
            <AchievementCard key={a.def.id} def={a.def} unlocked={a.unlocked} unlockedAt={a.unlockedAt} />
          ))}
        {unlockedCount === 0 ? (
          <ThemedText variant="caption" color="textDim">
            No medals yet — complete missions to earn your first.
          </ThemedText>
        ) : null}

        {/* Extended record lines */}
        <Card>
          <View style={styles.recordRow}>
            <ThemedText variant="body" color="textDim">
              Early sessions (before 8am)
            </ThemedText>
            <ThemedText variant="mono" color="textBright">
              {s?.earlyCompletions ?? '—'}
            </ThemedText>
          </View>
          <View style={styles.recordRow}>
            <ThemedText variant="body" color="textDim">
              Missions created
            </ThemedText>
            <ThemedText variant="mono" color="textBright">
              {s?.habitsCreated ?? '—'}
            </ThemedText>
          </View>
          <View style={styles.recordRow}>
            <ThemedText variant="body" color="textDim">
              Missions completed
            </ThemedText>
            <ThemedText variant="mono" color="textBright">
              {s?.completionsTotal ?? '—'}
            </ThemedText>
          </View>
        </Card>

        {/* Account — quiet entry point; cloud sync is entirely optional */}
        <Card>
          <ThemedText variant="subheading" color="textBright">
            Account
          </ThemedText>
          {auth.status === 'signedIn' ? (
            <>
              <ThemedText variant="caption" color="textDim" numberOfLines={1}>
                {auth.profile?.display_name ?? auth.userId}
              </ThemedText>
              <View style={styles.syncRow}>
                <ThemedText variant="caption" color="textDim">
                  {syncStatus.syncing
                    ? 'Syncing…'
                    : syncStatus.lastResult && !syncStatus.lastResult.ok
                      ? "Sync temporarily unavailable. Your progress is saved and we'll retry."
                      : 'Progress synced to your account'}
                </ThemedText>
                <Button
                  label="Sync now"
                  size="sm"
                  variant="secondary"
                  loading={syncStatus.syncing}
                  onPress={() => void syncStatus.sync()}
                />
              </View>
              <Button
                label={confirmSignOut ? 'Tap again to confirm' : 'Sign out'}
                size="sm"
                variant={confirmSignOut ? 'danger' : 'ghost'}
                onPress={handleSignOut}
              />
            </>
          ) : (
            <>
              <ThemedText variant="caption" color="textDim">
                {syncStatus.previewTotal > 0
                  ? `${syncStatus.previewTotal} local records ready to upload`
                  : 'Local-only right now. Sign in to sync progress across devices.'}
              </ThemedText>
              <Button
                label="Sign in / Create account"
                variant="secondary"
                onPress={() => router.push('/sign-in')}
              />
            </>
          )}
        </Card>

        {/* Settings — quiet secondary action, no longer competing */}
        <Button
          label="Settings"
          icon="settings-outline"
          variant="ghost"
          onPress={() => router.push('/settings')}
        />
      </ScrollView>
    </Screen>
  );
}


const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#1E3242',
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: radius.round,
    borderWidth: 2,
    borderColor: palette.aura,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  heroId: {
    flex: 1,
    gap: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cell: {
    width: '47.5%',
    alignItems: 'center',
    gap: 4,
    marginBottom: 0,
  },
  sectionHeader: {
    marginTop: spacing.sm,
  },
  attrList: {
    gap: spacing.sm,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
