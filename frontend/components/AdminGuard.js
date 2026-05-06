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
  }, [session, busy, router]);

  useEffect(() => {
    if (busy || roleLoading) return;
    if (!session) return;
    if (resolvedRole !== 'admin') {
      router.push('/');
    }
  }, [busy, roleLoading, resolvedRole, session, router]);

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