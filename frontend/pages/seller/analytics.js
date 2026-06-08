import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import SellerGuard from '@/components/SellerGuard';
import Link from 'next/link';
import { apiFetch } from '../../lib/apiClient';
import { useCurrency } from '@/contexts/CurrencyContext';

const STATUS_COLOR = {
  approved: { bg: '#dcfce7', color: '#15803d' },
  pending: { bg: '#fef3c7', color: '#92400e' },
  rejected: { bg: '#fee2e2', color: '#b91c1c' },
};

export default function SellerAnalytics() {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/seller/analytics');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || 'Could not load analytics');
        }
      } catch {
        setError('Network error loading analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxSales = data?.topProducts?.length ? Math.max(...data.topProducts.map((p) => p.sales), 1) : 1;

  return (
    <Layout title="Sales Analytics - Hilgod">
      <div style={{ padding: 'var(--space-8) 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            <i className="fas fa-chart-line" style={{ color: 'var(--primary)' }}></i> Sales Analytics
          </h1>
          <Link href="/seller/dashboard" className="btn btn-outline btn-sm">
            <i className="fas fa-arrow-left"></i> Dashboard
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
          </div>
        ) : error ? (
          <div style={{ padding: '16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px' }}>{error}</div>
        ) : (
          <>
            {/* Metric Cards */}
            <div className="seller-metrics-grid" style={{ marginBottom: '24px' }}>
              <MetricCard icon="fa-naira-sign" label="Total Revenue" value={formatPrice(Number(data.metrics.totalSales || 0), data.metrics.currency || 'NGN', false)} />
              <MetricCard icon="fa-boxes-stacked" label="Units Sold" value={data.metrics.totalUnits || 0} />
              <MetricCard icon="fa-box" label="Products" value={data.metrics.productCount || 0} />
              <MetricCard icon="fa-tag" label="Avg. List Price" value={formatPrice(Number(data.metrics.avgProductPrice || 0), data.metrics.currency || 'NGN', false)} />
            </div>

            {/* Product Status Breakdown */}
            <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>Product Status</h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {['approved', 'pending', 'rejected'].map((status) => {
                  const count = data.statusCounts?.[status] || 0;
                  const { bg, color } = STATUS_COLOR[status];
                  return (
                    <div key={status} style={{ padding: '12px 20px', borderRadius: '8px', background: bg, color, fontWeight: 700 }}>
                      <div style={{ fontSize: '1.4rem' }}>{count}</div>
                      <div style={{ fontSize: '.8rem', textTransform: 'capitalize', opacity: 0.85 }}>{status}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Products by Revenue */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>
                <i className="fas fa-trophy" style={{ color: 'var(--primary)', marginRight: '8px' }}></i>
                Products by Revenue
              </h3>
              {!data.topProducts?.length ? (
                <p style={{ color: 'var(--gray-1)' }}>No products yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {data.topProducts.map((product, idx) => {
                    const pct = maxSales > 0 ? (product.sales / maxSales) * 100 : 0;
                    const { bg, color } = STATUS_COLOR[product.status] || STATUS_COLOR.pending;
                    return (
                      <div key={product.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <span style={{ fontWeight: 800, color: 'var(--gray-2)', width: '20px', flexShrink: 0 }}>#{idx + 1}</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
                              <div style={{ fontSize: '.78rem', color: 'var(--gray-1)', textTransform: 'capitalize' }}>{product.category} · Stock: {product.stock}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                            <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '.72rem', fontWeight: 700, background: bg, color }}>{product.status}</span>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '.95rem' }}>{formatPrice(product.sales, product.currency || data.metrics.currency || 'NGN', false)}</div>
                              <div style={{ fontSize: '.75rem', color: 'var(--gray-1)' }}>{product.units} sold</div>
                            </div>
                          </div>
                        </div>
                        <div style={{ height: '6px', borderRadius: '99px', background: 'var(--gray-4)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: '99px', background: product.sales > 0 ? 'var(--primary)' : 'var(--gray-3)', width: `${pct}%`, transition: 'width .6s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function MetricCard({ icon, label, value }) {
  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--primary-xlight)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`fas ${icon}`} style={{ color: 'var(--primary)', fontSize: '1rem' }}></i>
        </div>
        <span style={{ fontSize: '.82rem', color: 'var(--gray-1)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--dark)' }}>{value}</div>
    </div>
  );
}

SellerAnalytics.getLayout = function getLayout(page) {
  return <SellerGuard>{page}</SellerGuard>;
};
