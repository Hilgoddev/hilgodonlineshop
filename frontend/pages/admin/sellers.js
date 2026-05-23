import { useState, useEffect } from 'react';
import { useSession } from '../../contexts/AuthContext';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiFetch } from '../../lib/apiClient';
import { adminJson, errorMessage } from '../../lib/adminApi';
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
      title: 'Remove Seller',
      message: `Permanently remove ${name}? This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        closeModal();
        setRemovingId(userId);
        try {
          const res = await apiFetch(`/api/admin/customers/${userId}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) { setMessage({ type: 'success', text: 'Seller removed' }); fetchSellers(); }
          else setMessage({ type: 'error', text: data.error || 'Failed to remove seller' });
        } catch { setMessage({ type: 'error', text: 'Network error' }); }
        finally { setRemovingId(null); setTimeout(() => setMessage({ type: '', text: '' }), 3000); }
      },
    });
  };

  const filtered = sellers.filter(s => {
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    const q = searchTerm.toLowerCase();
    return name.includes(q) || s.email.toLowerCase().includes(q) || (s.store?.name || '').toLowerCase().includes(q);
  });

  const storeStatusStyle = (status) => {
    const map = {
      active:   { bg: '#dcfce7', color: '#16a34a' },
      approved: { bg: '#dcfce7', color: '#16a34a' },
      pending:  { bg: '#fef3c7', color: '#d97706' },
      rejected: { bg: '#fee2e2', color: '#ef4444' },
      suspended:{ bg: '#fee2e2', color: '#ef4444' },
    };
    return map[status] || { bg: '#f1f5f9', color: '#64748b' };
  };

  return (
    <>
      <div style={{ marginBottom: '20px' }}>
        <p style={{ color: '#64748b', marginBottom: '16px' }}>
          <strong>{filtered.length}</strong> seller{filtered.length !== 1 ? 's' : ''} registered.
        </p>

        {message.text && (
          <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', background: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#16a34a' : '#ef4444', fontSize: '.9rem', fontWeight: '600' }}>
            <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i> {message.text}
          </div>
        )}

        <input
          type="text"
          placeholder="Search by name, email or store..."
          className="form-input"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: '100%', maxWidth: '400px' }}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <i className="fas fa-shop-slash" style={{ fontSize: '3rem', color: 'var(--gray-3)', display: 'block', marginBottom: '16px' }}></i>
            <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No sellers found</h3>
            <p style={{ color: 'var(--gray-1)', fontSize: '.9rem' }}>Sellers appear here after their application is approved.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.82rem' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Seller</th>
                  <th className="col-hide-sm" style={{ padding: '14px 16px', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Store</th>
                  <th className="col-hide-md" style={{ padding: '14px 16px', fontWeight: 600 }}>Store Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Products</th>
                  <th className="col-hide-md" style={{ padding: '14px 16px', fontWeight: 600 }}>Joined</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(seller => {
                  const isSelf = seller._id === session?.user?.id;
                  const ss = storeStatusStyle(seller.store?.status);
                  return (
                    <tr key={seller._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {seller.image ? (
                            <img src={seller.image} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.85rem', flexShrink: 0 }}>
                              {seller.firstName?.charAt(0)}{seller.lastName?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600 }}>{seller.firstName} {seller.lastName}</div>
                            <div className="col-show-sm" style={{ fontSize: '.76rem', color: '#64748b', marginTop: '2px' }}>{seller.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="col-hide-sm" style={{ padding: '14px 16px', color: '#64748b' }}>{seller.email}</td>
                      <td style={{ padding: '14px 16px' }}>
                        {seller.store ? (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{seller.store.name}</div>
                            <div style={{ fontSize: '.75rem', color: '#94a3b8', marginTop: '2px' }}>/{seller.store.slug}</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No store yet</span>
                        )}
                      </td>
                      <td className="col-hide-md" style={{ padding: '14px 16px' }}>
                        {seller.store ? (
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '.78rem', fontWeight: 700, background: ss.bg, color: ss.color, textTransform: 'capitalize' }}>
                            {seller.store.status || 'pending'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '.8rem', color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                        <span style={{ background: seller.productCount > 0 ? '#dbeafe' : '#f1f5f9', color: seller.productCount > 0 ? '#1d4ed8' : '#94a3b8', padding: '3px 10px', borderRadius: '20px', fontSize: '.78rem', fontWeight: 700 }}>
                          {seller.productCount}
                        </span>
                      </td>
                      <td className="col-hide-md" style={{ padding: '14px 16px', fontSize: '.82rem', color: '#64748b' }}>
                        {new Date(seller.joinedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {isSelf ? (
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={modal.open}
        title={modal.title}
        message={modal.message}
        danger={modal.danger}
        onConfirm={modal.onConfirm}
        onCancel={closeModal}
      />
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
