import { useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';

const openings = [
  { title: 'Frontend Developer',        dept: 'Engineering', type: 'Full-time',  location: 'Benin City / Remote', desc: 'Build fast, beautiful Next.js pages for millions of shoppers across Africa.' },
  { title: 'Customer Support Lead',     dept: 'Support',     type: 'Full-time',  location: 'Benin City',          desc: 'Own the voice of Hilgod — help buyers and sellers resolve issues swiftly.' },
  { title: 'Logistics Coordinator',     dept: 'Operations',  type: 'Full-time',  location: 'Lagos / Abuja',       desc: 'Plan and oversee last-mile delivery across our growing nationwide network.' },
  { title: 'Growth & Marketing Manager',dept: 'Marketing',   type: 'Full-time',  location: 'Remote',              desc: 'Drive acquisition, retention and brand visibility across digital channels.' },
  { title: 'Delivery Partner',          dept: 'Logistics',   type: 'Freelance',  location: 'Nationwide',          desc: 'Earn money making deliveries in your city. Flexible hours, competitive pay.' },
];

const EMPTY = { fullName: '', email: '', phone: '', coverNote: '', cvLink: '' };

export default function Careers() {
  const [applyFor, setApplyFor] = useState(null); // role title string
  const [form, setForm]         = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState('');

  const open = (role) => { setApplyFor(role); setForm(EMPTY); setError(''); setSubmitted(false); };
  const close = () => setApplyFor(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/careers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: applyFor }),
      });
      const json = await res.json();
      if (json.success) { setSubmitted(true); }
      else { setError(json.error || 'Submission failed. Please try again.'); }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="Careers — Hilgod Online Store" description="Join the Hilgod team. Open roles in engineering, support, operations and more.">
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">Careers</span>
      </nav>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#1e0a3c,#3b0764)', borderRadius: 'var(--radius-md)', padding: 'clamp(40px,8vw,72px) clamp(24px,6vw,60px)', marginBottom: 'var(--space-10)', color: '#fff', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 30%,rgba(124,58,237,.3),transparent 60%)', pointerEvents: 'none' }} />
        <h1 style={{ fontSize: 'clamp(1.8rem,5vw,3rem)', fontWeight: 900, marginBottom: '16px' }}>Build Africa's Best Marketplace</h1>
        <p style={{ fontSize: 'clamp(.9rem,2vw,1.1rem)', color: 'rgba(255,255,255,.75)', maxWidth: '560px', margin: '0 auto 28px', lineHeight: 1.8 }}>
          We are a small, ambitious team on a mission to make online commerce accessible to every Nigerian. Join us and help shape what comes next.
        </p>
      </div>

      {/* Values */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-10)' }}>
        {[
          { icon: 'fa-rocket',       title: 'Move Fast',      desc: 'We ship features weekly and learn from real users.' },
          { icon: 'fa-earth-africa', title: 'Africa First',   desc: 'Every decision is made with the African market in mind.' },
          { icon: 'fa-people-group', title: 'Team Driven',    desc: 'Ideas from everyone — title doesn\'t matter, impact does.' },
          { icon: 'fa-chart-line',   title: 'Grow Together',  desc: 'Your career grows as Hilgod grows. We invest in people.' },
        ].map(v => (
          <div key={v.title} style={{ background: 'var(--white)', border: '1px solid var(--gray-4)', borderRadius: 'var(--radius-md)', padding: '24px', textAlign: 'center' }}>
            <i className={`fas ${v.icon}`} style={{ fontSize: '1.6rem', color: 'var(--primary)', display: 'block', marginBottom: '12px' }}></i>
            <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>{v.title}</h3>
            <p style={{ fontSize: '.85rem', color: 'var(--gray-1)', lineHeight: 1.6 }}>{v.desc}</p>
          </div>
        ))}
      </div>

      {/* Open Roles */}
      <div style={{ marginBottom: 'var(--space-10)' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 'var(--space-6)' }}>Open Roles</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {openings.map(role => (
            <div key={role.title} style={{ border: '1px solid var(--gray-4)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '20px 24px', background: 'var(--white)' }}>
                <div>
                  <h3 style={{ fontWeight: 700, marginBottom: '4px', fontSize: '1rem' }}>{role.title}</h3>
                  <p style={{ fontSize: '.82rem', color: 'var(--gray-1)', marginBottom: '8px' }}>{role.desc}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[role.dept, role.type, role.location].map(tag => (
                      <span key={tag} style={{ fontSize: '.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: 'var(--gray-5)', color: 'var(--gray-1)' }}>{tag}</span>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => open(role.title)}>
                  <i className="fas fa-paper-plane"></i> Apply Now
                </button>
              </div>

              {/* Inline application form — expands under the role card */}
              {applyFor === role.title && (
                <div style={{ padding: '24px', borderTop: '1px solid var(--gray-4)', background: 'var(--gray-6)' }}>
                  {submitted ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <i className="fas fa-circle-check" style={{ fontSize: '2.5rem', color: 'var(--success)', display: 'block', marginBottom: '12px' }}></i>
                      <h4 style={{ fontWeight: 800, marginBottom: '6px' }}>Application Submitted!</h4>
                      <p style={{ color: 'var(--gray-1)', fontSize: '.9rem', marginBottom: '16px' }}>
                        Thanks! We'll review your application and reach out within 5 business days.
                      </p>
                      <button className="btn btn-outline btn-sm" onClick={close}>Close</button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit}>
                      <h4 style={{ fontWeight: 800, marginBottom: '16px', fontSize: '.95rem' }}>
                        Apply for: <span style={{ color: 'var(--primary)' }}>{role.title}</span>
                      </h4>

                      {error && (
                        <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '.85rem', marginBottom: '16px' }}>
                          <i className="fas fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{error}
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '12px', marginBottom: '12px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Full Name *</label>
                          <input className="form-input" type="text" required value={form.fullName}
                            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Your full name" />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Email Address *</label>
                          <input className="form-input" type="email" required value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Phone Number</label>
                          <input className="form-input" type="tel" value={form.phone}
                            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+234..." />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">CV / Portfolio Link</label>
                          <input className="form-input" type="url" value={form.cvLink}
                            onChange={e => setForm(f => ({ ...f, cvLink: e.target.value }))} placeholder="https://drive.google.com/..." />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label">Why do you want this role? (optional)</label>
                        <textarea className="form-textarea" rows={4} value={form.coverNote}
                          onChange={e => setForm(f => ({ ...f, coverNote: e.target.value }))}
                          placeholder="Tell us a little about yourself and why you're a great fit..." />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-outline" onClick={close} disabled={submitting}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                          {submitting ? <><i className="fas fa-spinner fa-spin"></i> Sending...</> : <><i className="fas fa-paper-plane"></i> Submit Application</>}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* General application */}
      <div style={{ background: 'var(--gray-6)', border: '1px solid var(--gray-4)', borderRadius: 'var(--radius-md)', padding: '32px', textAlign: 'center' }}>
        <h3 style={{ fontWeight: 800, marginBottom: '8px' }}>Don't see your role?</h3>
        <p style={{ color: 'var(--gray-1)', marginBottom: '20px', fontSize: '.9rem' }}>We're always looking for talented people.</p>
        <button className="btn btn-primary" onClick={() => open('General Application')}>
          <i className="fas fa-paper-plane"></i> Send a General Application
        </button>
      </div>

      {/* General application modal */}
      {applyFor === 'General Application' && (
        <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '540px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--gray-4)', position: 'sticky', top: 0, background: '#fff', borderRadius: '16px 16px 0 0', zIndex: 1 }}>
              <h3 style={{ fontWeight: 800, fontSize: '1rem', margin: 0 }}>General Application</h3>
              <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--gray-1)' }}><i className="fas fa-xmark"></i></button>
            </div>
            <div style={{ padding: '20px 22px' }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <i className="fas fa-circle-check" style={{ fontSize: '2.5rem', color: 'var(--success)', display: 'block', marginBottom: '12px' }}></i>
                  <h4 style={{ fontWeight: 800, marginBottom: '6px' }}>Application Submitted!</h4>
                  <p style={{ color: 'var(--gray-1)', fontSize: '.9rem' }}>We'll be in touch soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {error && <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '.85rem' }}>{error}</div>}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" type="text" required value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Email *</label>
                    <input className="form-input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Phone</label>
                    <input className="form-input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">CV / Portfolio Link</label>
                    <input className="form-input" type="url" value={form.cvLink} onChange={e => setForm(f => ({ ...f, cvLink: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">How can you contribute?</label>
                    <textarea className="form-textarea" rows={4} value={form.coverNote} onChange={e => setForm(f => ({ ...f, coverNote: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-outline" onClick={close}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? <><i className="fas fa-spinner fa-spin"></i> Sending...</> : 'Submit'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
