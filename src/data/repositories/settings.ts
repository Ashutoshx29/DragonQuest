import { db } from '../db/client';
import { appSettings } from '../db/schema';

/**
 * Typed settings on a simple KV table. Values are cached in memory after
 * first load; writes update cache and DB together. Add a key by extending
 * SettingsShape and its default.
 */

export interface SettingsShape {
  sound: boolean;
  haptics: boolean;
  onboarded: boolean;
  /** Dev-only FPS badge (F) — never rendered in release builds. */
  devPerfBadge: boolean;
  /** Focus-builder: minutes of the last completed focus setup (local only). */
  lastFocusMinutes: number;
  /** Chosen avatar visual stage ('ember' | 'aura' | 'gold'); '' = not chosen. */
  avatarStage: string;
}

const DEFAULTS: SettingsShape = {
  sound: true,
  haptics: true,
  onboarded: false,
  devPerfBadge: false,
  lastFocusMinutes: 25,
  avatarStage: '',
};

let cache: SettingsShape | null = null;

export async function getSettings(): Promise<SettingsShape> {
  if (cache) return cache;
  const rows = await db.select().from(appSettings);
  const stored: Partial<SettingsShape> = {};
  for (const row of rows) {
    // Parse explicitly per key — boolean flags and numeric settings share
    // the same KV table, and each key states its own decode rule.
    switch (row.key) {
      case 'sound':
        stored.sound = row.value === 'true';
        break;
      case 'haptics':
        stored.haptics = row.value === 'true';
        break;
      case 'onboarded':
        stored.onboarded = row.value === 'true';
        break;
      case 'devPerfBadge':
        stored.devPerfBadge = row.value === 'true';
        break;
      case 'lastFocusMinutes': {
        const numeric = Number(row.value);
        if (Number.isFinite(numeric)) stored.lastFocusMinutes = numeric;
        break;
      }
      case 'avatarStage':
        stored.avatarStage = row.value;
        break;
    }
  }
  cache = { ...DEFAULTS, ...stored };
  return cache;
}

export async function setSetting<K extends keyof SettingsShape>(
  key: K,
  value: SettingsShape[K]
): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value: String(value) })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: String(value) } });
  if (cache) cache = { ...cache, [key]: value };
}

export function clearSettingsCache(): void {
  cache = null;
}
