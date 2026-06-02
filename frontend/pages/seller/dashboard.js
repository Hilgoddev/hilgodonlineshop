import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import SellerGuard from '@/components/SellerGuard';
import { apiFetch } from '../../lib/apiClient';
import { useCurrency } from '@/contexts/CurrencyContext';

export default function SellerDashboard() {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({ metrics: {}, products: [], isApproved: false });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch('/api/seller/dashboard');
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text.startsWith('<') ? `Server error (${res.status})` : text);
        }
        const json = await res.json();
        if (json.success) setData(json.data);
        else setError(json.error || 'Failed to load dashboard');
      } catch (err) {
        console.error('Seller dashboard load failed', err);
        setError('Could not connect to the server. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Layout title="Seller Dashboard - Hilgod">
      <div style={{ padding: 'var(--space-8) 0' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
          <i className="fas fa-store" style={{ color: 'var(--primary)' }}></i> Seller Dashboard
        </h1>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
            <i className="fas fa-circle-exclamation" style={{ fontSize: '2rem', marginBottom: '12px', display: 'block' }}></i>
            <p style={{ fontWeight: 600 }}>{error}</p>
          </div>
        ) : (
          <>
            <div className="seller-metrics-grid">
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ color: 'var(--gray-1)', fontSize: '.85rem' }}>Products</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{data.metrics.productCount || 0}</div>
              </div>
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ color: 'var(--gray-1)', fontSize: '.85rem' }}>Units Sold</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{data.metrics.totalUnits || 0}</div>
              </div>
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ color: 'var(--gray-1)', fontSize: '.85rem' }}>Sales</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatPrice(Number(data.metrics.totalSales || 0), 'NGN', false)}</div>
              </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <div className="seller-dash-header">
                <h3 style={{ fontWeight: 700 }}>My Products</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Link href="/seller/products" className="btn btn-primary btn-sm">
                    Upload Product
                  </Link>
                  <Link href="/seller/store" className="btn btn-outline btn-sm">
                    Manage Store
                  </Link>
                </div>
              </div>
              {data.products?.length ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--gray-5)' }}>
                        <th style={{ textAlign: 'left', padding: '10px', width: '52px' }}></th>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Name</th>
                        <th className="col-hide-sm" style={{ textAlign: 'left', padding: '10px' }}>Category</th>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Price</th>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.products.map((p) => (
                        <tr key={p._id} style={{ borderBottom: '1px solid var(--gray-4)' }}>
                          <td style={{ padding: '10px' }}>
                            {p.images?.[0] ? (
                              <img src={p.images[0]} alt={p.name} style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '6px', display: 'block' }} />
                            ) : (
                              <div style={{ width: '42px', height: '42px', background: 'var(--gray-5)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fas fa-image" style={{ color: 'var(--gray-2)', fontSize: '.9rem' }} />
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px', fontWeight: 600 }}>{p.name}</td>
                          <td className="col-hide-sm" style={{ padding: '10px', textTransform: 'capitalize', color: 'var(--gray-1)' }}>{p.category}</td>
                          <td style={{ padding: '10px', fontWeight: 700 }}>{formatPrice(Number(p.price || 0), 'NGN', false)}</td>
                          <td style={{ padding: '10px' }}>{p.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--gray-1)' }}>No products yet.</p>
              )}
            </div>

            {!loading && <SellerQuickLinks />}
          </>
        )}
      </div>
    </Layout>
  );
}

SellerDashboard.getLayout = function getLayout(page) {
  return <SellerGuard>{page}</SellerGuard>;
};

const SellerQuickLinks = () => (
  <div className="card" style={{ padding: '20px', marginTop: '24px' }}>
    <h3 style={{ fontWeight: 700, marginBottom: '12px' }}>Seller Tools</h3>
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <Link href="/seller/analytics" className="btn btn-outline btn-sm">
        <i className="fas fa-chart-line"></i> Sales Analytics
      </Link>
      <Link href="/seller/products" className="btn btn-outline btn-sm">
        <i className="fas fa-box"></i> Manage Products
      </Link>
      <Link href="/seller/store" className="btn btn-outline btn-sm">
        <i className="fas fa-store"></i> Store Settings
      </Link>
      <Link href="/seller/orders" className="btn btn-outline btn-sm">
        <i className="fas fa-shopping-bag"></i> Customer Orders
      </Link>
      <Link href="/seller/payouts" className="btn btn-outline btn-sm">
        <i className="fas fa-wallet"></i> My Earnings
      </Link>
    </div>
  </div>
);
