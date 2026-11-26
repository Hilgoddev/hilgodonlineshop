import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import SellerGuard from '@/components/SellerGuard';
import { apiFetch, safeJson } from '../../lib/apiClient';
import { useCurrency } from '@/contexts/CurrencyContext';
import { PAYOUT_METHODS, CRYPTO_ASSETS, CRYPTO_NETWORKS, methodLabel, payoutSummary, discrepancyLink } from '../../lib/payouts';

const STATUS_STYLE = {
  pending:  { bg: '#fef3c7', color: '#92400e', label: 'Pending review', icon: 'fa-hourglass-half' },
  approved: { bg: '#dbeafe', color: '#1e40af', label: 'Approved — sending', icon: 'fa-thumbs-up' },
  paid:     { bg: '#dcfce7', color: '#15803d', label: 'Paid', icon: 'fa-circle-check' },
  rejected: { bg: '#fee2e2', color: '#b91c1c', label: 'Not approved', icon: 'fa-circle-xmark' },
};

const EMPTY_DETAILS = {
  bank_transfer: { bankName: '', accountName: '', accountNumber: '' },
  crypto: { asset: 'USDT', network: 'TRC20', walletAddress: '' },
  other: { provider: '', account: '', note: '' },
};

const fmtDate = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function SellerPayouts() {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [details, setDetails] = useState(EMPTY_DETAILS);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast({ type: '', text: '' }), 4500);
  };

  const load = async () => {
    try {
      const res = await apiFetch('/api/seller/earnings');
      const json = await safeJson(res);
      if (json.success) {
        setEarnings(json.data);
        // Prefill with the details the seller used last time, per method.
        const saved = json.data.payoutDetails || {};
        setDetails((d) => ({
          bank_transfer: { ...d.bank_transfer, ...(saved.bank_transfer || {}) },
          crypto: { ...d.crypto, ...(saved.crypto || {}) },
          other: { ...d.other, ...(saved.other || {}) },
        }));
        if (saved.default && EMPTY_DETAILS[saved.default]) setMethod(saved.default);
      } else setError(json.error || 'Could not load earnings');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const setField = (key, value) => setDetails((d) => ({ ...d, [method]: { ...d[method], [key]: value } }));

  const handleRequest = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) { showToast('Enter a valid amount', 'error'); return; }
    if (amt > (earnings?.available || 0)) { showToast('That is more than your available balance', 'error'); return; }
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/seller/payouts/request', {
        method: 'POST',
        body: JSON.stringify({ amount: amt, payment_method: method, payment_details: details[method] }),
      });
      const json = await safeJson(res);
      if (json.success) {
        showToast('Payout requested! We’ll email you when it’s approved and when it’s sent.');
        setShowForm(false);
        setAmount('');
        load();
      } else {
        showToast(json.error || 'Request failed', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setSubmitting(false); }
  };

  const payouts = earnings?.payouts || [];
  const hasPending = payouts.some((p) => p.status === 'pending');
  const rule = earnings?.commissionRule || { lowRate: 0.05, highRate: 0.10, thresholdEur: 100 };
  const pct = (r) => `${Math.round(Number(r) * 100)}%`;
  const hours = earnings?.payoutArrivalHours || 5;
  const phone = earnings?.supportPhone || '+357 95 130549';
  const d = details[method];

  return (
    <Layout title="My Earnings — Hilgod Seller">
      {toast.text && (
        <div role="status" style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '.9rem', background: toast.type === 'error' ? '#fee2e2' : '#dcfce7', color: toast.type === 'error' ? '#b91c1c' : '#15803d', boxShadow: '0 4px 16px rgba(0,0,0,.12)', maxWidth: 'calc(100vw - 40px)' }}>
          <i className={`fas ${toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`} style={{ marginRight: 8 }}></i>{toast.text}
        </div>
      )}

      <div className="earnings-page">
        <div className="earnings-head">
          <h1><i className="fas fa-wallet"></i>My Earnings</h1>
          <Link href="/seller/how-payouts-work" className="btn btn-outline btn-sm">
            <i className="fas fa-circle-question"></i> How payouts work
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
          </div>
        ) : error ? (
          <div style={{ padding: '16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '10px' }}>{error}</div>
        ) : (
          <>
            {/* Balance */}
            <div className="earnings-cards">
              {[
                { label: 'Total sales', value: earnings?.grossSales || 0, icon: 'fa-chart-line', color: '#0ea5e9' },
                { label: 'Hilgod commission', value: earnings?.commission || 0, icon: 'fa-percent', color: '#f59e0b' },
                { label: 'Your earnings', value: earnings?.netEarnings || 0, icon: 'fa-coins', color: '#10b981' },
                { label: 'Paid out', value: earnings?.withdrawn || 0, icon: 'fa-arrow-up-from-bracket', color: '#8b5cf6' },
                { label: 'Available to withdraw', value: earnings?.available || 0, icon: 'fa-wallet', color: '#E31C1C', big: true },
              ].map(({ label, value, icon, color, big }) => (
                <div key={label} className={`card earnings-card${big ? ' earnings-card--main' : ''}`}>
                  <div className="earnings-card__label"><span style={{ background: `${color}18`, color }}><i className={`fas ${icon}`}></i></span>{label}</div>
                  <div className="earnings-card__value">{formatPrice(value, 'NGN', false)}</div>
                </div>
              ))}
            </div>

            <div className="earnings-rule">
              <i className="fas fa-circle-info"></i>
              <div>
                Hilgod keeps <strong>{pct(rule.lowRate)}</strong> of each item that costs up to <strong>€{rule.thresholdEur}</strong>, and <strong>{pct(rule.highRate)}</strong> of items above €{rule.thresholdEur}. You keep the rest. Only paid orders count (Pay on Delivery orders once delivered).
                {(earnings?.commissionBreakdown || []).length > 0 && (
                  <div className="earnings-rule__split">
                    {earnings.commissionBreakdown.map((b) => (
                      <span key={b.rate}>{formatPrice(b.sales, 'NGN', false)} of sales at {pct(b.rate)} = {formatPrice(b.commission, 'NGN', false)}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Request payout */}
            {!showForm && (
              <div className="earnings-request">
                <button className="btn btn-primary" disabled={!earnings?.available || earnings.available <= 0 || hasPending} onClick={() => setShowForm(true)}>
                  <i className="fas fa-money-bill-transfer"></i> Request payout
                </button>
                {hasPending && <span className="earnings-request__note">You have a request waiting for review. You can request again once it’s approved or declined.</span>}
                {(!earnings?.available || earnings.available <= 0) && !hasPending && <span className="earnings-request__note muted">No balance to withdraw yet.</span>}
              </div>
            )}

            {showForm && (
              <div className="card payout-form">
                <h3><i className="fas fa-money-bill-transfer"></i>Request payout</h3>
                <form onSubmit={handleRequest}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="payout-amount">Amount (₦)</label>
                    <div className="payout-form__amount">
                      <input id="payout-amount" className="form-input" type="number" min="1" max={earnings?.available} value={amount} onChange={(e) => setAmount(e.target.value)} required />
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setAmount(String(Math.floor(earnings?.available || 0)))}>Withdraw all</button>
                    </div>
                    <div className="pf-hint">Available: {formatPrice(earnings?.available || 0, 'NGN', false)}</div>
                  </div>

                  <div className="form-label" style={{ marginTop: 8 }}>How do you want to be paid?</div>
                  <div className="payout-methods" role="radiogroup">
                    {PAYOUT_METHODS.map((m) => (
                      <button key={m.id} type="button" role="radio" aria-checked={method === m.id} className={`payout-method${method === m.id ? ' is-on' : ''}`} onClick={() => setMethod(m.id)}>
                        <i className={`fas ${m.icon}`}></i>
                        <strong>{m.label}{m.id === 'bank_transfer' && <span className="payout-method__tag">Main</span>}</strong>
                        <span>{m.hint}</span>
                      </button>
                    ))}
                  </div>

                  <div className="payout-form__fields">
                    {method === 'bank_transfer' && (<>
                      <div className="form-group"><label className="form-label">Bank name</label><input className="form-input" placeholder="e.g. GTBank, First Bank" value={d.bankName} onChange={(e) => setField('bankName', e.target.value)} required /></div>
                      <div className="form-group"><label className="form-label">Account name</label><input className="form-input" placeholder="Name on the account" value={d.accountName} onChange={(e) => setField('accountName', e.target.value)} required /></div>
                      <div className="form-group"><label className="form-label">Account number</label><input className="form-input" inputMode="numeric" placeholder="10-digit account number" value={d.accountNumber} onChange={(e) => setField('accountNumber', e.target.value.replace(/[^0-9A-Za-z]/g, ''))} maxLength={34} required /></div>
                    </>)}
                    {method === 'crypto' && (<>
                      <div className="form-group"><label className="form-label">Coin</label><select className="form-input" value={d.asset} onChange={(e) => setField('asset', e.target.value)}>{CRYPTO_ASSETS.map((a) => <option key={a}>{a}</option>)}</select></div>
                      <div className="form-group"><label className="form-label">Network</label><select className="form-input" value={d.network} onChange={(e) => setField('network', e.target.value)}>{CRYPTO_NETWORKS.map((n) => <option key={n}>{n}</option>)}</select></div>
                      <div className="form-group payout-form__wide"><label className="form-label">Wallet address</label><input className="form-input" placeholder="Paste your wallet address" value={d.walletAddress} onChange={(e) => setField('walletAddress', e.target.value.trim())} required /></div>
                      <div className="payout-form__warn payout-form__wide"><i className="fas fa-triangle-exclamation"></i> Double-check the coin, network and address. Crypto sent to a wrong address or network can’t be recovered.</div>
                    </>)}
                    {method === 'other' && (<>
                      <div className="form-group"><label className="form-label">Payment service</label><input className="form-input" placeholder="e.g. OPay, PalmPay, PayPal" value={d.provider} onChange={(e) => setField('provider', e.target.value)} required /></div>
                      <div className="form-group"><label className="form-label">Account / phone / email</label><input className="form-input" placeholder="Where we should send it" value={d.account} onChange={(e) => setField('account', e.target.value)} required /></div>
                      <div className="form-group payout-form__wide"><label className="form-label">Note (optional)</label><input className="form-input" placeholder="Anything we need to know" value={d.note} onChange={(e) => setField('note', e.target.value)} /></div>
                    </>)}
                  </div>
                  <div className="pf-hint" style={{ marginBottom: 14 }}>We save these details for next time. You can change them on any request.</div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? <><i className="fas fa-spinner fa-spin"></i> Submitting…</> : <><i className="fas fa-paper-plane"></i> Submit request</>}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* History */}
            <div className="card payout-history">
              <h3><i className="fas fa-clock-rotate-left"></i>Payout history</h3>
              {payouts.length === 0 ? (
                <div className="payout-history__empty"><i className="fas fa-inbox"></i>No payout requests yet.</div>
              ) : (
                <div className="payout-history__list">
                  {payouts.map((p) => {
                    const s = STATUS_STYLE[p.status] || STATUS_STYLE.pending;
                    return (
                      <div key={p.id} className="payout-row">
                        <div className="payout-row__main">
                          <div className="payout-row__amount">{formatPrice(p.amount, 'NGN', false)}</div>
                          <span className="payout-row__status" style={{ background: s.bg, color: s.color }}><i className={`fas ${s.icon}`}></i> {s.label}</span>
                        </div>
                        <div className="payout-row__meta">
                          <span>Requested {fmtDate(p.requested_at)}</span>
                          <span>{methodLabel(p.payment_method)} · {payoutSummary(p.payment_method, p.payment_details || {})}</span>
                          {p.status === 'paid' && (p.paid_at || p.processed_at) && <span>Sent {fmtDate(p.paid_at || p.processed_at)}</span>}
                          {p.payment_reference && <span>Reference: <strong>{p.payment_reference}</strong></span>}
                        </div>
                        {p.admin_notes && <div className="payout-row__note">Note from Hilgod: {p.admin_notes}</div>}
                        {p.status === 'paid' && (
                          <div className="payout-row__notice">
                            <i className="fas fa-clock"></i>
                            <div>
                              Not received within <strong>{hours} hours</strong> of being sent? Contact us on <a href={`tel:${phone.replace(/[^+0-9]/g, '')}`}>{phone}</a> and report a discrepancy.
                              <a className="payout-row__report" href={discrepancyLink(phone, p)} target="_blank" rel="noopener noreferrer"><i className="fab fa-whatsapp"></i> Report on WhatsApp</a>
                            </div>
                          </div>
                        )}
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
