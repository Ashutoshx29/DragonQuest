import {
  ATTRIBUTE_KEYS,
  XP_SOURCE_ATTRIBUTES,
  attributeNextRank,
  attributeRankProgress,
  attributeTier,
} from '../config/attributes';
import type { AttributeKey } from '../config/attributes';

/**
 * Attribute engine (pure) — same pattern as missions/streaks engines:
 * no DB access here; the repository feeds in ledger rows and this module
 * shapes them into view models the UI can render directly.
 */

export interface AttributeLedgerRow {
  /** XP ledger source (xp_transactions.source). */
  source: string;
  amount: number;
  /** ISO timestamp of the transaction. */
  createdAt: string;
  /** Local day string (YYYY-MM-DD) the transaction belongs to. */
  day: string;
}

export interface AttributeView {
  key: AttributeKey;
  /** Total XP ever contributed to this attribute (= attribute score). */
  xp: number;
  /** XP contributed today. */
  xpToday: number;
  /** 0..1 progress through the CURRENT RANK BAND — reads well at low values. */
  progress: number;
  /** Mastery tier label (E..S). */
  tier: string;
  /** Next rank label + XP threshold, or null at rank S. */
  nextRank: { label: string; at: number } | null;
}

export type AttributeViews = Record<AttributeKey, AttributeView>;

/** Aggregate ledger rows into per-attribute views (pure). */
export function buildAttributeViews(
  rows: AttributeLedgerRow[],
  today: string
): AttributeViews {
  const views = {} as AttributeViews;
  for (const key of ATTRIBUTE_KEYS) {
    views[key] = {
      key,
      xp: 0,
      xpToday: 0,
      progress: 0,
      tier: attributeTier(0),
      nextRank: attributeNextRank(0),
    };
  }

  for (const row of rows) {
    if (row.amount <= 0) continue; // corrections (negative) never deduct attributes
    const attr = XP_SOURCE_ATTRIBUTES[row.source];
    if (!attr) continue; // unknown sources are ignored until mapped
    views[attr].xp += row.amount;
    if (row.day === today) views[attr].xpToday += row.amount;
  }

  for (const key of ATTRIBUTE_KEYS) {
    views[key].progress = attributeRankProgress(views[key].xp);
    views[key].tier = attributeTier(views[key].xp);
    views[key].nextRank = attributeNextRank(views[key].xp);
  }
  return views;
}

/**
 * Attribute gains for a specific completion — used by the reward overlay to
 * announce "POWER +2 / DISCIPLINE +1" style feedback (pure).
 */
export function attributeGainForSource(
  source: string,
  xpAwarded: number
): { attribute: AttributeKey; xp: number } | null {
  if (xpAwarded <= 0) return null;
  const attr = XP_SOURCE_ATTRIBUTES[source];
  if (!attr) return null;
  return { attribute: attr, xp: xpAwarded };
}
