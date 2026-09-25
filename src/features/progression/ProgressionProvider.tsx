import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { AchievementOverlay } from '@/design-system/components/AchievementOverlay';
import { LevelUpOverlay, type LevelUpInfo } from '@/design-system/components/LevelUpOverlay';
import { ThemedText } from '@/design-system/components/ThemedText';
import { springPresets } from '@/design-system/motion';
import { radius, spacing } from '@/design-system/tokens';
import { checkAndUnlockAchievements, getSettings, getXpTotals } from '@/data/repositories';
import { levelFromTotalXp, rankTitle, type LevelState } from '@/game/config/levels';
import type { AchievementDef } from '@/game/config/achievements';
import { sfx } from '@/services/audio';
import { haptic, setHapticsEnabled } from '@/services/haptics';
import { onXpChanged } from './xpEvents';

interface ProgressionContextValue {
  totals: { totalXp: number; todayXp: number } | null;
  levelState: LevelState | null;
  title: string;
  refresh: () => Promise<void>;
}

const ProgressionContext = createContext<ProgressionContextValue>({
  totals: null,
  levelState: null,
  title: '',
  refresh: async () => {},
});

export function useProgression(): ProgressionContextValue {
  return useContext(ProgressionContext);
}

interface ToastState {
  amount: number;
  key: number;
}

export function ProgressionProvider({ children }: { children: React.ReactNode }) {
  const [totals, setTotals] = useState<{ totalXp: number; todayXp: number } | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUpInfo | null>(null);
  const [achievement, setAchievement] = useState<AchievementDef | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const lastLevelRef = useRef<number | null>(null);
  const lastTotalRef = useRef<number | null>(null);
  const toastKeyRef = useRef(0);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const next = await getXpTotals();
    if (!mountedRef.current) return;
    setTotals(next);

    // Achievements: check for new unlocks after any XP change.
    const unlocks = await checkAndUnlockAchievements();
    if (unlocks.length > 0 && mountedRef.current) {
      haptic('levelUp');
      sfx.play('achievement');
      setAchievement(unlocks[0]);
      // Reward XP lands in the ledger synchronously above; totals already
      // include it, so no extra refresh needed for the reward itself.
    }

    // XP gain toast (skip the initial load)
    if (lastTotalRef.current !== null && next.totalXp > lastTotalRef.current) {
      toastKeyRef.current += 1;
      setToast({ amount: next.totalXp - lastTotalRef.current, key: toastKeyRef.current });
    }
    lastTotalRef.current = next.totalXp;

    // Level-up ceremony (skip the initial load)
    const state = levelFromTotalXp(next.totalXp);
    const prev = lastLevelRef.current;
    if (prev !== null && state.level > prev) {
      haptic('levelUp');
      sfx.play('levelUp');
      setLevelUp({ fromLevel: prev, toLevel: state.level, title: rankTitle(state.level) });
    }
    lastLevelRef.current = state.level;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // Apply persisted feedback settings at startup.
    void getSettings().then((s) => {
      setHapticsEnabled(s.haptics);
      sfx.setEnabled(s.sound);
    });
    void refresh();
    const unsubscribe = onXpChanged(() => {
      void refresh();
    });
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [refresh]);

  const toastOpacity = useSharedValue(0);
  useEffect(() => {
    if (!toast) return;
    toastOpacity.value = withSpring(1, springPresets.pop);
    const timer = setTimeout(() => {
      toastOpacity.value = withTiming(0, { duration: 250 });
    }, 1200);
    return () => clearTimeout(timer);
  }, [toast, toastOpacity]);
  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
    transform: [{ scale: toastOpacity.value }],
  }));

  const levelState = totals ? levelFromTotalXp(totals.totalXp) : null;
  const value = useMemo<ProgressionContextValue>(
    () => ({
      totals,
      levelState,
      title: levelState ? rankTitle(levelState.level) : '',
      refresh,
    }),
    [totals, levelState, refresh]
  );

  return (
    <ProgressionContext.Provider value={value}>
      <View style={styles.fill}>
        {children}
        {toast ? (
          <Animated.View key={toast.key} pointerEvents="none" style={[styles.toast, toastStyle]}>
            <ThemedText variant="subheading" color="accent">
              +{toast.amount} XP
            </ThemedText>
          </Animated.View>
        ) : null}
        <LevelUpOverlay info={levelUp} onDismiss={() => setLevelUp(null)} />
        <AchievementOverlay achievement={achievement} onDismiss={() => setAchievement(null)} />
      </View>
    </ProgressionContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: 'rgba(12, 14, 20, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.4)',
  },
});
