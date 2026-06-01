import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { apiFetch } from '../lib/apiClient';
import { useSession } from '@/contexts/AuthContext';
import ConfirmModal from '@/components/ConfirmModal';

export default function SellerZone() {
  const router = useRouter();
  const { data: session } = useSession();
  const isSeller = session?.user?.role === 'seller' || session?.user?.role === 'admin';
  const [submitLoading, setSubmitLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'alert' });
  const closeModal = () => setModal(m => ({ ...m, open: false }));
  const FORM_KEY = 'hilgod_seller_form';
  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    email: '',
    phone: '',
    businessCategory: 'Electronics & Gadgets',
    monthlyRevenue: 'Just starting'
  });
  const canSubmit = !applicationStatus || applicationStatus.status === 'rejected';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Restore saved form data on mount; pre-fill email from session if not already set.
  // Uses localStorage (not sessionStorage) so the data survives the signup email-
  // verification round-trip, which opens the confirmation link in a new browser tab.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FORM_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      setFormData(prev => ({
        ...prev,
        ...parsed,
        email: parsed.email || session?.user?.email || prev.email,
        fullName: parsed.fullName || session?.user?.name || prev.fullName,
      }));
    } catch (_) {}
  }, [session]);

  useEffect(() => {
    const hasData = Object.values(formData).some(v => v && v !== 'Electronics & Gadgets' && v !== 'Just starting');
    if (hasData) {
      try { localStorage.setItem(FORM_KEY, JSON.stringify(formData)); } catch (_) {}
    }
  }, [formData]);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await apiFetch('/api/seller/application-status');
        if (!res.ok) {
          setStatusLoading(false);
          return;
        }
        const data = await res.json();
        if (data.success) {
          setApplicationStatus(data.data);
        }
      } catch (_) {
        // Ignore unauthenticated/network status checks for this public page.
      } finally {
        setStatusLoading(false);
      }
    };
    loadStatus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session) {
      try { localStorage.setItem(FORM_KEY, JSON.stringify(formData)); } catch (_) {}
      router.push('/auth/login?redirect=/seller-zone');
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await apiFetch('/api/seller/apply', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        try { localStorage.removeItem(FORM_KEY); } catch (_) {}
        setModal({ open: true, title: 'Application Submitted', message: 'Your application has been submitted and is pending admin approval.', type: 'alert', onConfirm: () => { closeModal(); router.replace('/account'); } });
      } else {
        setModal({ open: true, title: 'Submission Failed', message: data.error || data.message || 'Failed to submit application', type: 'alert', danger: true, onConfirm: closeModal });
      }
    } catch {
      setModal({ open: true, title: 'Error', message: 'Failed to submit application. Please try again.', type: 'alert', danger: true, onConfirm: closeModal });
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <>
    <Layout
      title="Sell on Hilgod — Seller Zone"
      description="Start selling on Hilgod today. Reach millions of customers across Nigeria. Zero monthly fees to start."
    >
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg,#1a1a1a,#2d1a1a,var(--primary-dark))',
        padding: 'var(--space-16) 0',
        textAlign: 'center',
        paddingTop: 'calc(var(--space-16) + 70px)',
        marginLeft: '-1rem',
        marginRight: '-1rem',
        marginTop: '-1rem',
        width: 'calc(100% + 2rem)',
      }}>
        <div className="container">
          <div style={{ 
            fontSize: '.82rem', 
            color: 'var(--primary-light)', 
            fontWeight: '700', 
            textTransform: 'uppercase', 
            letterSpacing: '1px', 
            marginBottom: 'var(--space-3)' 
          }}>
            <i className="fas fa-store"></i> SELLER ZONE
          </div>
          <h1 style={{ 
            fontSize: 'clamp(2rem,5vw,3.5rem)', 
            fontWeight: '900', 
            color: '#fff', 
            marginBottom: 'var(--space-4)', 
            maxWidth: '800px', 
            marginLeft: 'auto', 
            marginRight: 'auto' 
          }}>
            Grow Your Business<br />
            <span style={{ color: 'var(--primary)' }}>with Hilgod</span>
          </h1>
          <p style={{ 
            color: 'rgba(255,255,255,.75)', 
            fontSize: '1.1rem', 
            maxWidth: '600px', 
            margin: '0 auto var(--space-8)', 
            lineHeight: '1.7' 
          }}>
            Join thousands of successful sellers reaching millions of customers across Nigeria. Easy setup, transparent fees, powerful tools.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap', margin: '0 auto var(--space-8)', maxWidth: '480px' }}>
            <button
              className="btn btn-primary btn-lg"
              style={{ flex: '1 1 180px', minWidth: '180px' }}
              onClick={() => document.getElementById('seller-form')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <i className="fas fa-store"></i> Start Selling Today
            </button>
            <a
              href="#seller-how"
              className="btn btn-lg"
              style={{ flex: '1 1 180px', minWidth: '180px', background: 'rgba(255,255,255,.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,.25)', backdropFilter: 'blur(4px)', textAlign: 'center' }}
            >
              <i className="fas fa-circle-question"></i> How it Works
            </a>
          </div>
          
          {/* Stats */}
          <div className="seller-zone-stats">
            <div>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--primary)' }}>2M+</div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '.85rem' }}>Active Customers</div>
            </div>
            <div>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--primary)' }}>50K+</div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '.85rem' }}>Sellers</div>
            </div>
            <div>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--primary)' }}>₦0</div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '.85rem' }}>Monthly Fees</div>
            </div>
            <div>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--primary)' }}>36</div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '.85rem' }}>States Covered</div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div id="seller-how" className="page-wrapper" style={{ padding: 'var(--space-16) 0', background: 'var(--gray-6)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
            <div style={{ 
              fontSize: '.82rem', 
              color: 'var(--primary)', 
              fontWeight: '700', 
              textTransform: 'uppercase', 
              letterSpacing: '1px' 
            }}>
              HOW IT WORKS
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '6px' }}>
              Start Selling in 3 Easy Steps
            </h2>
          </div>
          <div className="seller-zone-steps">
            <div style={{ 
              textAlign: 'center', 
              padding: 'var(--space-6)', 
              background: '#fff', 
              borderRadius: 'var(--radius-lg)', 
              boxShadow: 'var(--shadow)' 
            }}>
              <div style={{ 
                width: '70px', 
                height: '70px', 
                background: 'var(--primary-xlight)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto var(--space-4)', 
                fontSize: '1.8rem', 
                color: 'var(--primary)' 
              }}>
                1
              </div>
              <h3 style={{ fontWeight: '700', marginBottom: '8px' }}>
                <i className="fas fa-user-plus" style={{ color: 'var(--primary)' }}></i> Register
              </h3>
              <p style={{ color: 'var(--gray-1)', fontSize: '.9rem', lineHeight: '1.7' }}>
                Create your free seller account with just your email and phone number. Verification takes minutes.
              </p>
            </div>
            <div style={{ 
              textAlign: 'center', 
              padding: 'var(--space-6)', 
              background: '#fff', 
              borderRadius: 'var(--radius-lg)', 
              boxShadow: 'var(--shadow)' 
            }}>
              <div style={{ 
                width: '70px', 
                height: '70px', 
                background: 'var(--primary-xlight)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto var(--space-4)', 
                fontSize: '1.8rem', 
                color: 'var(--primary)' 
              }}>
                2
              </div>
              <h3 style={{ fontWeight: '700', marginBottom: '8px' }}>
                <i className="fas fa-box-open" style={{ color: 'var(--primary)' }}></i> List Products
              </h3>
              <p style={{ color: 'var(--gray-1)', fontSize: '.9rem', lineHeight: '1.7' }}>
                Add your products with photos, descriptions and prices. Our tools make it easy to manage your inventory.
              </p>
            </div>
            <div style={{ 
              textAlign: 'center', 
              padding: 'var(--space-6)', 
              background: '#fff', 
              borderRadius: 'var(--radius-lg)', 
              boxShadow: 'var(--shadow)' 
            }}>
              <div style={{ 
                width: '70px', 
                height: '70px', 
                background: 'var(--primary-xlight)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto var(--space-4)', 
                fontSize: '1.8rem', 
                color: 'var(--primary)' 
              }}>
                3
              </div>
              <h3 style={{ fontWeight: '700', marginBottom: '8px' }}>
                <i className="fas fa-money-bill-wave" style={{ color: 'var(--primary)' }}></i> Get Paid
              </h3>
              <p style={{ color: 'var(--gray-1)', fontSize: '.9rem', lineHeight: '1.7' }}>
                Receive payments directly to your bank account. We handle delivery logistics and customer support.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: 'var(--space-16) 0', background: '#fff' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: '800', marginBottom: 'var(--space-12)' }}>
            Why Sell on Hilgod?
          </h2>
          <div className="seller-zone-features">
            <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-4)', backdropFilter: 'blur(4px)' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                background: 'var(--primary-xlight)', 
                borderRadius: 'var(--radius-md)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: '0', 
                color: 'var(--primary)', 
                fontSize: '1.2rem' 
              }}>
                <i className="fas fa-chart-line"></i>
              </div>
              <div>
                <h4 style={{ fontWeight: '700', marginBottom: '4px' }}>Massive reach</h4>
                <p style={{ color: 'var(--gray-1)', fontSize: '.88rem' }}>
                  Access 2M+ shoppers across Nigeria instantly.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                background: 'var(--success-light)', 
                borderRadius: 'var(--radius-md)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: '0', 
                color: 'var(--success)', 
                fontSize: '1.2rem' 
              }}>
                <i className="fas fa-truck-fast"></i>
              </div>
              <div>
                <h4 style={{ fontWeight: '700', marginBottom: '4px' }}>Delivery handled</h4>
                <p style={{ color: 'var(--gray-1)', fontSize: '.88rem' }}>
                  Our logistics network delivers to all 36 states, same/next day.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                background: 'var(--warning-light)', 
                borderRadius: 'var(--radius-md)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: '0', 
                color: 'var(--warning)', 
                fontSize: '1.2rem' 
              }}>
                <i className="fas fa-shield-halved"></i>
              </div>
              <div>
                <h4 style={{ fontWeight: '700', marginBottom: '4px' }}>Protected payments</h4>
                <p style={{ color: 'var(--gray-1)', fontSize: '.88rem' }}>
                  Secure escrow payments. Get paid after successful delivery.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                background: 'var(--info-light)', 
                borderRadius: 'var(--radius-md)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: '0', 
                color: 'var(--info)', 
                fontSize: '1.2rem' 
              }}>
                <i className="fas fa-headset"></i>
              </div>
              <div>
                <h4 style={{ fontWeight: '700', marginBottom: '4px' }}>Dedicated support</h4>
                <p style={{ color: 'var(--gray-1)', fontSize: '.88rem' }}>
                  Seller success team available 24/7 to help you grow.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                background: 'var(--primary-xlight)', 
                borderRadius: 'var(--radius-md)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: '0', 
                color: 'var(--primary)', 
                fontSize: '1.2rem' 
              }}>
                <i className="fas fa-tachometer-alt"></i>
              </div>
              <div>
                <h4 style={{ fontWeight: '700', marginBottom: '4px' }}>Seller dashboard</h4>
                <p style={{ color: 'var(--gray-1)', fontSize: '.88rem' }}>
                  Real-time sales analytics, inventory management, and reports.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                background: 'var(--success-light)', 
                borderRadius: 'var(--radius-md)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: '0', 
                color: 'var(--success)', 
                fontSize: '1.2rem' 
              }}>
                <i className="fas fa-percent"></i>
              </div>
              <div>
                <h4 style={{ fontWeight: '700', marginBottom: '4px' }}>Low commission</h4>
                <p style={{ color: 'var(--gray-1)', fontSize: '.88rem' }}>
                  Only 5-10% commission per sale. No monthly subscription fees.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seller Form */}
      <div id="seller-form" style={{ padding: 'var(--space-16) 0', background: 'var(--gray-6)' }}>
        <div className="container" style={{ maxWidth: '640px' }}>
          {isSeller && (
            <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-5)', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
              <strong style={{ fontSize: '1.1rem' }}>Your seller account is active!</strong>
              <p style={{ marginTop: '8px', marginBottom: '16px', color: 'var(--gray-1)' }}>
                You already have seller access. Go to your dashboard to manage products, view sales, and more.
              </p>
              <Link href="/seller/dashboard" className="btn btn-primary btn-lg">
                <i className="fas fa-store"></i> Go to Seller Dashboard
              </Link>
            </div>
          )}
          {!isSeller && !statusLoading && applicationStatus ? (
            <div
              className="card"
              style={{
                padding: 'var(--space-5)',
                marginBottom: 'var(--space-5)',
                border: '1px solid var(--gray-4)',
                background:
                  applicationStatus.status === 'approved'
                    ? '#dcfce7'
                    : applicationStatus.status === 'rejected'
                      ? '#fee2e2'
                      : '#fef3c7',
              }}
            >
              <strong style={{ textTransform: 'capitalize' }}>
                Current application status: {applicationStatus.status}
              </strong>
              <p style={{ marginTop: '8px', marginBottom: 0 }}>
                {applicationStatus.status === 'approved'
                  ? 'Your seller account is approved. You can now upload products from the seller dashboard.'
                  : applicationStatus.status === 'rejected'
                    ? 'Your application was rejected. You can update details and submit again.'
                    : 'Your application is pending admin review. We will notify you once reviewed.'}
              </p>
            </div>
          ) : null}
          <h2 style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: '800', marginBottom: 'var(--space-2)' }}>
            Register as a Seller
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--gray-1)', marginBottom: 'var(--space-8)' }}>
            Fill out the form and our team will reach out within 24 hours.
          </p>
          <div className="card" style={{ padding: 'var(--space-8)' }}>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Your name" 
                    required
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Business Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Store/business name" 
                    required
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-with-icon">
                  <i className="fas fa-envelope input-icon"></i>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="Email" 
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div className="input-with-icon">
                  <i className="fas fa-phone input-icon"></i>
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="+234 800 0000000" 
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Business Category</label>
                <select 
                  className="form-select form-input"
                  name="businessCategory"
                  value={formData.businessCategory}
                  onChange={handleInputChange}
                >
                  <option>Electronics & Gadgets</option>
                  <option>Fashion & Clothing</option>
                  <option>Home Appliances</option>
                  <option>Herbs & Spices</option>
                  <option>Beauty & Health</option>
                  <option>Sports & Outdoors</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Revenue (Approx.)</label>
                <select 
                  className="form-select form-input"
                  name="monthlyRevenue"
                  value={formData.monthlyRevenue}
                  onChange={handleInputChange}
                >
                  <option>Just starting</option>
                  <option>Up to ₦100,000</option>
                  <option>₦100,000 – ₦1,000,000</option>
                  <option>₦1M – ₦10M</option>
                  <option>₦10M+</option>
                </select>
              </div>
              {!session && (
                <div style={{ marginBottom: '12px', padding: '10px 14px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '.88rem', color: '#92400e' }}>
                  <i className="fas fa-circle-info" style={{ marginRight: '6px' }}></i>
                  You need an account to apply.{' '}
                  <Link href="/auth/login?redirect=/seller-zone" style={{ color: '#b45309', fontWeight: '700', textDecoration: 'underline' }}>Sign in</Link>
                  {' '}or{' '}
                  <Link href="/auth/signup?redirect=/seller-zone" style={{ color: '#b45309', fontWeight: '700', textDecoration: 'underline' }}>Create account</Link>
                  {' '}first — your form data will be kept.
                </div>
              )}
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={submitLoading || !canSubmit}>
                <i className="fas fa-store"></i>{' '}
                {!canSubmit ? 'Application already submitted' : submitLoading ? 'Submitting...' : session ? 'Submit Application' : 'Sign In & Apply'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
    <ConfirmModal
      isOpen={modal.open}
      title={modal.title}
      message={modal.message}
      type={modal.type}
      danger={modal.danger}
      onConfirm={modal.onConfirm || closeModal}
      onCancel={closeModal}
    />
    </>
  );
}
