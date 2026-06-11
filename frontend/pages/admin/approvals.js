import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminJson, errorMessage } from '../../lib/adminApi';
import { apiFetch } from '../../lib/apiClient';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useCurrency } from '@/contexts/CurrencyContext';
import styles from '@/css/fix.module.css';

export default function ApprovalsPage() {
  const { formatPrice } = useCurrency();
  const [pendingStores, setPendingStores] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [pendingSellerApplications, setPendingSellerApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [autoApprove, setAutoApprove] = useState(false);
  const [savingSetting, setSavingSetting] = useState(false);

  const fetchPendingData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [storesRes, productsRes, sellerAppsRes] = await Promise.all([
        adminJson('/api/stores/all'),
        adminJson('/api/products/all?limit=1000'),
        adminJson('/api/admin/seller-applications?status=pending'),
      ]);

      if (!storesRes.res.ok || !productsRes.res.ok || !sellerAppsRes.res.ok) {
        setError(
          [
            !storesRes.res.ok && errorMessage(storesRes.json),
            !productsRes.res.ok && errorMessage(productsRes.json),
            !sellerAppsRes.res.ok && errorMessage(sellerAppsRes.json),
          ]
            .filter(Boolean)
            .join(' ') || 'Could not load approvals'
        );
        setLoading(false);
        return;
      }

      setPendingStores((storesRes.json.data || []).filter((s) => s.status === 'pending'));
      setPendingProducts((productsRes.json.data || []).filter((p) => p.status === 'pending'));
      setPendingSellerApplications(sellerAppsRes.json.data || []);
    } catch (err) {
      console.error(err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { res, json } = await adminJson('/api/admin/settings');
      if (res.ok && json.success) setAutoApprove(!!json.data.autoApproveProducts);
    } catch (_) { /* non-fatal */ }
  };

  const toggleAutoApprove = async () => {
    const next = !autoApprove;
    setSavingSetting(true);
    try {
      const { res, json } = await adminJson('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ autoApproveProducts: next }),
      });
      if (res.ok && json.success) setAutoApprove(!!json.data.autoApproveProducts);
    } catch (_) { /* non-fatal */ }
    finally { setSavingSetting(false); }
  };

  useEffect(() => {
    fetchPendingData();
    fetchSettings();
  }, []);
  useAutoRefresh(() => fetchPendingData({ silent: true }), { table: 'products' });

  const handleStoreStatus = async (id, status) => {
    setBusyId(`store-${id}`);
    const res = await apiFetch(`/api/stores/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    if (res.ok) {
      // Update local state instead of re-fetching all data
      setPendingStores(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleProductStatus = async (id, status) => {
    setBusyId(`product-${id}`);
    const res = await apiFetch(`/api/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    if (res.ok) {
      // Update local state instead of re-fetching all data
      setPendingProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSellerApplication = async (userId, action) => {
    setBusyId(`seller-${userId}`);
    const endpoint = action === 'approve' ? `/api/admin/approve-seller/${userId}` : `/api/admin/reject-seller/${userId}`;
    const res = await apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ adminNotes: '' }),
    });
    setBusyId(null);
    if (res.ok) {
      // Update local state instead of re-fetching all data
      setPendingSellerApplications(prev => prev.filter(app => app.user_id !== userId));
    }
  };

  const tableShell = (title, count, children) => (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '12px', color: '#0f172a' }}>
        {title}{' '}
        <span style={{ color: '#64748b', fontWeight: 600 }}>({count})</span>
      </h2>
      {children}
    </section>
  );

  return (
    <>
      {error ? (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            background: '#fee2e2',
            color: '#b91c1c',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }} />
        </div>
      ) : (
        <>
          <section style={{ marginBottom: '24px' }}>
            <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>Auto-approve seller products</div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                  {autoApprove
                    ? 'Seller uploads go live immediately without review.'
                    : 'Seller uploads require admin approval before going live.'}
                </div>
              </div>
              <button
                onClick={toggleAutoApprove}
                disabled={savingSetting}
                aria-pressed={autoApprove}
                style={{
                  position: 'relative', width: '52px', height: '28px', borderRadius: '999px', border: 'none',
                  cursor: savingSetting ? 'wait' : 'pointer', background: autoApprove ? '#10b981' : '#cbd5e1',
                  transition: 'background .2s', flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: '3px', left: autoApprove ? '27px' : '3px', width: '22px', height: '22px',
                  borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                }} />
              </button>
            </div>
          </section>

          {tableShell(
            'Seller applications',
            pendingSellerApplications.length,
            pendingSellerApplications.length === 0 ? (
              <p style={{ color: '#64748b' }}>No pending applications.</p>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#64748b' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Applicant</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Business</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Contact</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Submitted</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingSellerApplications.map((app) => (
                        <tr key={app.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{app.full_name}</td>
                          <td style={{ padding: '12px 16px' }}>{app.business_name}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>
                            {app.email}
                            <br />
                            {app.phone}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(app.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', minWidth: '140px' }}>
                            <button
                              type="button"
                              className={`btn btn-sm btn-primary ${styles['action-btn']}`}
                              disabled={busyId === `seller-${app.user_id}`}
                              onClick={() => handleSellerApplication(app.user_id, 'approve')}
                            >
                              {busyId === `seller-${app.user_id}` ? <i className="fas fa-spinner fa-spin" /> : 'Approve'}
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm btn-outline ${styles['action-btn']}`}
                              style={{ color: '#b91c1c', borderColor: '#fecaca' }}
                              disabled={busyId === `seller-${app.user_id}`}
                              onClick={() => handleSellerApplication(app.user_id, 'reject')}
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {tableShell(
            'Stores',
            pendingStores.length,
            pendingStores.length === 0 ? (
              <p style={{ color: '#64748b' }}>No pending stores.</p>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#64748b' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Name</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Slug</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Created</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingStores.map((store) => (
                        <tr key={store.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{store.name}</td>
                          <td style={{ padding: '12px 16px' }}>{store.slug}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(store.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', minWidth: '140px' }}>
                            <button
                              type="button"
                              className={`btn btn-sm btn-primary ${styles['action-btn']}`}
                              disabled={busyId === `store-${store.id}`}
                              onClick={() => handleStoreStatus(store.id, 'approved')}
                            >
                              {busyId === `store-${store.id}` ? <i className="fas fa-spinner fa-spin" /> : 'Approve'}
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm btn-outline ${styles['action-btn']}`}
                              style={{ color: '#b91c1c', borderColor: '#fecaca' }}
                              disabled={busyId === `store-${store.id}`}
                              onClick={() => handleStoreStatus(store.id, 'rejected')}
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {tableShell(
            'Products',
            pendingProducts.length,
            pendingProducts.length === 0 ? (
              <p style={{ color: '#64748b' }}>No pending products.</p>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#64748b' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Product</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Price</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Created</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingProducts.map((product) => (
                        <tr key={product.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{product.name}</td>
                          <td style={{ padding: '12px 16px' }}>{formatPrice(product.price || 0, product.currency || 'NGN', false)}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>
                            {product.created_at ? new Date(product.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', minWidth: '140px' }}>
                            <button
                              type="button"
                              className={`btn btn-sm btn-primary ${styles['action-btn']}`}
                              disabled={busyId === `product-${product.id}`}
                              onClick={() => handleProductStatus(product.id, 'approved')}
                            >
                              {busyId === `product-${product.id}` ? <i className="fas fa-spinner fa-spin" /> : 'Approve'}
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm btn-outline ${styles['action-btn']}`}
                              style={{ color: '#b91c1c', borderColor: '#fecaca' }}
                              disabled={busyId === `product-${product.id}`}
                              onClick={() => handleProductStatus(product.id, 'rejected')}
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </>
      )}
    </>
  );
}

ApprovalsPage.getLayout = function getLayout(page) {
  return (
    <AdminGuard>
      <AdminLayout title="Approvals">{page}</AdminLayout>
    </AdminGuard>
  );
};
