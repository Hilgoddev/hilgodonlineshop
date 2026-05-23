import { useSession } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiClient';

export default function AdminGuard({ children }) {
  const { data: session, status, profileLoading } = useSession();
  const router = useRouter();
  const busy = status === 'loading' || profileLoading;
  const [resolvedRole, setResolvedRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const resolveRole = async () => {
      if (busy) return;
      if (!session) {
        setRoleLoading(false);
        router.push('/auth/login');
        return;
      }

      // Role already resolved — don't re-fetch or show spinner on token refresh/focus
      if (resolvedRole !== null) return;

      setRoleLoading(true);
      const clientRole = session.user?.role || null;
      const sessionToken = session?.access_token || null;
      try {
        const meRes = await apiFetch('/api/auth/me', { accessToken: sessionToken });
        const meData = await meRes.json();
        const authoritativeRole = meData?.data?.role || clientRole;
        if (!cancelled) setResolvedRole(authoritativeRole);
      } catch (_) {
        if (!cancelled) setResolvedRole(clientRole);
      } finally {
        if (!cancelled) setRoleLoading(false);
      }
    };

    resolveRole();
    return () => {
      cancelled = true;
    };
  // Use session.user?.id instead of full session object so token refreshes
  // (which create a new session reference but same user) don't re-trigger the role check
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, busy]);

  useEffect(() => {
    if (busy || roleLoading) return;
    if (!session) return;
    if (resolvedRole !== 'admin') {
      router.push('/');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, roleLoading, resolvedRole, session?.user?.id]);

  if (busy || roleLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
      </div>
    );
  }

  if (!session || resolvedRole !== 'admin') {
    return null;
  }

  return children;
}