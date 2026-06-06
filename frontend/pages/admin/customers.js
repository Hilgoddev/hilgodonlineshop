import { useState, useEffect } from 'react';
import { useSession } from '../../contexts/AuthContext';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiFetch } from '../../lib/apiClient';
import { adminJson, errorMessage } from '../../lib/adminApi';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import ConfirmModal from '@/components/ConfirmModal';

export default function AdminCustomers() {
  const { data: session } = useSession();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [promotingId, setPromotingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [modal, setModal] = useState({ open: false });
  const closeModal = () => setModal(m => ({ ...m, open: false }));

  const fetchCustomers = async () => {
    try {
      const { res, json } = await adminJson('/api/admin/customers');
      if (res.ok && json.success) setCustomers(json.data || []);
      else setMessage({ type: 'error', text: errorMessage(json, 'Could not load customers') });
    } catch (err) {
      console.error('Error:', err);
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);
  useAutoRefresh(fetchCustomers, { table: 'profiles' });

  const handleRoleChange = (userId, newRole) => {
    const labels = { admin: 'Admin', seller: 'Seller', customer: 'Customer' };
    setModal({
      open: true,
      title: 'Change Role',
      message: `Change this user's role to ${labels[newRole]}?`,
      onConfirm: async () => {
        closeModal();
        setPromotingId(userId);
        try {
          const res = await apiFetch('/api/admin/promote', { method: 'PUT', body: JSON.stringify({ userId, newRole }) });
          const data = await res.json();
          if (data.success) { setMessage({ type: 'success', text: data.message }); fetchCustomers(); }
          else { setMessage({ type: 'error', text: data.error || 'Failed' }); }
        } catch { setMessage({ type: 'error', text: 'Network error' }); }
        finally { setPromotingId(null); setTimeout(() => setMessage({ type: '', text: '' }), 3000); }
      },
    });
  };

  const handleRemoveUser = (userId, name) => {
    setModal({
      open: true,
      title: 'Remove User',
      message: `Permanently remove ${name}? This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        closeModal();
        setRemovingId(userId);
        try {
          const res = await apiFetch(`/api/admin/customers/${userId}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) { setMessage({ type: 'success', text: 'User removed' }); fetchCustomers(); }
          else setMessage({ type: 'error', text: data.error || 'Failed to remove user' });
        } catch { setMessage({ type: 'error', text: 'Network error' }); }
        finally { setRemovingId(null); setTimeout(() => setMessage({ type: '', text: '' }), 3000); }
      },
    });
  };

  const filtered = customers.filter(c => {
    const name = `${c.firstName} ${c.lastName}`.toLowerCase();
    const q = searchTerm.toLowerCase();
    return name.includes(q) || c.email.toLowerCase().includes(q);
  });

  return (
    <>
        <p style={{ color: '#64748b', marginBottom: '16px' }}>
          <strong>{filtered.length}</strong> accounts match your search.
        </p>

        {message.text && (
          <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', background: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#16a34a' : '#ef4444', fontSize: '.9rem', fontWeight: '600' }}>
            <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i> {message.text}
          </div>
        )}

        <div style={{ marginBottom: 'var(--space-5)' }}>
          <input type="text" placeholder="Search by name or email..." className="form-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', maxWidth: '400px' }} />
        </div>

        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}><i className="fas fa-users-slash" style={{ fontSize: '3rem', color: 'var(--gray-3)', marginBottom: '15px', display: 'block' }}></i><h3>No customers found</h3></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-customers-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-5)', color: 'var(--gray-1)', fontSize: '0.82rem' }}>
                    <th style={{ padding: '14px 16px' }}>Customer</th>
                    <th className="col-hide-sm" style={{ padding: '14px 16px' }}>Email</th>
                    <th className="col-hide-md" style={{ padding: '14px 16px' }}>Joined</th>
                    <th style={{ padding: '14px 16px' }}>Orders</th>
                    <th style={{ padding: '14px 16px' }}>Total Spent</th>
                    <th className="col-hide-md" style={{ padding: '14px 16px' }}>Account</th>
                    <th style={{ padding: '14px 16px' }}>Role</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(customer => {
                    const isSelf = customer._id === session?.user?.id;
                    const isAdmin = customer.role === 'admin';
                    const isSeller = customer.role === 'seller';
                    return (
                      <tr key={customer._id} style={{ borderBottom: '1px solid var(--gray-4)' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {customer.image ? (
                              <img src={customer.image} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '.85rem' }}>
                                {customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: '600' }}>{customer.firstName} {customer.lastName}</div>
                              <div className="col-show-sm" style={{ fontSize: '.76rem', color: 'var(--gray-1)', marginTop: '2px' }}>{customer.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="col-hide-sm" style={{ padding: '14px 16px', color: 'var(--gray-1)' }}>{customer.email}</td>
                        <td className="col-hide-md" style={{ padding: '14px 16px', fontSize: '.82rem', color: 'var(--gray-1)' }}>{new Date(customer.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td style={{ padding: '14px 16px', fontWeight: '700' }}>{customer.orderCount}</td>
                        <td style={{ padding: '14px 16px', fontWeight: '700' }}>₦{customer.totalSpent?.toLocaleString()}</td>
                        <td className="col-hide-md" style={{ padding: '14px 16px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '.78rem', fontWeight: '600', background: customer.provider === 'google' ? '#e8f0fe' : '#f1f5f9', color: customer.provider === 'google' ? '#4285f4' : '#64748b' }}>
                            <i className={`fa${customer.provider === 'google' ? 'b' : 's'} fa-${customer.provider === 'google' ? 'google' : 'envelope'}`} style={{ marginRight: '4px' }}></i>
                            {customer.provider === 'google' ? 'Google' : 'Email'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '.78rem', fontWeight: '700', background: isAdmin ? '#ede9fe' : isSeller ? '#dbeafe' : '#f1f5f9', color: isAdmin ? '#7c3aed' : isSeller ? '#1d4ed8' : '#64748b' }}>
                            {isAdmin ? 'Admin' : isSeller ? 'Seller' : 'Customer'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          {isSelf ? (
                            <span style={{ fontSize: '.78rem', color: 'var(--gray-2)' }}>You</span>
                          ) : (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexDirection: 'column', alignItems: 'flex-end' }}>
                              {!isSeller && (
                                <button 
                                className="btn btn-sm btn-outline" style={{ fontSize: '.75rem', color: '#1d4ed8', borderColor: '#dbeafe', width: '100%' }} disabled={!!promotingId} onClick={() => handleRoleChange(customer._id, 'seller')}>
                                  {promotingId === customer._id ? <i className="fas fa-spinner fa-spin" /> : 'Seller'}
                                </button>
                              )}
                              {(isAdmin || isSeller) && (
                                <button className="btn btn-sm btn-outline" style={{ fontSize: '.75rem', color: '#64748b', borderColor: '#e2e8f0', width: '100%' }} disabled={!!promotingId} onClick={() => handleRoleChange(customer._id, 'customer')}>
                                  {promotingId === customer._id ? <i className="fas fa-spinner fa-spin" /> : 'Customer'}
                                </button>
                              )}
                              {!isAdmin && (
                                <button className="btn btn-sm" style={{ fontSize: '.75rem', color: '#fff', background: '#ef4444', border: 'none', width: '100%' }} disabled={!!removingId || !!promotingId} onClick={() => handleRemoveUser(customer._id, `${customer.firstName} ${customer.lastName}`)}>
                                  {removingId === customer._id ? <i className="fas fa-spinner fa-spin" /> : 'Remove'}
                                </button>
                              )}
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

AdminCustomers.getLayout = function getLayout(page) {
  return (
    <AdminGuard>
      <AdminLayout title="User Management">{page}</AdminLayout>
    </AdminGuard>
  );
};
