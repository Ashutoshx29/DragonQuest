/**
 * DragonQuest — Design Tokens
 * ---------------------------
 * Single source of truth for every visual constant in the app.
 * Raw values live here; semantic themes (theme.ts) reference them.
 * Change the look of the whole app from this file.
 *
 * Visual direction: dark "training dimension" background, high-contrast
 * text, and an electric aura accent for energy/power feedback.
 */

// ── Raw palette ──────────────────────────────────────────────────────────────
// Semantic color roles are defined in theme.ts and reference these.

export const palette = {
  // Backgrounds (dark "training dimension")
  void: '#07080C',
  night: '#0C0E14',
  slate: '#12151D',
  steel: '#1A1E29',
  graphite: '#232837',
  line: '#2C3242',

  // Text
  textBright: '#F4F6FB',
  text: '#D7DCE8',
  textDim: '#8B93A7',
  textFaint: '#5A6172',

  // Aura (primary accent — electric cyan)
  aura: '#00E5FF',
  auraDeep: '#0092A8',
  auraSoft: '#66F0FF',
  auraDim: 'rgba(0, 229, 255, 0.15)',

  // Power (secondary accent — energy/blaze)
  power: '#FF6B35',
  powerSoft: '#FFA270',

  // Achievement (gold tier)
  gold: '#FFC94D',
  goldSoft: '#FFE3A3',

  // Feedback
  success: '#4ADE80',
  successDim: 'rgba(74, 222, 128, 0.15)',
  danger: '#F87171',
  dangerDim: 'rgba(248, 113, 113, 0.15)',
  warning: '#FBBF24',

  // Streak (ember)
  ember: '#FF8C42',
  emberDim: 'rgba(255, 140, 66, 0.18)',

  // XP bars / progress
  xpFill: '#00E5FF',
  xpTrack: '#1A1E29',
} as const;

// ── Spacing scale (4pt grid) ────────────────────────────────────────────────
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// ── Radii ────────────────────────────────────────────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
} as const;

// ── Typography scale ────────────────────────────────────────────────────────
export const typography = {
  display: { fontSize: 34, lineHeight: 42, fontWeight: '800' },
  title: { fontSize: 26, lineHeight: 34, fontWeight: '800' },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  mono: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
} as const;

// ── Named quest palettes (habit/category colors) ────────────────────────────
export const questPalettes = {
  body: { base: '#FF6B35', soft: '#FFA270', dim: 'rgba(255, 107, 53, 0.15)' },
  mind: { base: '#00E5FF', soft: '#66F0FF', dim: 'rgba(0, 229, 255, 0.15)' },
  spirit: { base: '#A78BFA', soft: '#C9B8FF', dim: 'rgba(167, 139, 250, 0.15)' },
  craft: { base: '#4ADE80', soft: '#9AF0B8', dim: 'rgba(74, 222, 128, 0.15)' },
  social: { base: '#F472B6', soft: '#FBAEDB', dim: 'rgba(244, 114, 182, 0.15)' },
} as const;

export type QuestPaletteKey = keyof typeof questPalettes;
