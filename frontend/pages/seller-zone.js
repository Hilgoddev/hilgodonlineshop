import { useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';

export default function SellerZone() {
  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    email: '',
    phone: '',
    businessCategory: 'Electronics & Gadgets',
    monthlyRevenue: 'Just starting'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement actual form submission to backend
    alert('Application submitted! We will contact you shortly. 🎉');
  };

  return (
    <Layout 
      title="Sell on Hilgod — Seller Zone"
      description="Start selling on Hilgod today. Reach millions of customers across Nigeria. Zero monthly fees to start."
    >
      {/* Hero */}
      <div style={{ 
        background: 'linear-gradient(135deg,#1a1a1a,#2d1a1a,var(--primary-dark))', 
        padding: 'var(--space-16) 0', 
        textAlign: 'center', 
        paddingTop: 'calc(var(--space-16) + 70px)' 
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
          <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary btn-lg"
              onClick={() => document.getElementById('seller-form')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <i className="fas fa-store"></i> Start Selling Today
            </button>
            <a 
              href="#seller-how" 
              className="btn btn-lg" 
              style={{ background: 'rgba(255,255,255,.15)', color: '#fff', backdropFilter: 'blur(4px)' }}
            >
              <i className="fas fa-circle-question"></i> How it Works
            </a>
          </div>
          
          {/* Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4,1fr)', 
            gap: 'var(--space-6)', 
            marginTop: 'var(--space-12)', 
            maxWidth: '800px', 
            marginLeft: 'auto', 
            marginRight: 'auto' 
          }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-6)' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-4)' }}>
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
                  <option>Food & Grocery</option>
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
              <button type="submit" className="btn btn-primary btn-full btn-lg">
                <i className="fas fa-store"></i> Submit Application
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}