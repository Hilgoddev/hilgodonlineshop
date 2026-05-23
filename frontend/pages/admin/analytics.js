import { useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminJson, errorMessage } from '../../lib/adminApi';
import { useCurrency } from '@/contexts/CurrencyContext';

const STATUS_COLORS = {
  pending: '#f59e0b',
  processing: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444',
  paid: '#10b981',
};

export default function AdminAnalytics() {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const { res, json } = await adminJson('/api/admin/stats');
      if (!res.ok) {
        setError(errorMessage(json, 'Could not load analytics'));
      } else {
        setStats(json?.data || null);
      }
      setLoading(false);
    })();
  }, []);

  const totalPending =
    (stats?.analytics?.pendingProductsCount || 0) +
    (stats?.analytics?.pendingStoresCount || 0) +
    (stats?.analytics?.pendingSellerAppsCount || 0);

  const ordersByStatus = (stats?.recentOrders || []).reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const maxOrderCount = Math.max(...Object.values(ordersByStatus), 1);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#38bdf8' }}></i>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px' }}>{error}</div>
    );
  }

  return (
    <>
      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard icon="fa-naira-sign" label="Platform Revenue" value={formatPrice(Number(stats?.revenue || 0), 'NGN', false)} accent="#10b981" />
        <StatCard icon="fa-shopping-cart" label="Total Orders" value={stats?.orders || 0} accent="#3b82f6" />
        <StatCard icon="fa-users" label="Registered Users" value={stats?.customers || 0} accent="#8b5cf6" />
        <StatCard icon="fa-box" label="Total Products" value={stats?.products || 0} accent="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        {/* Pending Approvals Breakdown */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '16px', fontSize: '1rem', color: '#0f172a' }}>
            <i className="fas fa-clipboard-check" style={{ color: '#f59e0b', marginRight: '8px' }}></i>
            Pending Approvals
          </h3>
          {totalPending === 0 ? (
            <div style={{ color: '#64748b', fontSize: '.9rem', padding: '12px 0' }}>
              <i className="fas fa-circle-check" style={{ color: '#10b981', marginRight: '8px' }}></i>
              All caught up — nothing pending.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ApprovalRow label="Products" count={stats?.analytics?.pendingProductsCount || 0} href="/admin/approvals" color="#f59e0b" />
              <ApprovalRow label="Stores" count={stats?.analytics?.pendingStoresCount || 0} href="/admin/stores" color="#3b82f6" />
              <ApprovalRow label="Seller Applications" count={stats?.analytics?.pendingSellerAppsCount || 0} href="/admin/approvals" color="#8b5cf6" />
            </div>
          )}
        </div>

        {/* Review Stats */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '16px', fontSize: '1rem', color: '#0f172a' }}>
            <i className="fas fa-star" style={{ color: '#fbbf24', marginRight: '8px' }}></i>
            Product Reviews
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                {stats?.analytics?.averageRating?.toFixed(1) || '0.0'}
                <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500, marginLeft: '6px' }}>/ 5.0</span>
              </div>
              <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
                {[...Array(5)].map((_, i) => (
                  <i
                    key={i}
                    className={`fas ${i < Math.floor(stats?.analytics?.averageRating || 0) ? 'fa-star' : i < (stats?.analytics?.averageRating || 0) ? 'fa-star-half-alt' : 'far fa-star'}`}
                    style={{ color: '#fbbf24', fontSize: '1.1rem' }}
                  />
                ))}
              </div>
            </div>
            <div style={{ color: '#64748b', fontSize: '.88rem' }}>
              Based on <strong style={{ color: '#0f172a' }}>{(stats?.analytics?.totalReviews || 0).toLocaleString()}</strong> total review{stats?.analytics?.totalReviews !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Status Breakdown */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: '20px' }}>
        <h3 style={{ fontWeight: 700, marginBottom: '16px', fontSize: '1rem', color: '#0f172a' }}>
          <i className="fas fa-chart-bar" style={{ color: '#3b82f6', marginRight: '8px' }}></i>
          Recent Orders by Status
          <span style={{ fontSize: '.78rem', fontWeight: 400, color: '#64748b', marginLeft: '8px' }}>last 10 orders</span>
        </h3>
        {Object.keys(ordersByStatus).length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '.9rem' }}>No orders placed yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(ordersByStatus).map(([status, count]) => (
              <div key={status}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '.88rem', fontWeight: 600, textTransform: 'capitalize', color: '#334155' }}>{status}</span>
                  <span style={{ fontSize: '.88rem', fontWeight: 700, color: STATUS_COLORS[status] || '#64748b' }}>{count}</span>
                </div>
                <div style={{ height: '8px', borderRadius: '99px', background: '#f1f5f9', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: '99px',
                    background: STATUS_COLORS[status] || '#94a3b8',
                    width: `${(count / maxOrderCount) * 100}%`,
                    transition: 'width .6s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low Stock Alert */}
      {(stats?.lowStock || []).length > 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '16px', fontSize: '1rem', color: '#0f172a' }}>
            <i className="fas fa-triangle-exclamation" style={{ color: '#ef4444', marginRight: '8px' }}></i>
            Low Stock Products
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats.lowStock.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fef2f2', borderRadius: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '.9rem', color: '#0f172a' }}>{p.name}</span>
                <span style={{ fontWeight: 800, fontSize: '.88rem', color: Number(p.stock) === 0 ? '#ef4444' : '#f59e0b' }}>
                  {Number(p.stock)} left
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`fas ${icon}`} style={{ color: accent, fontSize: '1rem' }}></i>
        </div>
        <span style={{ fontSize: '.8rem', color: '#64748b', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#0f172a' }}>{value}</div>
    </div>
  );
}

function ApprovalRow({ label, count, href, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '.9rem', color: '#334155' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontWeight: 800, fontSize: '.95rem', color: count > 0 ? color : '#94a3b8' }}>{count}</span>
        {count > 0 && (
          <a href={href} style={{ fontSize: '.75rem', color, textDecoration: 'underline', fontWeight: 600 }}>Review</a>
        )}
      </div>
    </div>
  );
}

AdminAnalytics.getLayout = function getLayout(page) {
  return (
    <AdminGuard>
      <AdminLayout title="Analytics">{page}</AdminLayout>
    </AdminGuard>
  );
};
