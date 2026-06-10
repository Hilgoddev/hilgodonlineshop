import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import SellerGuard from '@/components/SellerGuard';
import { apiFetch, safeJson } from '../../lib/apiClient';
import { useCurrency } from '@/contexts/CurrencyContext';

const STATUS_STYLE = {
  pending:  { bg: '#fef3c7', color: '#92400e', label: 'Pending Review' },
  approved: { bg: '#dbeafe', color: '#1e40af', label: 'Approved' },
  paid:     { bg: '#dcfce7', color: '#15803d', label: 'Paid' },
  rejected: { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected' },
};

export default function SellerPayouts() {
  const { formatPrice } = useCurrency();
  const [loading, setLoading]     = useState(true);
  const [earnings, setEarnings]   = useState(null);
  const [error, setError]         = useState('');
  const [toast, setToast]         = useState({ type: '', text: '' });
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    bankName: '',
    accountName: '',
    accountNumber: '',
  });

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast({ type: '', text: '' }), 4000);
  };

  const load = async () => {
    try {
      const res  = await apiFetch('/api/seller/earnings');
      const json = await safeJson(res);
      if (json.success) {
        setEarnings(json.data);
        // Prefill the payout form with saved bank details so the seller doesn't
        // have to re-enter their account number each time.
        const bd = json.data.bankDetails;
        if (bd) {
          setForm(f => ({
            ...f,
            bankName: f.bankName || bd.bankName || '',
            accountName: f.accountName || bd.accountName || '',
            accountNumber: f.accountNumber || bd.accountNumber || '',
          }));
        }
      } else setError(json.error || 'Could not load earnings');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRequest = async (e) => {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { showToast('Enter a valid amount', 'error'); return; }
    if (!form.bankName || !form.accountName || !form.accountNumber) {
      showToast('Please fill in all bank details', 'error'); return;
    }
    setSubmitting(true);
    try {
      const res  = await apiFetch('/api/seller/payouts/request', {
        method: 'POST',
        body: JSON.stringify({
          amount: amt,
          payment_method: form.payment_method,
          payment_details: { bankName: form.bankName, accountName: form.accountName, accountNumber: form.accountNumber },
        }),
      });
      const json = await safeJson(res);
      if (json.success) {
        showToast('Payout request submitted! Admin will review shortly.');
        setShowForm(false);
        setForm({ amount: '', payment_method: 'bank_transfer', bankName: '', accountName: '', accountNumber: '' });
        load();
      } else {
        showToast(json.error || 'Request failed', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setSubmitting(false); }
  };

  const hasPending = (earnings?.payouts || []).some(p => p.status === 'pending');

  return (
    <Layout title="My Earnings — Hilgod Seller">
      {toast.text && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '.9rem', background: toast.type === 'error' ? '#fee2e2' : '#dcfce7', color: toast.type === 'error' ? '#b91c1c' : '#15803d', boxShadow: '0 4px 16px rgba(0,0,0,.12)' }}>
          <i className={`fas ${toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`} style={{ marginRight: 8 }}></i>{toast.text}
        </div>
      )}

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: 'var(--space-8) 0' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 'var(--space-6)' }}>
          <i className="fas fa-wallet" style={{ color: 'var(--primary)', marginRight: 10 }}></i>My Earnings
        </h1>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
          </div>
        ) : error ? (
          <div style={{ padding: '16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '10px' }}>{error}</div>
        ) : (
          <>
            {/* Balance cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              {[
                { label: 'Total Sales', value: earnings?.grossSales ?? earnings?.grossEarnings ?? 0, icon: 'fa-chart-line', color: '#0ea5e9' },
                { label: `Commission (${Math.round((earnings?.commissionRate ?? 0.1) * 100)}%)`, value: earnings?.commission || 0, icon: 'fa-percent', color: '#f59e0b' },
                { label: 'Net Earnings', value: earnings?.grossEarnings || 0, icon: 'fa-coins', color: '#10b981' },
                { label: 'Withdrawn', value: earnings?.withdrawn || 0, icon: 'fa-arrow-up-from-bracket', color: '#8b5cf6' },
                { label: 'Available', value: earnings?.available || 0, icon: 'fa-wallet', color: '#E31C1C' },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={`fas ${icon}`} style={{ color, fontSize: '1rem' }}></i>
                    </div>
                    <span style={{ fontSize: '.8rem', color: 'var(--gray-1)', fontWeight: 500 }}>{label}</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatPrice(value, 'NGN', false)}</div>
                </div>
              ))}
            </div>

            {/* Request payout button */}
            {!showForm && (
              <div style={{ marginBottom: '24px' }}>
                <button
                  className="btn btn-primary"
                  disabled={!earnings?.available || earnings.available <= 0 || hasPending}
                  onClick={() => setShowForm(true)}
                >
                  <i className="fas fa-money-bill-transfer"></i> Request Payout
                </button>
                {hasPending && <span style={{ marginLeft: '12px', fontSize: '.82rem', color: '#92400e', fontWeight: 600 }}>You have a pending request under review.</span>}
                {(!earnings?.available || earnings.available <= 0) && !hasPending && (
                  <span style={{ marginLeft: '12px', fontSize: '.82rem', color: 'var(--gray-1)' }}>No available balance to withdraw.</span>
                )}
              </div>
            )}

            {/* Payout request form */}
            {showForm && (
              <div className="card" style={{ padding: '24px', marginBottom: '28px' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '20px', fontSize: '1.05rem' }}>
                  <i className="fas fa-money-bill-transfer" style={{ color: 'var(--primary)', marginRight: 8 }}></i>Request Payout
                </h3>
                <form onSubmit={handleRequest}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Amount (₦) <span style={{ color: 'var(--gray-1)', fontWeight: 400 }}>max {formatPrice(earnings?.available || 0, 'NGN', false)}</span></label>
                      <input className="form-input" type="number" min="1" max={earnings?.available} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bank Name</label>
                      <input className="form-input" type="text" placeholder="e.g. First Bank" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Account Name</label>
                      <input className="form-input" type="text" placeholder="Name on account" value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Account Number</label>
                      <input className="form-input" type="text" placeholder="10-digit account number" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} maxLength={10} required />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? <><i className="fas fa-spinner fa-spin"></i> Submitting...</> : <><i className="fas fa-paper-plane"></i> Submit Request</>}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Payout history */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '16px', fontSize: '1rem' }}>
                <i className="fas fa-clock-rotate-left" style={{ color: '#8b5cf6', marginRight: 8 }}></i>Payout History
              </h3>
              {(earnings?.payouts || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-1)' }}>
                  <i className="fas fa-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: '12px' }}></i>
                  No payout requests yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {earnings.payouts.map(p => {
                    const s = STATUS_STYLE[p.status] || STATUS_STYLE.pending;
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--gray-6)', borderRadius: '10px', border: '1px solid var(--gray-4)', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{formatPrice(p.amount, 'NGN', false)}</div>
                          <div style={{ fontSize: '.75rem', color: 'var(--gray-1)', marginTop: '2px' }}>
                            {new Date(p.requested_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {p.payment_details?.bankName && ` · ${p.payment_details.bankName}`}
                          </div>
                          {p.admin_notes && <div style={{ fontSize: '.75rem', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>Note: {p.admin_notes}</div>}
                        </div>
                        <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '.75rem', fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

SellerPayouts.getLayout = function getLayout(page) {
  return <SellerGuard>{page}</SellerGuard>;
};
