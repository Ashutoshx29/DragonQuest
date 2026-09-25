/**
 * Global streak — tuning values live here.
 *
 * The global streak counts consecutive days with at least
 * GLOBAL_STREAK_MIN_COMPLETIONS completed quests. Per-habit streaks live in
 * game/engine/streaks.ts; this config governs the "keep the flame alive"
 * threshold shown on the Today dashboard.
 */

export const GLOBAL_STREAK_MIN_COMPLETIONS = 1;
