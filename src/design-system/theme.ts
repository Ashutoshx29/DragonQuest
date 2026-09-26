import { useMemo } from 'react';

import { palette } from './tokens';

/**
 * Semantic theme — components consume these roles, never raw palette values,
 * so re-theming (e.g. "power mode" accents or a light theme) is a one-file job.
 */
export interface Theme {
  bg: string;
  surface: string;
  surfaceElevated: string;
  surfaceSunken: string;
  border: string;
  borderSubtle: string;
  text: string;
  textBright: string;
  textDim: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  accentDim: string;
  power: string;
  gold: string;
  success: string;
  danger: string;
  warning: string;
  ember: string;
  mind: string;
  energy: string;
  xpFill: string;
  xpTrack: string;
  attrPower: string;
  attrFocus: string;
  attrDiscipline: string;
  attrMind: string;
  attrEnergy: string;
}

export const auraTheme: Theme = {
  bg: palette.void,
  surface: palette.night,
  surfaceElevated: palette.steel,
  surfaceSunken: palette.slate,
  border: palette.line,
  borderSubtle: palette.graphite,
  text: palette.text,
  textBright: palette.textBright,
  textDim: palette.textDim,
  textFaint: palette.textFaint,
  accent: palette.aura,
  accentSoft: palette.auraSoft,
  accentDim: palette.auraDim,
  power: palette.power,
  gold: palette.gold,
  success: palette.success,
  danger: palette.danger,
  warning: palette.warning,
  ember: palette.ember,
  mind: palette.mind,
  energy: palette.energy,
  xpFill: palette.xpFill,
  xpTrack: palette.xpTrack,
  attrPower: palette.attrPower,
  attrFocus: palette.attrFocus,
  attrDiscipline: palette.attrDiscipline,
  attrMind: palette.attrMind,
  attrEnergy: palette.attrEnergy,
};

/** Hook access to the app theme. Swap here when themes become dynamic. */
export function useAppTheme(): Theme {
  return useMemo(() => auraTheme, []);
}
