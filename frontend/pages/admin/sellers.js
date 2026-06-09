import { useState, useEffect } from 'react';
import { useSession } from '../../contexts/AuthContext';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiFetch } from '../../lib/apiClient';
import { adminJson, errorMessage } from '../../lib/adminApi';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import ConfirmModal from '@/components/ConfirmModal';

export default function AdminSellers() {
  const { data: session } = useSession();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [changingId, setChangingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [modal, setModal] = useState({ open: false });
  const closeModal = () => setModal(m => ({ ...m, open: false }));

  const fetchSellers = async () => {
    try {
      const { res, json } = await adminJson('/api/admin/sellers');
      if (res.ok && json.success) setSellers(json.data || []);
      else setMessage({ type: 'error', text: errorMessage(json, 'Could not load sellers') });
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSellers(); }, []);
  useAutoRefresh(fetchSellers, { table: 'profiles' });

  const handleDemote = (userId, name) => {
    setModal({
      open: true,
      title: 'Demote to Customer',
      message: `Demote ${name} back to a regular customer? Their store will remain but they will lose seller access.`,
      onConfirm: async () => {
        closeModal();
        setChangingId(userId);
        try {
          const res = await apiFetch('/api/admin/promote', { method: 'PUT', body: JSON.stringify({ userId, newRole: 'customer' }) });
          const data = await res.json();
          if (data.success) { setMessage({ type: 'success', text: 'Seller demoted to customer' }); fetchSellers(); }
          else setMessage({ type: 'error', text: data.error || 'Failed' });
        } catch { setMessage({ type: 'error', text: 'Network error' }); }
        finally { setChangingId(null); setTimeout(() => setMessage({ type: '', text: '' }), 3000); }
      },
    });
  };

  const handleRemove = (userId, name) => {
    setModal({
      open: true,
      title: 'Remove User',
      message: `Remove ${name} from the platform? This will delete their account and all associated data.`,
      danger: true,
      onConfirm: async () => {
        closeModal();
        setRemovingId(userId);
        try {
          const res = await apiFetch('/api/admin/users', { method: 'DELETE', body: JSON.stringify({ userId }) });
          const data = await res.json();
          if (data.success) { setMessage({ type: 'success', text: 'User removed' }); fetchSellers(); }
          else setMessage({ type: 'error', text: data.error || 'Failed' });
        } catch { setMessage({ type: 'error', text: 'Network error' }); }
        finally { setRemovingId(null); setTimeout(() => setMessage({ type: '', text: '' }), 3000); }
      },
    });
  };

  const filteredSellers = sellers.filter(seller =>
    (seller.firstName + ' ' + seller.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
    seller.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (seller.store?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSelf = (id) => session?.user?.id === id;

  return (
    <>
      <ConfirmModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        danger={modal.danger}
        onConfirm={modal.onConfirm}
        onCancel={closeModal}
      />

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
          <h2 style={{ margin: 0, fontWeight: '700' }}>Sellers</h2>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search sellers..."
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
            <table className="admin-customers-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Seller</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Store</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Products</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Sales</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Units</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Revenue</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSellers.length > 0 ? (
                  filteredSellers.map((seller) => (
                    <tr key={seller._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'var(--primary-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--primary)',
                              fontWeight: 600,
                              fontSize: '.875rem',
                            }}
                          >
                            {(seller.firstName?.charAt(0) || '') + (seller.lastName?.charAt(0) || '')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>
                              {seller.firstName} {seller.lastName}
                            </div>
                            <div style={{ fontSize: '.75rem', color: '#64748b', marginTop: '2px' }}>
                              {seller.joinedAt ? `Joined ${new Date(seller.joinedAt).toLocaleDateString()}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '.875rem', color: '#64748b' }}>
                        {seller.email}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {seller.store ? (
                          <a
                            href={`/stores/${seller.store.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: 'var(--primary)',
                              textDecoration: 'none',
                              fontSize: '.875rem',
                              display: 'block',
                            }}
                          >
                            {seller.store.name}
                            <br />
                            <span style={{ fontSize: '.75rem', color: '#64748b' }}>
                              {seller.store.status}
                            </span>
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No store</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {seller.product_count || 0}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {seller.total_sales || 0}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {seller.total_units || 0}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600 }}>
                        {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(seller.total_revenue || 0)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {isSelf(seller._id) ? (
                          <span style={{ fontSize: '.78rem', color: '#94a3b8' }}>You</span>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {seller.store?.slug && (
                              <a
                                href={`/stores/${seller.store.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline"
                                style={{ fontSize: '.75rem' }}
                              >
                                <i className="fas fa-arrow-up-right-from-square" />
                              </a>
                            )}
                            <button
                              className="btn btn-sm btn-outline"
                              style={{ fontSize: '.75rem', color: '#64748b' }}
                              disabled={!!changingId || !!removingId}
                              onClick={() => handleDemote(seller._id, `${seller.firstName} ${seller.lastName}`)}
                            >
                              {changingId === seller._id ? <i className="fas fa-spinner fa-spin" /> : 'Demote'}
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ fontSize: '.75rem', color: '#fff', background: '#ef4444', border: 'none' }}
                              disabled={!!removingId || !!changingId}
                              onClick={() => handleRemove(seller._id, `${seller.firstName} ${seller.lastName}`)}
                            >
                              {removingId === seller._id ? <i className="fas fa-spinner fa-spin" /> : 'Remove'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      {searchTerm ? 'No sellers found' : 'No sellers available'}
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

AdminSellers.getLayout = function getLayout(page) {
  return (
    <AdminGuard>
      <AdminLayout title="Sellers">{page}</AdminLayout>
    </AdminGuard>
  );
};