import 'expo-sqlite/localStorage/install';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

/**
 * Supabase client (Phase 6).
 *
 * - Session persistence rides on expo-sqlite's localStorage (already part of
 *   the app's native stack — no new native module), keeping users signed in
 *   across launches. Verified against the current Expo "Using Supabase" guide.
 * - Token auto-refresh is bound to AppState (start on active, stop on
 *   background) per the same guide.
 * - The client is created LAZILY and is null when the EXPO_PUBLIC_SUPABASE_*
 *   variables are absent, so development builds without a linked project
 *   behave exactly like Phase 5 (fully local) instead of crashing.
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** True when a Supabase project is configured for this build. */
export const isCloudConfigured = Boolean(supabaseUrl && supabasePublishableKey);

let client: SupabaseClient | null = null;

/** The shared client, or null when cloud features are not configured. */
export function getSupabase(): SupabaseClient | null {
  if (!isCloudConfigured) return null;
  if (!client) {
    client = createClient(supabaseUrl as string, supabasePublishableKey as string, {
      auth: {
        storage: globalThis.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    // Refresh tokens only while the app is foregrounded (official guidance).
    AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        client?.auth.startAutoRefresh();
      } else {
        client?.auth.stopAutoRefresh();
      }
    });
  }
  return client;
}
