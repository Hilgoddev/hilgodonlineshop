import { useSession } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function SellerGuard({ children }) {
  const { data: session, status, profileLoading } = useSession();
  const router = useRouter();
  const busy = status === 'loading' || profileLoading;

  useEffect(() => {
    if (busy) return;
    if (!session) {
      router.push('/auth/login');
      return;
    }
    if (!['seller', 'admin'].includes(session.user?.role)) {
      router.push('/seller-zone');
    }
  }, [session, status, profileLoading, busy, router]);

  if (busy) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
      </div>
    );
  }

  if (!session || !['seller', 'admin'].includes(session.user?.role)) {
    return null;
  }

  return children;
}
