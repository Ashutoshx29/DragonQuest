/**
 * Attributes — the training-RPG stat model.
 *
 * Attributes are DERIVED, never persisted: every XP ledger source maps to an
 * attribute and totals are aggregated at read time (see engine/attributes.ts).
 * Adding a new XP source = one entry in XP_SOURCE_ATTRIBUTES.
 *
 * Tuning (soft cap, tiers) lives here so rebalancing never touches UI.
 */

export const ATTRIBUTE_KEYS = ['power', 'focus', 'discipline', 'mind', 'energy'] as const;
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

/**
 * XP ledger source → attribute. Existing sources keep their meaning:
 * habits = consistency (DISCIPLINE), tasks = deep work (FOCUS), routines =
 * healthy structure (ENERGY); rewards land in DISCIPLINE. New training
 * session sources (workout / focus / mind / breath) map directly.
 */
export const XP_SOURCE_ATTRIBUTES: Record<string, AttributeKey> = {
  // Existing ledger sources
  habit: 'discipline',
  task: 'focus',
  routine_item: 'energy',
  mission: 'discipline',
  bonus: 'discipline',
  manual: 'discipline',
  // Training session sources (added in the training redesign)
  workout: 'power',
  focus_session: 'focus',
  mind_training: 'mind',
  breath_training: 'energy',
  journal: 'mind',
};

/** XP at which an attribute's bar reads "full" (it keeps counting past this). */
export const ATTRIBUTE_SOFT_CAP_XP = 2500;

/** Attribute mastery tiers — flavor labels over the raw XP totals. */
export const ATTRIBUTE_TIERS: { min: number; label: string }[] = [
  { min: 0, label: 'E' },
  { min: 250, label: 'D' },
  { min: 750, label: 'C' },
  { min: 1500, label: 'B' },
  { min: 3000, label: 'A' },
  { min: 6000, label: 'S' },
];

/** Tier label for an attribute XP total (pure). */
export function attributeTier(xp: number): string {
  let label = ATTRIBUTE_TIERS[0].label;
  for (const tier of ATTRIBUTE_TIERS) {
    if (xp >= tier.min) label = tier.label;
  }
  return label;
}

/**
 * Progress through the CURRENT rank band (0..1, pure).
 * e.g. xp 120 → band E spans 0..250 → 0.48. Reads well at low values,
 * unlike the soft-cap progress. S is terminal → always 1.
 */
export function attributeRankProgress(xp: number): number {
  const safe = Math.max(0, xp);
  for (let i = 0; i < ATTRIBUTE_TIERS.length; i++) {
    const tier = ATTRIBUTE_TIERS[i];
    if (safe < tier.min) {
      // xp sits inside the previous band
      const prev = ATTRIBUTE_TIERS[i - 1];
      const lo = prev?.min ?? 0;
      const span = tier.min - lo;
      return span > 0 ? Math.min(1, (safe - lo) / span) : 1;
    }
  }
  return 1; // top rank
}

/** Next rank label + threshold, or null at rank S (pure). */
export function attributeNextRank(xp: number): { label: string; at: number } | null {
  const safe = Math.max(0, xp);
  for (const tier of ATTRIBUTE_TIERS) {
    if (safe < tier.min) return { label: tier.label, at: tier.min };
  }
  return null;
}

/** 0..1 bar progress against the soft cap (pure). */
export function attributeProgress(xp: number): number {
  if (ATTRIBUTE_SOFT_CAP_XP <= 0) return 1;
  return Math.min(1, Math.max(0, xp) / ATTRIBUTE_SOFT_CAP_XP);
}
