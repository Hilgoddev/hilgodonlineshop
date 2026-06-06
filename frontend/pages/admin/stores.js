import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminJson, errorMessage } from '../../lib/adminApi';
import { apiFetch } from '../../lib/apiClient';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

export default function AdminStores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchStores = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    const { res, json } = await adminJson('/api/stores/all');
    if (res.ok && json.success) {
      setStores(json.data || []);
    } else {
      setMessage({ type: 'error', text: errorMessage(json, 'Could not load stores') });
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    fetchStores();
  }, []);
  useAutoRefresh(() => fetchStores({ silent: true }), { table: 'stores' });

  const updateStatus = async (id, status) => {
    setMessage({ type: '', text: '' });
    const res = await apiFetch(`/api/stores/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = {};
    }
    if (res.ok) {
      setMessage({ type: 'success', text: `Store marked as ${status}.` });
      fetchStores();
    } else {
      setMessage({ type: 'error', text: errorMessage(json, 'Update failed') });
    }
  };

  const badge = (status) => {
    const styles = {
      approved: { bg: '#dcfce7', color: '#15803d' },
      pending: { bg: '#fef3c7', color: '#b45309' },
      rejected: { bg: '#fee2e2', color: '#b91c1c' },
    };
    const s = styles[status] || styles.pending;
    return (
      <span style={{ background: s.bg, color: s.color, padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
        {status}
      </span>
    );
  };

  return (
    <>
      {message.text ? (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#15803d' : '#b91c1c',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {message.text}
        </div>
      ) : null}

      <p style={{ color: '#64748b', marginBottom: '16px' }}>Approve seller storefronts or return them to pending / rejected.</p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: 'var(--primary)' }} />
          </div>
        ) : stores.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No stores yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem', minWidth: '500px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b' }}>
                  <th style={{ padding: '12px 16px' }}>Store</th>
                  <th style={{ padding: '12px 16px' }}>Slug</th>
                  <th style={{ padding: '12px 16px' }}>Products</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{s.name}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{s.slug}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700 }}>
                        {s.product_count ?? 0}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{badge(s.status)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button type="button" className="btn btn-sm btn-primary" 
                        // Small padding differing from the default of "btn-primary" (and the others follow as a side effect)
                        style={{ padding: '7px 16px', width: '100%'}}
                        onClick={() => updateStatus(s.id, 'approved')}>
                          Approve
                        </button>
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => updateStatus(s.id, 'pending')}>
                          Pending
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          style={{ color: '#b91c1c', borderColor: '#fecaca' }}
                          onClick={() => updateStatus(s.id, 'rejected')}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

AdminStores.getLayout = function getLayout(page) {
  return (
    <AdminGuard>
      <AdminLayout title="Stores">{page}</AdminLayout>
    </AdminGuard>
  );
};
