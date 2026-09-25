/**
 * Training challenge programs — content + tuning live here.
 * Runs are tracked in user_challenges; logic in game/engine/challenges.ts.
 * All names/lore are ORIGINAL — generic training-arc flavor only.
 */

export interface ChallengeDef {
  id: string;
  title: string;
  description: string;
  /** Program length in days. */
  durationDays: 7 | 14 | 30;
  /** Completions required per day to count the day as "hit". */
  requiredPerDay: number;
  /** Minimum hit days to complete the program. */
  minHitDays: number;
  xpReward: number;
  icon: string; // Ionicons name
  accent: string;
}

export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'iron_week',
    title: 'Iron Week',
    description: 'One quest a day, seven days straight. Forge the habit of showing up.',
    durationDays: 7,
    requiredPerDay: 1,
    minHitDays: 7,
    xpReward: 150,
    icon: 'barbell',
    accent: '#FF6B35',
  },
  {
    id: 'twin_forge',
    title: 'Twin Forge',
    description: 'Two quests a day for two weeks. Build the rhythm of consistency.',
    durationDays: 14,
    requiredPerDay: 2,
    minHitDays: 12,
    xpReward: 400,
    icon: 'hammer',
    accent: '#00E5FF',
  },
  {
    id: 'ascension',
    title: 'Ascension Protocol',
    description: 'Three quests a day for a full month. The long climb begins.',
    durationDays: 30,
    requiredPerDay: 3,
    minHitDays: 26,
    xpReward: 1200,
    icon: 'rocket',
    accent: '#A78BFA',
  },
];
