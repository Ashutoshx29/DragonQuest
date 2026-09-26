/**
 * Achievement definitions — content + tuning live here.
 * Criteria are evaluated by game/engine/achievements.ts against a stats
 * snapshot. Add an achievement by adding a def; no engine/UI changes needed
 * unless you invent a new criteria kind.
 *
 * All names/lore are ORIGINAL — generic training-arc flavor only.
 */

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'legendary';

export type AchievementCriteria =
  | { kind: 'completions_total'; threshold: number }
  | { kind: 'xp_total'; threshold: number }
  | { kind: 'level_reach'; threshold: number }
  | { kind: 'habit_streak_best'; threshold: number }
  | { kind: 'global_streak_best'; threshold: number }
  | { kind: 'early_completions'; threshold: number } // completed before 8am
  | { kind: 'habits_created'; threshold: number };

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  tier: AchievementTier;
  xpReward: number;
  icon: string; // Ionicons name
  criteria: AchievementCriteria;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_step',
    title: 'First Step',
    description: 'Complete your first mission',
    tier: 'bronze',
    xpReward: 25,
    icon: 'footsteps',
    criteria: { kind: 'completions_total', threshold: 1 },
  },
  {
    id: 'ten_done',
    title: 'Warming Up',
    description: 'Complete 10 missions',
    tier: 'bronze',
    xpReward: 50,
    icon: 'flame',
    criteria: { kind: 'completions_total', threshold: 10 },
  },
  {
    id: 'fifty_done',
    title: 'Momentum',
    description: 'Complete 50 missions',
    tier: 'silver',
    xpReward: 150,
    icon: 'trending-up',
    criteria: { kind: 'completions_total', threshold: 50 },
  },
  {
    id: 'hundred_done',
    title: 'Relentless',
    description: 'Complete 100 missions',
    tier: 'gold',
    xpReward: 400,
    icon: 'infinite',
    criteria: { kind: 'completions_total', threshold: 100 },
  },
  {
    id: 'xp_1000',
    title: 'Kindled',
    description: 'Earn 1,000 total XP',
    tier: 'bronze',
    xpReward: 50,
    icon: 'sparkles',
    criteria: { kind: 'xp_total', threshold: 1000 },
  },
  {
    id: 'xp_10000',
    title: 'Blazing Aura',
    description: 'Earn 10,000 total XP',
    tier: 'gold',
    xpReward: 500,
    icon: 'bonfire',
    criteria: { kind: 'xp_total', threshold: 10000 },
  },
  {
    id: 'level_5',
    title: 'Rising Fighter',
    description: 'Reach level 5',
    tier: 'silver',
    xpReward: 100,
    icon: 'arrow-up-circle',
    criteria: { kind: 'level_reach', threshold: 5 },
  },
  {
    id: 'level_10',
    title: 'Discipline Forged',
    description: 'Reach level 10',
    tier: 'gold',
    xpReward: 300,
    icon: 'medal',
    criteria: { kind: 'level_reach', threshold: 10 },
  },
  {
    id: 'streak_7',
    title: 'One Week Strong',
    description: 'Keep any habit for 7 days straight',
    tier: 'bronze',
    xpReward: 75,
    icon: 'calendar',
    criteria: { kind: 'habit_streak_best', threshold: 7 },
  },
  {
    id: 'streak_30',
    title: 'Unbroken',
    description: 'Keep any habit for 30 days straight',
    tier: 'gold',
    xpReward: 500,
    icon: 'shield',
    criteria: { kind: 'habit_streak_best', threshold: 30 },
  },
  {
    id: 'streak_100',
    title: 'Iron Will',
    description: 'Keep any habit for 100 days straight',
    tier: 'legendary',
    xpReward: 2000,
    icon: 'diamond',
    criteria: { kind: 'habit_streak_best', threshold: 100 },
  },
  {
    id: 'global_7',
    title: 'Daily Devotion',
    description: '7-day global streak',
    tier: 'bronze',
    xpReward: 75,
    icon: 'flame',
    criteria: { kind: 'global_streak_best', threshold: 7 },
  },
  {
    id: 'global_30',
    title: 'Eternal Flame',
    description: '30-day global streak',
    tier: 'gold',
    xpReward: 600,
    icon: 'flame',
    criteria: { kind: 'global_streak_best', threshold: 30 },
  },
  {
    id: 'dawn_patrol',
    title: 'Dawn Patrol',
    description: 'Complete 5 missions before 8am',
    tier: 'silver',
    xpReward: 150,
    icon: 'sunny',
    criteria: { kind: 'early_completions', threshold: 5 },
  },
  {
    id: 'architect',
    title: 'The Architect',
    description: 'Create 5 habits',
    tier: 'bronze',
    xpReward: 50,
    icon: 'construct',
    criteria: { kind: 'habits_created', threshold: 5 },
  },
];

export const TIER_META: Record<AchievementTier, { label: string; color: string }> = {
  bronze: { label: 'Bronze', color: '#CD8A54' },
  silver: { label: 'Silver', color: '#B8C0CC' },
  gold: { label: 'Gold', color: '#FFC94D' },
  legendary: { label: 'Legendary', color: '#A78BFA' },
};
