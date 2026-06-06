import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiFetch } from '../../lib/apiClient';
import { adminJson, errorMessage } from '../../lib/adminApi';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import ConfirmModal from '@/components/ConfirmModal';

const STATUS_COLORS = {
  pending: { bg: '#fef9c3', color: '#a16207' },
  approved: { bg: '#dcfce7', color: '#15803d' },
  rejected: { bg: '#fee2e2', color: '#b91c1c' },
};

export default function AdminRiders() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [busyId, setBusyId] = useState(null);
  const [modal, setModal] = useState({ open: false });
  const [notesModal, setNotesModal] = useState({ open: false, id: null, name: '', action: '' });
  const [adminNotes, setAdminNotes] = useState('');
  const closeModal = () => setModal(m => ({ ...m, open: false }));

  const fetchRiders = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { res, json } = await adminJson('/api/admin/riders');
      if (res.ok && json.success) setRiders(json.data || []);
      else setMessage({ type: 'error', text: errorMessage(json, 'Could not load rider applications') });
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchRiders(); }, []);
  useAutoRefresh(() => fetchRiders({ silent: true }), { table: 'rider_applications' });

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3500);
  };

  const handleStatus = async (id, status, notes = '') => {
    setBusyId(id);
    try {
      const res = await apiFetch(`/api/admin/riders/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, admin_notes: notes }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg('success', `Application ${status}`);
        fetchRiders();
      } else {
        showMsg('error', data.error || 'Failed to update');
      }
    } catch {
      showMsg('error', 'Network error');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = (id, name) => {
    setModal({
      open: true,
      title: 'Delete Application',
      message: `Permanently delete the application from ${name}?`,
      danger: true,
      onConfirm: async () => {
        closeModal();
        setBusyId(id);
        try {
          const res = await apiFetch(`/api/admin/riders/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) { showMsg('success', 'Application deleted'); fetchRiders(); }
          else showMsg('error', data.error || 'Failed to delete');
        } catch { showMsg('error', 'Network error'); }
        finally { setBusyId(null); }
      },
    });
  };

  const openRejectNotes = (id, name) => {
    setAdminNotes('');
    setNotesModal({ open: true, id, name, action: 'rejected' });
  };

  const filtered = riders.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || r.full_name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.phone?.includes(q) || r.state?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = { all: riders.length, pending: 0, approved: 0, rejected: 0 };
  riders.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <AdminGuard>
      <AdminLayout title="Rider Applications">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Rider Applications</h1>
            <p style={{ color: 'var(--gray-1)', fontSize: '.875rem', marginTop: '2px' }}>Review and manage delivery partner applications</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={fetchRiders} disabled={loading}>
            <i className="fas fa-rotate-right"></i> Refresh
          </button>
        </div>

        {message.text && (
          <div style={{ marginBottom: '16px', padding: '10px 16px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: '.9rem',
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#15803d' : '#b91c1c' }}>
            {message.text}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                background: filterStatus === s ? 'var(--primary)' : 'var(--gray-5)',
                color: filterStatus === s ? '#fff' : 'var(--gray-1)',
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s] ?? 0})
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, email, phone or state..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '400px' }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray-1)' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
            <p style={{ marginTop: '12px' }}>Loading applications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray-1)' }}>
            <i className="fas fa-motorcycle" style={{ fontSize: '3rem', opacity: .3 }}></i>
            <p style={{ marginTop: '12px' }}>No applications found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem', minWidth: '720px' }}>
              <thead>
                <tr style={{ background: 'var(--gray-6)', borderBottom: '2px solid var(--gray-4)' }}>
                  {[
                    { label: 'Applicant', cls: '' },
                    { label: 'Contact', cls: '' },
                    { label: 'Vehicle', cls: 'col-hide-sm' },
                    { label: 'State', cls: 'col-hide-sm' },
                    { label: 'License', cls: 'col-hide-md' },
                    { label: 'Applied', cls: 'col-hide-md' },
                    { label: 'Status', cls: '' },
                    { label: 'Actions', cls: '' },
                  ].map(h => (
                    <th key={h.label} className={h.cls} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-1)', whiteSpace: 'nowrap' }}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const isBusy = busyId === r.id;
                  const s = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--gray-5)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700 }}>{r.full_name}</div>
                        {r.date_of_birth && <div style={{ fontSize: '.78rem', color: 'var(--gray-2)' }}>DOB: {formatDate(r.date_of_birth)}</div>}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div>{r.email}</div>
                        <div style={{ color: 'var(--gray-1)' }}>{r.phone}</div>
                      </td>
                      <td className="col-hide-sm" style={{ padding: '12px' }}>{r.vehicle_type || '—'}</td>
                      <td className="col-hide-sm" style={{ padding: '12px' }}>{r.state || '—'}</td>
                      <td className="col-hide-md" style={{ padding: '12px' }}>
                        <span style={{ fontWeight: 600, color: r.has_license ? 'var(--success)' : 'var(--warning)' }}>
                          {r.has_license ? 'Yes' : 'Getting soon'}
                        </span>
                      </td>
                      <td className="col-hide-md" style={{ padding: '12px', whiteSpace: 'nowrap' }}>{formatDate(r.applied_at)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '.78rem', fontWeight: 700, background: s.bg, color: s.color }}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                        {r.admin_notes && (
                          <div style={{ fontSize: '.72rem', color: 'var(--gray-2)', marginTop: '4px', maxWidth: '160px' }} title={r.admin_notes}>
                            {r.admin_notes.substring(0, 40)}{r.admin_notes.length > 40 ? '...' : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {r.status !== 'approved' && (
                            <button
                              className="btn btn-sm"
                              style={{ fontSize: '.75rem', color: '#fff', background: 'var(--success)', border: 'none' }}
                              disabled={isBusy}
                              onClick={() => handleStatus(r.id, 'approved')}
                            >
                              {isBusy ? <i className="fas fa-spinner fa-spin" /> : 'Approve'}
                            </button>
                          )}
                          {r.status !== 'rejected' && (
                            <button
                              className="btn btn-sm"
                              style={{ fontSize: '.75rem', color: '#fff', background: 'var(--warning)', border: 'none' }}
                              disabled={isBusy}
                              onClick={() => openRejectNotes(r.id, r.full_name)}
                            >
                              Reject
                            </button>
                          )}
                          {r.status === 'pending' && (
                            <button
                              className="btn btn-sm"
                              style={{ fontSize: '.75rem', color: '#fff', background: 'var(--gray-2)', border: 'none' }}
                              disabled={isBusy}
                              onClick={() => handleStatus(r.id, 'pending')}
                            >
                              Reset
                            </button>
                          )}
                          <button
                            className="btn btn-sm"
                            style={{ fontSize: '.75rem', color: '#fff', background: '#ef4444', border: 'none' }}
                            disabled={isBusy}
                            onClick={() => confirmDelete(r.id, r.full_name)}
                          >
                            <i className="fas fa-trash-can" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Reject with notes modal */}
        {notesModal.open && (
          <div className="modal-overlay open" onClick={e => { if (e.target.className.includes('modal-overlay')) setNotesModal(m => ({ ...m, open: false })); }}>
            <div className="modal" style={{ maxWidth: '480px' }}>
              <div className="modal__header">
                <span className="modal__title">Reject Application — {notesModal.name}</span>
                <button className="modal__close" onClick={() => setNotesModal(m => ({ ...m, open: false }))}><i className="fas fa-xmark" /></button>
              </div>
              <div className="modal__body">
                <p style={{ marginBottom: '12px', color: 'var(--gray-1)', fontSize: '.9rem' }}>Optionally add a reason that will be sent to the applicant:</p>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Reason for rejection (optional)"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  style={{ width: '100%', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => setNotesModal(m => ({ ...m, open: false }))}>Cancel</button>
                  <button
                    className="btn btn-primary"
                    style={{ background: '#ef4444', border: 'none' }}
                    onClick={() => { setNotesModal(m => ({ ...m, open: false })); handleStatus(notesModal.id, 'rejected', adminNotes); }}
                  >
                    Confirm Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={modal.open}
          title={modal.title}
          message={modal.message}
          danger={modal.danger}
          onConfirm={modal.onConfirm}
          onCancel={closeModal}
        />
      </AdminLayout>
    </AdminGuard>
  );
}
