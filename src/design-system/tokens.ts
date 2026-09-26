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

  // Text — dim/faint lifted for WCAG-ish contrast on the dark bg
  textBright: '#F4F6FB',
  text: '#DCE1EC',
  textDim: '#9AA3B8',
  textFaint: '#6E7689',

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

  // Mind / Energy semantic accents (reduce cyan overload)
  mind: '#A78BFA',
  mindDim: 'rgba(167, 139, 250, 0.15)',
  energy: '#4ADE80',
  energyDim: 'rgba(74, 222, 128, 0.15)',

  // XP bars / progress — gold reads as "achievement currency", cyan stays
  // for focus/live feedback. Neutral track keeps bars from over-glowing.
  xpFill: '#FFC94D',
  xpTrack: '#1A1E29',

  // Attributes (training RPG stat colors)
  attrPower: '#FF6B35', // physical training — orange/red energy
  attrFocus: '#00E5FF', // deep work / study — electric blue
  attrDiscipline: '#FFC94D', // habit consistency — gold
  attrMind: '#A78BFA', // meditation / mind training — purple
  attrEnergy: '#4ADE80', // recovery / healthy routines — green
} as const;

/**
 * Attribute definitions — presentation layer of the training-RPG model.
 * Values are DERIVED from existing ledgers (see game/config/attributes.ts);
 * this map only carries the visual identity (color + ionicon + label).
 */
export const attributeMeta = {
  power: { label: 'POWER', color: palette.attrPower, icon: 'barbell' },
  focus: { label: 'FOCUS', color: palette.attrFocus, icon: 'flash' },
  discipline: { label: 'DISCIPLINE', color: palette.attrDiscipline, icon: 'shield-checkmark' },
  mind: { label: 'MIND', color: palette.attrMind, icon: 'leaf' },
  energy: { label: 'ENERGY', color: palette.attrEnergy, icon: 'battery-charging' },
} as const;

export type AttributeKey = keyof typeof attributeMeta;

/**
 * Product glossary — the UI speaks "training RPG"; the data layer speaks
 * "habits/tasks". Screens use these labels so renaming the presentation is
 * a one-file change and the DB/repository interfaces stay stable.
 */
export const GLOSSARY = {
  habit: 'Mission',
  task: 'Objective',
  routine: 'Ritual',
  goal: 'Grand Quest',
  workout: 'Physical Training',
  meditation: 'Mind Training',
  focusSession: 'Focus Training',
  journal: 'Journal',
  streak: 'Training Streak',
  attributes: 'Attributes',
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

// ── Named quest palettes (habit/category colors) ──────────────────────────
export const questPalettes = {
  body: { base: '#FF6B35', soft: '#FFA270', dim: 'rgba(255, 107, 53, 0.15)' },
  mind: { base: '#00E5FF', soft: '#66F0FF', dim: 'rgba(0, 229, 255, 0.15)' },
  spirit: { base: '#A78BFA', soft: '#C9B8FF', dim: 'rgba(167, 139, 250, 0.15)' },
  craft: { base: '#4ADE80', soft: '#9AF0B8', dim: 'rgba(74, 222, 128, 0.15)' },
  social: { base: '#F472B6', soft: '#FBAEDB', dim: 'rgba(244, 114, 182, 0.15)' },
} as const;

export type QuestPaletteKey = keyof typeof questPalettes;

// ── Gradient presets (expo-linear-gradient) ───────────────────────────────
// Restrained by design: gradients appear ONLY on hero panels (character
// header, reward overlay, primary CTA) — never on every card.
export const gradients = {
  hero: ['#12151D', '#07080C'] as const,
  heroAccent: ['#12202B', '#07080C'] as const,
  cta: ['#00C2D9', '#0088A8'] as const,
  gold: ['#3A2E12', '#12151D'] as const,
  power: ['#2B1608', '#07080C'] as const,
} as const;
