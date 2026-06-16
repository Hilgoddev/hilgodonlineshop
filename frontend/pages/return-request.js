import { useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { apiFetch } from '@/lib/apiClient';
import { useSession } from '@/contexts/AuthContext';

export default function ReturnRequest() {
  const { data: session, status: authStatus } = useSession();
  const [form, setForm] = useState({ orderId: '', email: '', reason: '', details: '' });
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await apiFetch('/api/returns', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setStatus('success');
      } else {
        setErrorMsg(json.error || 'Could not submit request. Please try again.');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="Return Request — Hilgod Online Store" description="Request a return or refund for your Hilgod order.">
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">Return Request</span>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 800, marginBottom: '8px' }}>
          <i className="fas fa-rotate-left" style={{ color: 'var(--primary)', marginRight: '10px' }}></i>Return / Refund Request
        </h1>
        <p style={{ color: 'var(--gray-1)', marginBottom: 'var(--space-8)', fontSize: '.95rem', lineHeight: 1.7 }}>
          Not happy with your order? We offer a 7-day return window from the date of delivery. Fill in the form below and our support team will get back to you within 24 hours.
        </p>

        {/* Policy summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
          {[
            { icon: 'fa-calendar-check', title: '7-Day Window', desc: 'Returns must be submitted within 7 days of delivery.' },
            { icon: 'fa-box-open', title: 'Original Condition', desc: 'Items must be unused, unwashed, and in original packaging.' },
            { icon: 'fa-money-bill-wave', title: 'Fast Refund', desc: 'Approved refunds are processed within 3–5 business days.' },
          ].map(p => (
            <div key={p.title} style={{ background: 'var(--gray-6)', border: '1px solid var(--gray-4)', borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'center' }}>
              <i className={`fas ${p.icon}`} style={{ fontSize: '1.5rem', color: 'var(--primary)', display: 'block', marginBottom: '10px' }}></i>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>{p.title}</div>
              <div style={{ fontSize: '.82rem', color: 'var(--gray-1)', lineHeight: 1.6 }}>{p.desc}</div>
            </div>
          ))}
        </div>

        {authStatus === 'loading' ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
          </div>
        ) : !session ? (
          <div style={{ padding: '32px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <i className="fas fa-lock" style={{ fontSize: '2rem', color: '#2563eb', display: 'block', marginBottom: '12px' }}></i>
            <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '8px' }}>Login Required</p>
            <p style={{ color: 'var(--gray-1)', fontSize: '.9rem', marginBottom: '20px', lineHeight: 1.6 }}>
              You must be logged in to submit a return request.
            </p>
            <Link href="/auth/login?next=/return-request" className="btn btn-primary">
              <i className="fas fa-sign-in-alt"></i> Log In
            </Link>
          </div>
        ) : status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '48px 32px', background: 'var(--success-light)', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)' }}>
            <i className="fas fa-check-circle" style={{ fontSize: '3rem', color: 'var(--success)', display: 'block', marginBottom: '16px' }}></i>
            <h2 style={{ fontWeight: 800, marginBottom: '8px' }}>Request Submitted!</h2>
            <p style={{ color: 'var(--gray-1)', marginBottom: '24px' }}>Our support team will review your request and contact you within 24 hours.</p>
            <Link href="/" className="btn btn-primary"><i className="fas fa-home"></i> Back to Home</Link>
          </div>
        ) : (
          <div className="card" style={{ padding: '28px' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '20px' }}>Submit Your Return Request</h2>
            {errorMsg && (
              <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '8px', background: '#fee2e2', color: '#b91c1c', fontSize: '.9rem', fontWeight: 600 }}>
                <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>{errorMsg}
              </div>
            )}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Order ID <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="form-input" placeholder="e.g. HGD-ABC12345" value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })} required />
                <div style={{ fontSize: '.75rem', color: 'var(--gray-1)', marginTop: '4px' }}>Find your order ID in your order confirmation email or account dashboard.</div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Reason for Return <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select className="form-input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required>
                  <option value="">-- Select a reason --</option>
                  <option>Item arrived damaged</option>
                  <option>Wrong item sent</option>
                  <option>Item not as described</option>
                  <option>Changed my mind</option>
                  <option>Defective / Not working</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Additional Details</label>
                <textarea className="form-input" rows={4} placeholder="Describe the issue in more detail..." value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
                {submitting ? <><i className="fas fa-spinner fa-spin"></i> Submitting...</> : <><i className="fas fa-paper-plane"></i> Submit Request</>}
              </button>
            </form>
          </div>
        )}

        <div style={{ marginTop: 'var(--space-8)', padding: '20px', background: 'var(--gray-6)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-4)', fontSize: '.85rem', color: 'var(--gray-1)' }}>
          <strong style={{ color: 'var(--dark)' }}>Need help faster?</strong> Contact us directly at <a href="mailto:hilgodonline@gmail.com" style={{ color: 'var(--primary)' }}>hilgodonline@gmail.com</a> or{' '}
          <a href="https://wa.me/2348080535728" style={{ color: 'var(--primary)' }} target="_blank" rel="noopener noreferrer">WhatsApp us</a>.
        </div>
      </div>
    </Layout>
  );
}
