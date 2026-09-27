import type { Stage } from '@/design-system/components/CharacterAvatar';

/** Stage applied to the avatar when the player has not chosen one. */
export const DEFAULT_AVATAR_STAGE: Stage = 'aura';

/**
 * Which stage to render (pure). A chosen stage always wins; otherwise the
 * avatar evolves with rank (Gold from level 15, Aura below). One rule, used
 * by Home, Profile, and anywhere identity is shown.
 */
export function resolveAvatarStage(chosen: string | null, level: number | null | undefined): Stage {
  if (chosen === 'ember' || chosen === 'aura' || chosen === 'gold') return chosen;
  return level != null && level >= 15 ? 'gold' : DEFAULT_AVATAR_STAGE;
}
