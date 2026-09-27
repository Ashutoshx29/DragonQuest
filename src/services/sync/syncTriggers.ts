import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { isCloudConfigured } from '@/lib/supabase';
import { notifyXpChanged, onBoardChanged, onXpChanged } from '@/features/progression/xpEvents';
import { createLogger } from '@/services/logger';
import { syncNow } from './syncService';

const logger = createLogger('sync');

/** Retry policy (pure constants, overridable in tests via factory). */
export const SYNC_RETRY_BASE_MS = 5_000; // first retry 5s after a failure
export const SYNC_RETRY_MAX_MS = 5 * 60_000; // cap: 5 minutes between retries

/** Exponential backoff for the Nth consecutive failure (pure, exported for tests). */
export function syncRetryDelayMs(consecutiveFailures: number): number {
  const exp = SYNC_RETRY_BASE_MS * Math.pow(2, Math.max(0, consecutiveFailures - 1));
  return Math.min(SYNC_RETRY_MAX_MS, exp);
}

/**
 * Sync triggers (Decision D) — mounts once at the app root:
 *   1. immediately after sign-in (initial upload/migration window),
 *   2. on app foreground,
 *   3. debounced after any XP/board mutation (piggybacks the existing
 *      event bus — no repository changes),
 *   4. automatic retry with exponential backoff after a FAILED pass, until
 *      one succeeds. Local data is never lost: a training session completed
 *      offline is pushed on the first successful pass.
 *
 * Fire-and-forget: sync never blocks the UI and never breaks offline use.
 * After a pass that pulled rows, the local engine re-derives progression
 * from the merged ledger via the existing notifyXpChanged pipeline.
 */
export function useSyncTriggers() {
  const { status, userId } = useAuth();
  const enabled = isCloudConfigured && status === 'signedIn' && !!userId;

  // 1 + 2 + 4: sign-in, app foreground, and failure retries.
  useEffect(() => {
    if (!enabled || !userId) return;

    let inFlight = false;
    let consecutiveFailures = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const run = () => {
      if (inFlight) return;
      inFlight = true;
      void syncNow(userId).then((result) => {
        inFlight = false;
        if (result.ok) {
          consecutiveFailures = 0;
          if (result.pulled > 0) notifyXpChanged();
          return;
        }
        // Non-blocking retry: backoff grows until a pass succeeds.
        // Permanent conditions — don't spin on them:
        //   'not-configured' → no cloud env vars in this build.
        //   'no-session' → signed out / stale caller; the auth-state effect
        //   re-runs the pass on sign-in and foreground handles it too.
        if (result.error === 'not-configured' || result.error === 'no-session') return;
        consecutiveFailures += 1;
        const delay = syncRetryDelayMs(consecutiveFailures);
        logger.warn(`sync failed; retrying in ${Math.round(delay / 1000)}s`, {
          attempt: consecutiveFailures,
          error: result.error,
        });
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(run, delay);
      });
    };

    run(); // on sign-in
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run(); // on foreground (also clears backoff sooner)
    });
    return () => {
      sub.remove();
      if (retryTimer) clearTimeout(retryTimer);
    };
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
