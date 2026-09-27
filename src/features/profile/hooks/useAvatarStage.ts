import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import type { Stage } from '@/design-system/components/CharacterAvatar';
import { getSettings, setSetting } from '@/data/repositories/settings';

const VALID_STAGES: readonly string[] = ['ember', 'aura', 'gold'];

/**
 * The player's chosen avatar stage, persisted in the local settings KV.
 * `null` until the user picks one — callers fall back to the level-derived
 * stage so the avatar still evolves for players who never open the picker.
 *
 * Re-reads on screen focus: tab screens stay mounted, so a change saved in
 * Profile must propagate to Home (and anywhere else) when the user returns.
 * getSettings is memory-cached, so this is cheap.
 */
export function useAvatarStage() {
  const [stage, setStage] = useState<Stage | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void getSettings().then((s) => {
        if (!alive) return;
        setStage(VALID_STAGES.includes(s.avatarStage) ? (s.avatarStage as Stage) : null);
      });
      return () => {
        alive = false;
      };
    }, [])
  );

  const save = useCallback(async (next: Stage) => {
    setStage(next);
    await setSetting('avatarStage', next);
  }, []);

  return { stage, save };
}
