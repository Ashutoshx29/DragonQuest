import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { createLogger } from '@/services/logger';
import { getSupabase, isCloudConfigured } from '@/lib/supabase';

const logger = createLogger('auth');

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_stage: string;
}

interface AuthContextValue {
  status: AuthStatus;
  userId: string | null;
  profile: Profile | null;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  status: isCloudConfigured ? 'loading' : 'signedOut',
  userId: null,
  profile: null,
  signInWithPassword: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

/**
 * Auth state at the app root. Signed-out usage remains fully local — the
 * provider only ADDS a session signal; nothing in the app requires it.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(isCloudConfigured ? 'loading' : 'signedOut');
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  /** Fetch the profile row for `id` — called from session callbacks only. */
  const fetchProfile = useCallback(async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_stage')
      .eq('id', id)
      .maybeSingle();
    if (!error && data) setProfile(data as Profile);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return; // cloud not configured → permanently signedOut/local

    let mounted = true;

    // Initial session restore (persisted via expo-sqlite localStorage).
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data.session;
      if (session?.user) {
        setUserId(session.user.id);
        setStatus('signedIn');
        void fetchProfile(session.user.id);
      } else {
        setStatus('signedOut');
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUserId(session.user.id);
        setStatus('signedIn');
        void fetchProfile(session.user.id);
      } else {
        setUserId(null);
        setProfile(null);
        setStatus('signedOut');
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Cloud sync is not configured in this build.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logger.warn('sign-in failed', error.message);
      return { error: error.message };
    }
    return {};
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Cloud sync is not configured in this build.' };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      logger.warn('sign-up failed', error.message);
      return { error: error.message };
    }
    // Decision B: email confirmation stays ON — no session until confirmed.
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
    setUserId(null);
    setProfile(null);
    setStatus('signedOut');
  }, []);

  /** Re-fetch the signed-in user's profile row. */
  const refreshProfile = useCallback(async () => {
    if (userId) await fetchProfile(userId);
  }, [userId, fetchProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, userId, profile, signInWithPassword, signUp, signOut, refreshProfile }),
    [status, userId, profile, signInWithPassword, signUp, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
