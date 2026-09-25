/**
 * App-wide constants (non-visual).
 */

export const APP_NAME = 'DragonQuest';
export const APP_TAGLINE = 'Train. Level up. Become.';

/** Tab route names — keep in sync with src/app/(tabs)/ */
export const TAB_ROUTES = ['today', 'quests', 'training', 'progress', 'profile'] as const;
export type TabRoute = (typeof TAB_ROUTES)[number];
