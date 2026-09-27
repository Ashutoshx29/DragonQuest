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
}

const DEFAULTS: SettingsShape = {
  sound: true,
  haptics: true,
  onboarded: false,
  devPerfBadge: false,
};

let cache: SettingsShape | null = null;

export async function getSettings(): Promise<SettingsShape> {
  if (cache) return cache;
  const rows = await db.select().from(appSettings);
  const stored: Partial<SettingsShape> = {};
  for (const row of rows) {
    if (row.key in DEFAULTS) {
      const key = row.key as keyof SettingsShape;
      stored[key] = row.value === 'true';
    }
  }
  cache = { ...DEFAULTS, ...stored };
  return cache;
}

export async function setSetting<K extends keyof SettingsShape>(key: K, value: boolean): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value: String(value) })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: String(value) } });
  if (cache) cache = { ...cache, [key]: value };
}

export function clearSettingsCache(): void {
  cache = null;
}
