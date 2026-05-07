import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { apiFetch, syncProfile } from '../lib/apiClient';

const AuthContext = createContext({
  data: null,
  status: 'loading',
  profileLoading: true,
});

function mergeProfile(prev, next, userId) {
  if (next) return next;
  if (prev && userId && prev.id === userId) return prev;
  return null;
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [dbProfile, setDbProfile] = useState(null);
  const [status, setStatus] = useState('loading');
  const [profileLoading, setProfileLoading] = useState(true);

  const loadProfile = async (retryCount = 0) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user?.id) return null;
      const accessToken = sessionData.session.access_token;

      try {
        const meRes = await apiFetch('/api/auth/me', { accessToken });
        if (meRes.ok) {
          const meJson = await meRes.json();
          if (meJson?.data) return meJson.data;
        }
      } catch (_) {}

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .single();

      if (profile) return profile;

      if (error && retryCount < 2) {
        await new Promise(r => setTimeout(r, 1000));
        return loadProfile(retryCount + 1);
      }
      return null;
    } catch (_) {
      return null;
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (!session) {
        setDbProfile(null);
        setProfileLoading(false);
        setStatus('unauthenticated');
        return;
      }
      setProfileLoading(true);
      try {
        await syncProfile();
      } catch (_) {}
      const profile = await loadProfile();
      setDbProfile((prev) => mergeProfile(prev, profile, session.user.id));
      setProfileLoading(false);
      setStatus('authenticated');
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Token silently refreshed in background — just swap the token, no UI flash
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setSession(session);
        return;
      }

      // Tab regained focus and Supabase re-validated the same session — refresh
      // profile silently in the background so the page never goes blank.
      if (event === 'SIGNED_IN') {
        setSession(session);
        if (session) {
          loadProfile().then((profile) => {
            if (profile) setDbProfile((prev) => mergeProfile(prev, profile, session.user.id));
          });
        }
        return;
      }

      // SIGNED_OUT or any other event — full reset
      setSession(session);

      if (!session) {
        setDbProfile(null);
        setProfileLoading(false);
        setStatus('unauthenticated');
        return;
      }

      setStatus('loading');
      setProfileLoading(true);
      try {
        await syncProfile();
      } catch (_) {}
      const profile = await loadProfile();
      setDbProfile((prev) => mergeProfile(prev, profile, session.user.id));
      setProfileLoading(false);
      setStatus('authenticated');
    });

    return () => subscription.unsubscribe();
  }, []);

  // Format session to match next-auth structure somewhat
  const getNameParts = (user, dbProfile) => {
    const fullName =
      dbProfile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.identities?.[0]?.identity_data?.full_name ||
      '';
    const parts = String(fullName).trim().split(' ').filter(Boolean);
    if (parts.length) return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
    const rawLocal = dbProfile?.username || user?.email || 'User';
    const safeLocal = String(rawLocal).includes('@')
      ? String(rawLocal).split('@')[0]
      : String(rawLocal);
    return { firstName: safeLocal || 'User', lastName: '' };
  };

  const formattedSession = session ? {
    ...session,
    user: {
      id: session.user.id,
      email: session.user.email,
      ...getNameParts(session.user, dbProfile),
      image: dbProfile?.avatar_url || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
      role: dbProfile?.role || session.user.user_metadata?.role || 'customer',
      currency: dbProfile?.currency_preference || 'USD'
    },
  } : null;

  return (
    <AuthContext.Provider value={{ data: formattedSession, status, profileLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSession() {
  return useContext(AuthContext);
}

export async function signOut() {
  await supabase.auth.signOut();
}
