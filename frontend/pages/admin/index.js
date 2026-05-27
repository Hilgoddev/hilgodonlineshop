import { useState, useEffect } from 'react';
import { useSession } from '../../contexts/AuthContext';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminJson, errorMessage } from '../../lib/adminApi';
import { useCurrency } from '@/contexts/CurrencyContext';

export default function AdminDashboard() {
  const { formatPrice } = useCurrency();
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    customers: 0,
    revenue: 0,
    recentOrders: [],
    lowStock: [],
    pendingApprovals: 0,
    analytics: {
      totalReviews: 0,
      averageRating: 0,
      pendingProductsCount: 0,
      pendingStoresCount: 0,
      pendingSellerAppsCount: 0,
    },
    loading: true,
  });
  const [loadError, setLoadError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStats((s) => ({ ...s, loading: true }));
    (async () => {
      setLoadError('');
      const { res, json } = await adminJson('/api/admin/stats');
      if (cancelled) return;
      if (!res.ok) {
        setLoadError(errorMessage(json, 'Could not load dashboard'));
        setStats((s) => ({ ...s, loading: false }));
        return;
      }
      const dashboard = json?.data || {};
      setStats({
        products: dashboard.products || 0,
        orders: dashboard.orders || 0,
        customers: dashboard.customers || 0,
        revenue: dashboard.revenue || 0,
        recentOrders: dashboard.recentOrders || [],
        lowStock: dashboard.lowStock || [],
        pendingApprovals: dashboard.pendingApprovals || 0,
        analytics: dashboard.analytics || {
          totalReviews: 0,
          averageRating: 0,
          pendingProductsCount: 0,
          pendingStoresCount: 0,
          pendingSellerAppsCount: 0,
        },
        loading: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const getStatusBadge = (status) => {
    const map = {
      pending: { bg: '#fef3c7', color: '#d97706' },
      processing: { bg: '#dbeafe', color: '#2563eb' },
      shipped: { bg: '#ede9fe', color: '#7c3aed' },
      delivered: { bg: '#dcfce7', color: '#16a34a' },
      cancelled: { bg: '#fee2e2', color: '#ef4444' },
    };
    const s = map[status] || map.pending;
    return {
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '0.78rem',
      fontWeight: '700',
      background: s.bg,
      color: s.color,
      textTransform: 'capitalize',
    };
  };

  const getPayBadge = (ps) => {
    const map = {
      paid: { bg: '#dcfce7', color: '#16a34a' },
      pending: { bg: '#fef3c7', color: '#d97706' },
      failed: { bg: '#fee2e2', color: '#ef4444' },
    };
    const s = map[ps] || map.pending;
    return {
      padding: '3px 8px',
      borderRadius: '4px',
      fontSize: '0.72rem',
      fontWeight: '700',
      background: s.bg,
      color: s.color,
      textTransform: 'capitalize',
    };
  };

  return (
    <>
      <p style={{ color: '#64748b', marginBottom: '20px' }}>
        Welcome back, <strong>{session?.user?.firstName || 'Admin'}</strong>. Here is your store overview.
      </p>

      {loadError ? (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '8px',
            marginBottom: '20px',
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            fontSize: '0.9rem',
          }}
        >
          <i className="fas fa-circle-exclamation" style={{ marginRight: '8px' }} />
          {loadError}
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            style={{
              marginLeft: '16px',
              padding: '4px 14px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div
        className="admin-stat-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {[
          { icon: 'fa-box', label: 'Products', value: stats.products, bg: '#e0f2fe', clr: '#0369a1' },
          { icon: 'fa-shopping-bag', label: 'Orders', value: stats.orders, bg: '#dcfce7', clr: '#15803d' },
          { icon: 'fa-users', label: 'Customers', value: stats.customers, bg: '#fef3c7', clr: '#b45309' },
          { icon: 'fa-naira-sign', label: 'Revenue', title: 'Paid / shipped / delivered orders only', value: formatPrice(stats.revenue, 'NGN', false), bg: '#ede9fe', clr: '#6d28d9' },
          { icon: 'fa-clipboard-check', label: 'Pending', value: stats.pendingApprovals, bg: '#fee2e2', clr: '#b91c1c' },
        ].map((card, i) => (
          <div key={i} className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: card.bg,
                color: card.clr,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                flexShrink: 0,
              }}
            >
              <i className={`fas ${card.icon}`} />
            </div>
            <div>
              <p title={card.title || ''} style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, margin: '0 0 4px' }}>{card.label}</p>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                {stats.loading ? <i className="fas fa-spinner fa-spin" style={{ fontSize: '1rem' }} /> : card.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-dash-grid">
        <div className="card admin-recent-card" style={{ padding: '20px', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>
              <i className="fas fa-clock-rotate-left" style={{ color: 'var(--primary)', marginRight: '8px' }} />
              Recent orders
            </h3>
            <Link href="/admin/orders" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
              View all →
            </Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem', minWidth: '560px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.78rem' }}>
                  <th style={{ padding: '10px 12px' }}>Order</th>
                  <th style={{ padding: '10px 12px' }}>Customer</th>
                  <th style={{ padding: '10px 12px' }}>Amount</th>
                  <th style={{ padding: '10px 12px' }}>Payment</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '28px', textAlign: 'center' }}>
                      <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.4rem', color: 'var(--primary)' }} />
                    </td>
                  </tr>
                ) : stats.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '28px', textAlign: 'center', color: '#64748b' }}>
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  stats.recentOrders.map((order) => (
                    <tr key={order._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px' }}>
                        <Link href="/admin/orders" style={{ fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
                          #{String(order._id).slice(-6).toUpperCase()}
                        </Link>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {order.user?.firstName || 'N/A'} {order.user?.lastName || ''}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700 }}>{formatPrice(order.totalAmount || 0, 'NGN', false)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={getPayBadge(order.paymentStatus)}>{order.paymentStatus || 'pending'}</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={getStatusBadge(order.status)}>{order.status || 'pending'}</span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 12px' }}>
              <i className="fas fa-chart-line" style={{ color: '#0284c7', marginRight: '8px' }} />
              Analytics & ratings
            </h3>
            {stats.loading ? (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <i className="fas fa-spinner fa-spin" />
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '8px', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Average rating</span>
                  <strong>{Number(stats.analytics?.averageRating || 0).toFixed(2)} / 5</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Total reviews</span>
                  <strong>{stats.analytics?.totalReviews || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Pending products</span>
                  <strong>{stats.analytics?.pendingProductsCount || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Pending stores</span>
                  <strong>{stats.analytics?.pendingStoresCount || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Pending seller apps</span>
                  <strong>{stats.analytics?.pendingSellerAppsCount || 0}</strong>
                </div>
              </div>
            )}
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 12px' }}>
              <i className="fas fa-triangle-exclamation" style={{ color: '#d97706', marginRight: '8px' }} />
              Low stock
            </h3>
            {stats.loading ? (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <i className="fas fa-spinner fa-spin" />
              </div>
            ) : stats.lowStock.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>Stock levels look healthy.</p>
            ) : (
              stats.lowStock.map((p) => (
                <div
                  key={p._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: '0.86rem',
                  }}
                >
                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                    {p.name}
                  </span>
                  <span style={{ color: p.stock <= 3 ? '#dc2626' : '#d97706', fontWeight: 700, flexShrink: 0 }}>{p.stock} left</span>
                </div>
              ))
            )}
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 12px' }}>Shortcuts</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="/admin/approvals" className="btn btn-outline" style={{ justifyContent: 'center', fontSize: '0.86rem', width: '100%', boxSizing: 'border-box' }}>
                Pending approvals
              </Link>
              <Link href="/admin/products" className="btn btn-primary" style={{ justifyContent: 'center', fontSize: '0.86rem', width: '100%', boxSizing: 'border-box' }}>
                Manage products
              </Link>
              <Link href="/admin/orders" className="btn btn-outline" style={{ justifyContent: 'center', fontSize: '0.86rem', width: '100%', boxSizing: 'border-box' }}>
                All orders
              </Link>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @media (min-width: 961px) {
          .admin-dash-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 300px;
            gap: 20px;
            align-items: start;
          }
        }
        @media (max-width: 960px) {
          .admin-recent-card {
            margin-bottom: 20px;
          }
        }
      `}</style>
    </>
  );
}

AdminDashboard.getLayout = function getLayout(page) {
  return (
    <AdminGuard>
      <AdminLayout title="Dashboard">{page}</AdminLayout>
    </AdminGuard>
  );
};
