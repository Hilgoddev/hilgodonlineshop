import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { syncProfile } from '../../lib/apiClient';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Verifying your email...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // supabase-js with detectSessionInUrl:true automatically exchanges
        // the code/token in the URL hash/query. We just need to wait for
        // the session to be available.
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          setStatus('Email confirmed! Redirecting...');
          try { await syncProfile(); } catch (_) {}
          const redirect = router.query.redirect;
          router.replace(redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/account');
        } else {
          // Give detectSessionInUrl a moment to exchange the token
          await new Promise(r => setTimeout(r, 1500));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            setStatus('Email confirmed! Redirecting...');
            try { await syncProfile(); } catch (_) {}
            router.replace('/account');
          } else {
            setStatus('Verification failed. Please try logging in.');
            setTimeout(() => router.replace('/auth/login'), 2500);
          }
        }
      } catch (err) {
        console.error('[AUTH_CALLBACK]', err.message);
        setStatus('Something went wrong. Redirecting to login...');
        setTimeout(() => router.replace('/auth/login'), 2500);
      }
    };

    handleCallback();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      background: '#f9fafb',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '40px 32px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
        textAlign: 'center',
        maxWidth: '380px',
        width: '100%',
      }}>
        <div style={{ marginBottom: '20px' }}>
          <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '2.5rem', color: '#E31C1C' }} />
        </div>
        <p style={{ color: '#374151', fontSize: '1rem', fontWeight: 500 }}>{status}</p>
      </div>
    </div>
  );
}
