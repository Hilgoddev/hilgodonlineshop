import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { syncProfile } from '../lib/apiClient';

const AuthContext = createContext({
  data: null,
  status: 'loading'
});

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profileRole, setProfileRole] = useState(null);
  const [status, setStatus] = useState('loading');

  const loadProfileRole = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.access_token) return null;
      const res = await fetch('/api/user/profile', {
        headers: { Authorization: `Bearer ${data.session.access_token}` }
      });
      const json = await res.json();
      if (json.success) return json.data?.role || null;
      return null;
    } catch (_) {
      return null;
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setStatus(session ? 'authenticated' : 'unauthenticated');
      if (session) {
        try { await syncProfile(); } catch (_) {}
        const role = await loadProfileRole();
        setProfileRole(role);
      } else {
        setProfileRole(null);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setStatus(session ? 'authenticated' : 'unauthenticated');
      if (session) {
        try { await syncProfile(); } catch (_) {}
        const role = await loadProfileRole();
        setProfileRole(role);
      } else {
        setProfileRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Format session to match next-auth structure somewhat
  const getNameParts = (user) => {
    const fullName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.identities?.[0]?.identity_data?.full_name ||
      user?.identities?.[0]?.identity_data?.name ||
      '';
    const parts = String(fullName).trim().split(' ').filter(Boolean);
    if (parts.length) return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
    const local = String(user?.email || '').split('@')[0] || 'User';
    return { firstName: local, lastName: '' };
  };

  const formattedSession = session ? {
    user: {
      id: session.user.id,
      email: session.user.email,
      ...getNameParts(session.user),
      image: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
      role: profileRole || session.user.user_metadata?.role || 'customer'
    },
    ...session
  } : null;

  return (
    <AuthContext.Provider value={{ data: formattedSession, status }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSession() {
  return useContext(AuthContext);
}

export async function signOut(options = {}) {
  await supabase.auth.signOut();
  if (options.callbackUrl) {
    window.location.href = options.callbackUrl;
  }
}
