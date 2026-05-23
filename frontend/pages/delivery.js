import { useState } from 'react';
import Layout from '@/components/Layout';

export default function Delivery() {
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    state: 'Lagos',
    vehicleType: 'Motorcycle',
    hasLicense: 'yes'
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitStatus('');
    try {
      const res = await fetch('/api/delivery/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setSubmitStatus('success');
      } else {
        setSubmitStatus('error');
      }
    } catch {
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout 
      title="Delivery Partner — Hilgod Online Store"
      description="Become a Hilgod delivery rider. Earn money on your own schedule. Fast onboarding."
    >
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg,#0a1628,#1a2d4d,#0d3b6e)',
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
            color: '#60a5fa', 
            fontWeight: '700', 
            textTransform: 'uppercase', 
            letterSpacing: '1px', 
            marginBottom: 'var(--space-3)' 
          }}>
            <i className="fas fa-motorcycle"></i> DELIVERY PARTNERS
          </div>
          <h1 style={{ 
            fontSize: 'clamp(1.8rem,4vw,3rem)', 
            fontWeight: '900', 
            color: '#fff', 
            marginBottom: 'var(--space-4)' 
          }}>
            Earn on Your <span style={{ color: 'var(--primary)' }}>Own Schedule</span>
          </h1>
          <p style={{ 
            color: 'rgba(255,255,255,.75)', 
            fontSize: '1rem', 
            maxWidth: '540px', 
            margin: '0 auto var(--space-8)', 
            lineHeight: '1.7' 
          }}>
            Join Hilgod's growing fleet of delivery riders. Earn competitive pay per delivery, bonuses, and full flexibility to work when you want.
          </p>
          <button 
            className="btn btn-primary btn-lg"
            onClick={() => document.getElementById('rider-form')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <i className="fas fa-motorcycle"></i> Apply to Ride
          </button>
          
          {/* Stats */}
          <div className="delivery-stats">
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)' }}>₦5K+</div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '.85rem' }}>Avg. Daily Earnings</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)' }}>20K+</div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '.85rem' }}>Riders Nationwide</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)' }}>48h</div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '.85rem' }}>Fast Onboarding</div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div style={{ padding: 'var(--space-16) 0', background: '#fff' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: '800', marginBottom: 'var(--space-12)' }}>
            Rider Benefits
          </h2>
          <div className="delivery-benefits">
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--gray-5)' }}>
              <div style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: 'var(--space-4)' }}>
                <i className="fas fa-money-bill-wave"></i>
              </div>
              <h3 style={{ fontWeight: '700', marginBottom: '8px' }}>Competitive Pay</h3>
              <p style={{ color: 'var(--gray-1)', fontSize: '.9rem' }}>
                Earn ₦1,500–₦3,000 per delivery plus bonuses for peak hours.
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--gray-5)' }}>
              <div style={{ fontSize: '2.5rem', color: 'var(--success)', marginBottom: 'var(--space-4)' }}>
                <i className="fas fa-calendar-check"></i>
              </div>
              <h3 style={{ fontWeight: '700', marginBottom: '8px' }}>Flexible Hours</h3>
              <p style={{ color: 'var(--gray-1)', fontSize: '.9rem' }}>
                Work when you want, take breaks when you need. You're the boss.
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--gray-5)' }}>
              <div style={{ fontSize: '2.5rem', color: 'var(--info)', marginBottom: 'var(--space-4)' }}>
                <i className="fas fa-shield-halved"></i>
              </div>
              <h3 style={{ fontWeight: '700', marginBottom: '8px' }}>Insurance Cover</h3>
              <p style={{ color: 'var(--gray-1)', fontSize: '.9rem' }}>
                All riders get accident and health insurance while on active duty.
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--gray-5)' }}>
              <div style={{ fontSize: '2.5rem', color: 'var(--warning)', marginBottom: 'var(--space-4)' }}>
                <i className="fas fa-mobile-screen-button"></i>
              </div>
              <h3 style={{ fontWeight: '700', marginBottom: '8px' }}>Rider App</h3>
              <p style={{ color: 'var(--gray-1)', fontSize: '.9rem' }}>
                Our app gives you routes, delivery info, earnings, and support.
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--gray-5)' }}>
              <div style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: 'var(--space-4)' }}>
                <i className="fas fa-trophy"></i>
              </div>
              <h3 style={{ fontWeight: '700', marginBottom: '8px' }}>Bonuses & Rewards</h3>
              <p style={{ color: 'var(--gray-1)', fontSize: '.9rem' }}>
                Top riders earn monthly bonuses, data, and special rewards.
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--gray-5)' }}>
              <div style={{ fontSize: '2.5rem', color: 'var(--success)', marginBottom: 'var(--space-4)' }}>
                <i className="fas fa-graduation-cap"></i>
              </div>
              <h3 style={{ fontWeight: '700', marginBottom: '8px' }}>Free Training</h3>
              <p style={{ color: 'var(--gray-1)', fontSize: '.9rem' }}>
                Get trained, certified, and equipped before your first delivery.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Form */}
      <div id="rider-form" style={{ padding: 'var(--space-16) 0', background: 'var(--gray-6)' }}>
        <div className="container" style={{ maxWidth: '600px' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: '800', marginBottom: 'var(--space-2)' }}>
            Apply to Ride
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--gray-1)', marginBottom: 'var(--space-8)' }}>
            We'll review your application and reach out within 48 hours.
          </p>
          {submitStatus === 'success' && (
            <div style={{ marginBottom: '16px', padding: '14px 18px', background: '#dcfce7', color: '#15803d', borderRadius: '8px', fontWeight: 600 }}>
              Application submitted! We will contact you shortly.
            </div>
          )}
          {submitStatus === 'error' && (
            <div style={{ marginBottom: '16px', padding: '14px 18px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontWeight: 600 }}>
              Something went wrong. Please try again.
            </div>
          )}
          <div className="card" style={{ padding: 'var(--space-8)' }}>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    placeholder="Full name"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    required
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
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
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">State</label>
                  <select 
                    className="form-select form-input"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                  >
                    <option>Lagos</option>
                    <option>Abuja</option>
                    <option>Kano</option>
                    <option>Rivers</option>
                    <option>Oyo</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Type</label>
                  <select 
                    className="form-select form-input"
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleInputChange}
                  >
                    <option>Motorcycle</option>
                    <option>Bicycle</option>
                    <option>Car</option>
                    <option>Van/Pickup</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Do you have a valid driver's license?</label>
                <select 
                  className="form-select form-input"
                  name="hasLicense"
                  value={formData.hasLicense}
                  onChange={handleInputChange}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No (getting soon)</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={submitting}>
                <i className="fas fa-motorcycle"></i> {submitting ? 'Submitting...' : 'Apply Now'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}