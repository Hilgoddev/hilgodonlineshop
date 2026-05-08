import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import SellerGuard from '@/components/SellerGuard';
import { apiFetch } from '../../lib/apiClient';

export default function SellerDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ metrics: {}, products: [], isApproved: false });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch('/api/seller/dashboard');
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (err) {
        console.error('Seller dashboard load failed', err);
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
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }} className="seller-metrics-grid">
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
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>N{Number(data.metrics.totalSales || 0).toLocaleString()}</div>
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
                        <th style={{ textAlign: 'left', padding: '10px' }}>Category</th>
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
                          <td style={{ padding: '10px', textTransform: 'capitalize', color: 'var(--gray-1)' }}>{p.category}</td>
                          <td style={{ padding: '10px', fontWeight: 700 }}>₦{Number(p.price || 0).toLocaleString()}</td>
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

            {!loading && data.isApproved && <ApprovedSellerTools />}
          </>
        )}
      </div>
    </Layout>
  );
}

SellerDashboard.getLayout = function getLayout(page) {
  return <SellerGuard>{page}</SellerGuard>;
};

const ApprovedSellerTools = () => (
  <div className="card" style={{ padding: '20px', marginTop: '24px' }}>
    <h3 style={{ fontWeight: 700 }}>Exclusive Tools for Approved Sellers</h3>
    <ul style={{ listStyle: 'none', padding: 0 }}>
      <li style={{ marginBottom: '12px' }}>
        <Link href="/seller/analytics" className="btn btn-outline btn-sm">
          View Sales Analytics
        </Link>
      </li>
      <li style={{ marginBottom: '12px' }}>
        <Link href="/seller/promotions" className="btn btn-outline btn-sm">
          Manage Promotions
        </Link>
      </li>
    </ul>
  </div>
);
