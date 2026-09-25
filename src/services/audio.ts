import { createLogger } from './logger';

/**
 * Sound service — Phase 2 stub.
 *
 * Phase 2 only defines the semantic API so call sites can already express
 * intent (`sfx.play('complete')`) without owning audio implementation.
 * Real playback arrives with expo-audio in the animation/juice pass (Phase 9),
 * using short original SFX from src/assets/audio/.
 *
 * Keeping call sites semantic means: adding real audio later = changing this
 * file only, and sounds can be muted via user settings without touching UI.
 */

const logger = createLogger('audio');

export type Sfx =
  | 'complete' // habit/task checked off
  | 'xp' // small XP gain tick
  | 'levelUp' // level-up stinger
  | 'achievement' // achievement unlock
  | 'streak' // streak milestone
  | 'fail'; // failed challenge / error

export interface SoundService {
  play(effect: Sfx): void;
  setEnabled(value: boolean): void;
  isEnabled(): boolean;
}

let enabled = true;

export const sfx: SoundService = {
  play(effect: Sfx) {
    if (!enabled) return;
    // Stub: Phase 9 routes this to expo-audio players.
    logger.debug(`sfx:${effect}`);
  },
  setEnabled(value: boolean) {
    enabled = value;
  },
  isEnabled() {
    return enabled;
  },
};
