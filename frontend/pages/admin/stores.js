import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminJson, errorMessage } from '../../lib/adminApi';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useCurrency } from '@/contexts/CurrencyContext';

export default function AdminStores() {
  const { formatPrice } = useCurrency();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [updatingId, setUpdatingId] = useState(null);

  const fetchStores = async () => {
    try {
      const { res, json } = await adminJson('/api/stores/all');
      if (res.ok && json.success) {
        // Sort stores by creation date (newest first)
        const sortedStores = (json.data || []).sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        setStores(sortedStores);
      } else {
        setMessage({ type: 'error', text: errorMessage(json, 'Could not load stores') });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStores(); }, []);
  useAutoRefresh(fetchStores, { table: 'stores' });

  const updateStatus = async (storeId, newStatus) => {
    setUpdatingId(storeId);
    try {
      const res = await fetch(`/api/stores/${storeId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.success) {
        setStores(prev => prev.map(store => 
          store.id === storeId ? { ...store, status: newStatus } : store
        ));
        setMessage({ type: 'success', text: `Store ${newStatus} successfully` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update store' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.owner_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: '#fef3c7', color: '#d97706' },
      approved: { bg: '#dcfce7', color: '#16a34a' },
      rejected: { bg: '#fee2e2', color: '#ef4444' },
    };
    const s = styles[status] || styles.pending;
    return {
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '0.78rem',
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      textTransform: 'capitalize',
    };
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

      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontWeight: '700' }}>Store Management</h2>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search stores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px 8px 32px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.9rem',
              }}
            />
            <i
              className="fas fa-search"
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
                fontSize: '0.9rem',
              }}
            ></i>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#38bdf8' }}></i>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Store</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Owner</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Products</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Sales</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Revenue</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStores.length > 0 ? (
                  filteredStores.map((store) => (
                    <tr key={store.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{store.name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{store.slug}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {store.owner_id.substring(0, 8)}...
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {store.product_count || 0}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {store.total_sales || 0}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600 }}>
                        {formatPrice(store.total_revenue || 0, 'NGN')}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={getStatusBadge(store.status)}>
                          {store.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {store.status === 'pending' && (
                            <>
                              <button
                                className="btn btn-sm"
                                style={{
                                  fontSize: '.75rem',
                                  color: '#fff',
                                  background: '#10b981',
                                  border: 'none',
                                  opacity: updatingId === store.id ? 0.7 : 1,
                                }}
                                disabled={!!updatingId}
                                onClick={() => updateStatus(store.id, 'approved')}
                              >
                                {updatingId === store.id ? <i className="fas fa-spinner fa-spin" /> : 'Approve'}
                              </button>
                              <button
                                className="btn btn-sm"
                                style={{
                                  fontSize: '.75rem',
                                  color: '#fff',
                                  background: '#ef4444',
                                  border: 'none',
                                  opacity: updatingId === store.id ? 0.7 : 1,
                                }}
                                disabled={!!updatingId}
                                onClick={() => updateStatus(store.id, 'rejected')}
                              >
                                {updatingId === store.id ? <i className="fas fa-spinner fa-spin" /> : 'Reject'}
                              </button>
                            </>
                          )}
                          {store.status === 'approved' && (
                            <button
                              className="btn btn-sm"
                              style={{
                                fontSize: '.75rem',
                                color: '#fff',
                                background: '#ef4444',
                                border: 'none',
                                opacity: updatingId === store.id ? 0.7 : 1,
                              }}
                              disabled={!!updatingId}
                              onClick={() => updateStatus(store.id, 'rejected')}
                            >
                              {updatingId === store.id ? <i className="fas fa-spinner fa-spin" /> : 'Reject'}
                            </button>
                          )}
                          {store.status === 'rejected' && (
                            <button
                              className="btn btn-sm"
                              style={{
                                fontSize: '.75rem',
                                color: '#fff',
                                background: '#10b981',
                                border: 'none',
                                opacity: updatingId === store.id ? 0.7 : 1,
                              }}
                              disabled={!!updatingId}
                              onClick={() => updateStatus(store.id, 'approved')}
                            >
                              {updatingId === store.id ? <i className="fas fa-spinner fa-spin" /> : 'Approve'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      {searchTerm ? 'No stores found' : 'No stores available'}
                    </td>
                  </tr>
                )}
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