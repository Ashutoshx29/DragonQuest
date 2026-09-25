import * as Haptics from 'expo-haptics';

/**
 * Semantic haptic feedback. Call sites express *meaning* ("a quest was
 * completed"), not raw engine calls — so the physical feel is tunable here,
 * and can be disabled globally via user settings later.
 */

export type HapticEffect =
  | 'tap' // light tick — selections, small toggles
  | 'success' // quest completed
  | 'warning' // destructive confirmations
  | 'error' // something failed
  | 'levelUp'; // big moment — level ups, ceremonies

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function hapticsEnabled(): boolean {
  return enabled;
}

export function haptic(effect: HapticEffect): void {
  if (!enabled) return;
  switch (effect) {
    case 'tap':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      break;
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      break;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      break;
    case 'error':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      break;
    case 'levelUp':
      // Double-impact "power surge" feel.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        .then(() => new Promise((r) => setTimeout(r, 120)))
        .then(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium))
        .catch(() => {});
      break;
  }
}
