import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({
  data: null,
  status: 'loading'
});

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setStatus(session ? 'authenticated' : 'unauthenticated');
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setStatus(session ? 'authenticated' : 'unauthenticated');
    });

    return () => subscription.unsubscribe();
  }, []);

  // Format session to match next-auth structure somewhat
  const formattedSession = session ? {
    user: {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.user_metadata?.full_name?.split(' ')[0] || '',
      lastName: session.user.user_metadata?.full_name?.split(' ')[1] || '',
      role: session.user.user_metadata?.role || 'user'
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
