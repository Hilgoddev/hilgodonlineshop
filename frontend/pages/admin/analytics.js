import { useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminJson, errorMessage } from '../../lib/adminApi';
import { useCurrency } from '@/contexts/CurrencyContext';

const STATUS_COLORS = {
  pending:    '#f59e0b',
  paid:       '#0ea5e9',
  processing: '#3b82f6',
  shipped:    '#8b5cf6',
  delivered:  '#10b981',
  cancelled:  '#ef4444',
};

export default function AdminAnalytics() {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [stats, setStats]   = useState(null);

  useEffect(() => {
    (async () => {
      const { res, json } = await adminJson('/api/admin/stats');
      if (!res.ok) setError(errorMessage(json, 'Could not load analytics'));
      else setStats(json?.data || null);
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#38bdf8' }}></i>
    </div>
  );

  if (error) return (
    <div style={{ padding: '16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px' }}>{error}</div>
  );

  const ordersByStatus  = stats?.ordersByStatus || {};
  const monthlyTrend    = stats?.monthlyTrend   || [];
  const maxStatus       = Math.max(...Object.values(ordersByStatus), 1);
  const maxRevenue      = Math.max(...monthlyTrend.map(m => m.revenue), 1);

  const totalPending =
    (stats?.analytics?.pendingProductsCount   || 0) +
    (stats?.analytics?.pendingStoresCount      || 0) +
    (stats?.analytics?.pendingSellerAppsCount  || 0);

  const fmtMonth = (key) => {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleString('en', { month: 'short', year: '2-digit' });
  };

  return (
    <>
      {/* ── Top metric cards ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard icon="fa-naira-sign"    label="Total Revenue"   value={formatPrice(Number(stats?.revenue || 0), 'NGN', false)} accent="#10b981" />
        <StatCard icon="fa-shopping-cart" label="Total Orders"    value={(stats?.orders    || 0).toLocaleString()} accent="#3b82f6" />
        <StatCard icon="fa-cubes"         label="Units Sold"      value={(stats?.unitsSold || 0).toLocaleString()} accent="#ec4899" />
        <StatCard icon="fa-percent"       label="Commission (10%)" value={formatPrice(Number(stats?.platformCommission || 0), 'NGN', false)} accent="#f59e0b" />
        <StatCard icon="fa-users"         label="Customers"       value={(stats?.customers || 0).toLocaleString()} accent="#8b5cf6" />
        <StatCard icon="fa-store"         label="Sellers"         value={(stats?.sellers   || 0).toLocaleString()} accent="#f59e0b" />
        <StatCard icon="fa-box"           label="Total Products"  value={(stats?.products  || 0).toLocaleString()} accent="#0ea5e9" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>

        {/* ── Orders by status (ALL orders) ────────────────────── */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '4px', fontSize: '1rem' }}>
            <i className="fas fa-chart-bar" style={{ color: '#3b82f6', marginRight: '8px' }}></i>
            Orders by Status
          </h3>
          <p style={{ fontSize: '.75rem', color: 'var(--gray-1)', marginBottom: '16px' }}>All time · {(stats?.orders || 0).toLocaleString()} total</p>
          {Object.keys(ordersByStatus).length === 0 ? (
            <p style={{ color: 'var(--gray-1)', fontSize: '.9rem' }}>No orders yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(ordersByStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <div key={status}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '.85rem', fontWeight: 600, textTransform: 'capitalize' }}>{status}</span>
                      <span style={{ fontSize: '.85rem', fontWeight: 800, color: STATUS_COLORS[status] || '#64748b' }}>
                        {count} <span style={{ fontWeight: 400, color: 'var(--gray-1)', fontSize: '.75rem' }}>
                          ({Math.round((count / (stats?.orders || 1)) * 100)}%)
                        </span>
                      </span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '99px', background: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '99px', background: STATUS_COLORS[status] || '#94a3b8', width: `${(count / maxStatus) * 100}%`, transition: 'width .6s ease' }} />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* ── Pending Approvals ──────────────────────────────────── */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '16px', fontSize: '1rem' }}>
            <i className="fas fa-clipboard-check" style={{ color: '#f59e0b', marginRight: '8px' }}></i>
            Pending Approvals
            {totalPending > 0 && (
              <span style={{ marginLeft: '8px', background: '#ef4444', color: '#fff', borderRadius: '999px', fontSize: '.7rem', fontWeight: 700, padding: '2px 8px' }}>
                {totalPending}
              </span>
            )}
          </h3>
          {totalPending === 0 ? (
            <div style={{ color: 'var(--gray-1)', fontSize: '.9rem', padding: '12px 0' }}>
              <i className="fas fa-circle-check" style={{ color: '#10b981', marginRight: '8px' }}></i>
              All caught up — nothing pending.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ApprovalRow label="Products"            count={stats?.analytics?.pendingProductsCount   || 0} href="/admin/approvals" color="#f59e0b" />
              <ApprovalRow label="Stores"              count={stats?.analytics?.pendingStoresCount      || 0} href="/admin/stores"    color="#3b82f6" />
              <ApprovalRow label="Seller Applications" count={stats?.analytics?.pendingSellerAppsCount  || 0} href="/admin/approvals" color="#8b5cf6" />
            </div>
          )}
        </div>

        {/* ── Product Reviews ────────────────────────────────────── */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '16px', fontSize: '1rem' }}>
            <i className="fas fa-star" style={{ color: '#fbbf24', marginRight: '8px' }}></i>
            Product Reviews
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                {stats?.analytics?.averageRating?.toFixed(1) || '0.0'}
                <span style={{ fontSize: '1rem', color: 'var(--gray-1)', fontWeight: 500, marginLeft: '6px' }}>/ 5.0</span>
              </div>
              <div style={{ display: 'flex', gap: '3px', marginTop: '8px' }}>
                {[...Array(5)].map((_, i) => (
                  <i key={i} className={`fas ${i < Math.floor(stats?.analytics?.averageRating || 0) ? 'fa-star' : i < (stats?.analytics?.averageRating || 0) ? 'fa-star-half-alt' : 'far fa-star'}`}
                    style={{ color: '#fbbf24', fontSize: '1.1rem' }} />
                ))}
              </div>
            </div>
            <div style={{ color: 'var(--gray-1)', fontSize: '.88rem' }}>
              Based on <strong style={{ color: '#0f172a' }}>{(stats?.analytics?.totalReviews || 0).toLocaleString()}</strong> review{stats?.analytics?.totalReviews !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* ── Monthly Revenue Trend ──────────────────────────────────── */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontWeight: 700, marginBottom: '4px', fontSize: '1rem' }}>
          <i className="fas fa-chart-line" style={{ color: '#10b981', marginRight: '8px' }}></i>
          Revenue Trend
        </h3>
        <p style={{ fontSize: '.75rem', color: 'var(--gray-1)', marginBottom: '20px' }}>Last 6 months · paid, processing, shipped &amp; delivered orders</p>
        {monthlyTrend.length === 0 ? (
          <p style={{ color: 'var(--gray-1)', fontSize: '.9rem' }}>No revenue data yet.</p>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '140px', paddingBottom: '28px', position: 'relative' }}>
            {/* Y-axis guide line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: '#f1f5f9' }} />
            {monthlyTrend.map((m) => {
              const pct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: '.65rem', color: '#10b981', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {m.revenue > 0 ? formatPrice(m.revenue, 'NGN', false) : ''}
                  </div>
                  <div
                    title={`${fmtMonth(m.month)}: ${formatPrice(m.revenue, 'NGN', false)} (${m.orders} orders)`}
                    style={{
                      width: '100%', background: pct > 0 ? '#10b981' : '#e2e8f0',
                      borderRadius: '6px 6px 0 0', minHeight: '4px',
                      height: `${Math.max(pct, pct > 0 ? 4 : 0)}%`,
                      transition: 'height .5s ease', cursor: pct > 0 ? 'pointer' : 'default',
                    }}
                  />
                  <div style={{ fontSize: '.65rem', color: 'var(--gray-1)', whiteSpace: 'nowrap', position: 'absolute', bottom: 0 }}>
                    {fmtMonth(m.month)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Totals row */}
        <div style={{ display: 'flex', gap: '24px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--gray-5)', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '.82rem', color: 'var(--gray-1)' }}>
            <strong style={{ color: '#10b981' }}>{formatPrice(monthlyTrend.reduce((s, m) => s + m.revenue, 0), 'NGN', false)}</strong> in the last 6 months
          </div>
          <div style={{ fontSize: '.82rem', color: 'var(--gray-1)' }}>
            <strong style={{ color: '#3b82f6' }}>{monthlyTrend.reduce((s, m) => s + m.orders, 0)}</strong> paid orders
          </div>
        </div>
      </div>

      {/* ── Recent Orders Table ────────────────────────────────────── */}
      {(stats?.recentOrders || []).length > 0 && (
        <div className="card" style={{ padding: '20px', marginBottom: '20px', overflow: 'hidden' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '16px', fontSize: '1rem' }}>
            <i className="fas fa-clock-rotate-left" style={{ color: '#8b5cf6', marginRight: '8px' }}></i>
            Recent Orders
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem', minWidth: '500px' }}>
              <thead>
                <tr style={{ background: 'var(--gray-6)', color: 'var(--gray-1)', fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Order</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Customer</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>Amount</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recentOrders || []).map((o) => {
                  const sc = STATUS_COLORS[o.status] || '#94a3b8';
                  return (
                    <tr key={o._id} style={{ borderBottom: '1px solid var(--gray-5)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--primary)' }}>#{String(o._id).slice(-8).toUpperCase()}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{o.user?.firstName} {o.user?.lastName}</div>
                        <div style={{ fontSize: '.75rem', color: 'var(--gray-1)' }}>{o.user?.email}</div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{formatPrice(o.totalAmount || 0, 'NGN', false)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '.72rem', fontWeight: 700, background: `${sc}18`, color: sc, textTransform: 'capitalize' }}>{o.status}</span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--gray-1)', fontSize: '.78rem' }}>
                        {new Date(o.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Low Stock Alert ────────────────────────────────────────── */}
      {(stats?.lowStock || []).length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '16px', fontSize: '1rem' }}>
            <i className="fas fa-triangle-exclamation" style={{ color: '#ef4444', marginRight: '8px' }}></i>
            Low Stock
            <span style={{ fontSize: '.75rem', fontWeight: 400, color: 'var(--gray-1)', marginLeft: '6px' }}>products with fewer than 10 units</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
            {stats.lowStock.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: Number(p.stock) === 0 ? '#fef2f2' : '#fffbeb', borderRadius: '8px', border: `1px solid ${Number(p.stock) === 0 ? '#fecaca' : '#fde68a'}` }}>
                <span style={{ fontWeight: 600, fontSize: '.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>{p.name}</span>
                <span style={{ fontWeight: 800, fontSize: '.88rem', color: Number(p.stock) === 0 ? '#ef4444' : '#d97706', flexShrink: 0 }}>
                  {Number(p.stock) === 0 ? 'Out' : `${p.stock} left`}
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
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`fas ${icon}`} style={{ color: accent, fontSize: '1rem' }}></i>
        </div>
        <span style={{ fontSize: '.8rem', color: 'var(--gray-1)', fontWeight: 500 }}>{label}</span>
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
