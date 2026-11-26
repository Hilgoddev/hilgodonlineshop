import { useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiFetch, safeJson } from '../../lib/apiClient';
import { useCurrency } from '@/contexts/CurrencyContext';
import { methodLabel } from '../../lib/payouts';

// Everything the admin needs to send the money, by payout method, each with a
// copy button so account numbers and wallet addresses aren't retyped.
function PayoutDetails({ method, details = {} }) {
  const rows = method === 'crypto'
    ? [['Coin', details.asset], ['Network', details.network], ['Wallet', details.walletAddress]]
    : method === 'other'
      ? [['Service', details.provider], ['Account', details.account], ['Note', details.note]]
      : [['Bank', details.bankName], ['Name', details.accountName], ['Account no.', details.accountNumber]];
  const copy = (v) => { try { navigator.clipboard.writeText(String(v)); } catch { /* ignore */ } };
  return (
    <div className="admin-payout-details">
      <div className="admin-payout-details__method">{methodLabel(method)}</div>
      {rows.filter(([, v]) => v).map(([k, v]) => (
        <div key={k} className="admin-payout-details__row">
          <span>{k}</span>
          <strong>{v}</strong>
          {k !== 'Note' && <button type="button" onClick={() => copy(v)} title={`Copy ${k}`} aria-label={`Copy ${k}`}><i className="far fa-copy"></i></button>}
        </div>
      ))}
      {method === 'crypto' && <div className="admin-payout-details__warn">Send only {details.asset} on the {details.network} network.</div>}
    </div>
  );
}

const STATUS_STYLE = {
  pending:  { bg: '#fef3c7', color: '#92400e' },
  approved: { bg: '#dbeafe', color: '#1e40af' },
  paid:     { bg: '#dcfce7', color: '#15803d' },
  rejected: { bg: '#fee2e2', color: '#b91c1c' },
};

export default function AdminPayouts() {
  const { formatPrice } = useCurrency();
  const [payouts, setPayouts]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('pending');
  const [updating, setUpdating] = useState(null);
  const [noteModal, setNoteModal] = useState(null); // { payout, action }
  const [note, setNote]         = useState('');
  const [reference, setReference] = useState('');
  const [toast, setToast]       = useState({ type: '', text: '' });

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast({ type: '', text: '' }), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res  = await apiFetch(`/api/admin/payouts${filter !== 'all' ? `?status=${filter}` : ''}`);
      const json = await safeJson(res);
      if (json.success) setPayouts(json.data || []);
    } catch { showToast('Failed to load payouts', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const handleAction = async (id, status) => {
    setUpdating(id);
    try {
      const res  = await apiFetch(`/api/admin/payouts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, admin_notes: note || null, payment_reference: status === 'paid' ? reference : undefined }),
      });
      const json = await safeJson(res);
      if (json.success) { showToast(`Payout marked as ${status} — the seller has been emailed`); setNoteModal(null); setNote(''); setReference(''); load(); }
      else showToast(json.error || 'Update failed', 'error');
    } catch { showToast('Network error', 'error'); }
    finally { setUpdating(null); }
  };

  const openModal = (payout, action) => { setNoteModal({ payout, action }); setNote(''); setReference(''); };

  return (
    <>
      {toast.text && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '.9rem', background: toast.type === 'error' ? '#fee2e2' : '#dcfce7', color: toast.type === 'error' ? '#b91c1c' : '#15803d', boxShadow: '0 4px 16px rgba(0,0,0,.12)' }}>
          <i className={`fas ${toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`} style={{ marginRight: 8 }}></i>{toast.text}
        </div>
      )}

      <div className="admin-payout-steps">
        <span><b>1</b> Check the request and the seller’s details</span>
        <span><b>2</b> Approve (or reject with a reason)</span>
        <span><b>3</b> Send the money, then <strong>Mark paid</strong> with the transfer reference</span>
        <span><b>4</b> The seller is emailed at each step and sees it in their payout history</span>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['pending', 'approved', 'paid', 'rejected', 'all'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '6px 16px', borderRadius: '999px', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: filter === s ? 'var(--primary)' : 'var(--gray-3)', background: filter === s ? 'var(--primary)' : 'transparent', color: filter === s ? '#fff' : 'var(--dark)', textTransform: 'capitalize' }}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
        </div>
      ) : payouts.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--gray-1)' }}>
          <i className="fas fa-inbox" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}></i>
          No {filter !== 'all' ? filter : ''} payout requests.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {payouts.map(p => {
            const s = STATUS_STYLE[p.status] || STATUS_STYLE.pending;
            return (
              <div key={p.id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '4px' }}>
                      {formatPrice(p.amount, 'NGN', false)}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{p.seller?.name}</div>
                    <div style={{ fontSize: '.78rem', color: 'var(--gray-1)' }}>{p.seller?.email}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--gray-1)', marginTop: '4px' }}>
                      Requested {new Date(p.requested_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {p.payment_details && <PayoutDetails method={p.payment_method} details={p.payment_details} />}
                    {p.status === 'paid' && (
                      <div style={{ fontSize: '.78rem', color: '#15803d', marginTop: '6px' }}>
                        <i className="fas fa-circle-check"></i> Sent {new Date(p.paid_at || p.processed_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {p.payment_reference && <> · Ref: <strong>{p.payment_reference}</strong></>}
                      </div>
                    )}
                    {p.admin_notes && (
                      <div style={{ fontSize: '.75rem', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>Note: {p.admin_notes}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '.75rem', fontWeight: 700, background: s.bg, color: s.color, textTransform: 'capitalize' }}>{p.status}</span>
                    {p.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-sm" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }} onClick={() => openModal(p, 'approved')} disabled={!!updating}>
                          <i className="fas fa-check"></i> Approve
                        </button>
                        <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }} onClick={() => openModal(p, 'rejected')} disabled={!!updating}>
                          <i className="fas fa-xmark"></i> Reject
                        </button>
                      </div>
                    )}
                    {p.status === 'approved' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-sm btn-primary" onClick={() => openModal(p, 'paid')} disabled={!!updating}>
                          <i className="fas fa-money-bill-wave"></i> Mark Paid
                        </button>
                        <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }} onClick={() => openModal(p, 'rejected')} disabled={!!updating}>
                          <i className="fas fa-xmark"></i> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action modal */}
      {noteModal && (
        <div onClick={() => setNoteModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '8px', textTransform: 'capitalize' }}>
              {noteModal.action === 'approved' ? '✅ Approve' : noteModal.action === 'paid' ? '💸 Mark as Paid' : '❌ Reject'} Payout
            </h3>
            <p style={{ fontSize: '.88rem', color: 'var(--gray-1)', marginBottom: '16px' }}>
              {formatPrice(noteModal.payout.amount, 'NGN', false)} for {noteModal.payout.seller?.name}
            </p>
            {noteModal.payout.payment_details && <PayoutDetails method={noteModal.payout.payment_method} details={noteModal.payout.payment_details} />}
            {noteModal.action === 'paid' && (
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Transfer reference <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="form-input" value={reference} onChange={e => setReference(e.target.value)} placeholder={noteModal.payout.payment_method === 'crypto' ? 'Transaction hash' : 'Bank / transfer reference'} maxLength={140} />
                <div style={{ fontSize: '.75rem', color: 'var(--gray-1)', marginTop: 4 }}>Only mark paid once the money has actually been sent. The seller is told to contact support if it hasn’t arrived within 5 hours.</div>
              </div>
            )}
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">{noteModal.action === 'rejected' ? 'Reason (shown to the seller)' : 'Note to the seller (optional)'}</label>
              <textarea className="form-textarea" value={note} onChange={e => setNote(e.target.value)} placeholder="Visible to the seller and included in their email" style={{ minHeight: '70px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-outline" onClick={() => setNoteModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleAction(noteModal.payout.id, noteModal.action)} disabled={!!updating || (noteModal.action === 'paid' && reference.trim().length < 3)}>
                {updating ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

AdminPayouts.getLayout = function getLayout(page) {
  return (
    <AdminGuard>
      <AdminLayout title="Payouts">{page}</AdminLayout>
    </AdminGuard>
  );
};
