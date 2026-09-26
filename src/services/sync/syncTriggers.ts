import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { isCloudConfigured } from '@/lib/supabase';
import { notifyXpChanged, onBoardChanged, onXpChanged } from '@/features/progression/xpEvents';
import { syncNow } from './syncService';

/**
 * Sync triggers (Decision D) — mounts once at the app root:
 *   1. immediately after sign-in (initial upload/migration window),
 *   2. on app foreground,
 *   3. debounced after any XP/board mutation (piggybacks the existing
 *      event bus — no repository changes).
 *
 * Fire-and-forget: sync never blocks the UI and never breaks offline use.
 * After a pass that pulled rows, the local engine re-derives progression
 * from the merged ledger via the existing notifyXpChanged pipeline.
 */
export function useSyncTriggers() {
  const { status, userId } = useAuth();
  const enabled = isCloudConfigured && status === 'signedIn' && !!userId;

  // 1 + 2: sign-in and app foreground.
  useEffect(() => {
    if (!enabled || !userId) return;

    let inFlight = false;
    const run = () => {
      if (inFlight) return;
      inFlight = true;
      void syncNow(userId).then((result) => {
        inFlight = false;
        if (result.ok && result.pulled > 0) notifyXpChanged();
      });
    };

    run(); // on sign-in
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run(); // on foreground
    });
    return () => sub.remove();
  }, [enabled, userId]);

  // 3: debounced post-mutation sync (XP and board mutations).
  useEffect(() => {
    if (!enabled || !userId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void syncNow(userId);
        // A post-mutation pass only pushes local changes; the local engine
        // already derived progression when the mutation notified its listeners.
      }, 2000);
    };
    const offXp = onXpChanged(schedule);
    const offBoard = onBoardChanged(schedule);
    return () => {
      if (timer) clearTimeout(timer);
      offXp();
      offBoard();
    };
  }, [enabled, userId]);
}
