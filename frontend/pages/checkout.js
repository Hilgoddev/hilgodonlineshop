import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';
import { useShop } from '@/components/ShopProvider';

export default function Checkout() {
  const [currentStep, setCurrentStep] = useState(1);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const router = useRouter();
  const { cart, clearCart, showToast } = useShop();
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: 'Lagos',
    instructions: ''
  });
  
  const [selectedPayment, setSelectedPayment] = useState('stripe');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.street || !formData.city) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    try {
      const orderData = {
        items: cart.map(item => ({
          productId: item.product._id,
          quantity: item.quantity,
          price: item.product.price
        })),
        shippingAddress: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          street: formData.street,
          city: formData.city,
          state: formData.state,
          instructions: formData.instructions
        },
        paymentMethod: selectedPayment
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();
      
      if (result.success) {
        clearCart();

        if (selectedPayment === 'paystack') {
          const paymentResponse = await fetch('/api/payment/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: result.data._id,
              amount: totals.total,
              email: formData.email,
              name: `${formData.firstName} ${formData.lastName}`
            }),
          });
          
          const paymentResult = await paymentResponse.json();
          if (paymentResult.success) {
            window.location.href = paymentResult.data.authorization_url;
          }
        } else {
          setOrderPlaced(true);
        }
      } else {
        showToast('Failed to place order. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      showToast('An error occurred while placing your order.', 'error');
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    cart.forEach(item => {
      subtotal += item.product.price * (item.quantity || 1);
    });
    const deliveryFee = subtotal > 50000 ? 0 : 1500;
    const total = subtotal + deliveryFee;
    return { subtotal, deliveryFee, total };
  };

  const totals = calculateTotals();
  const isFormValid = formData.firstName && formData.lastName && formData.email && formData.phone && formData.street && formData.city;

  // Order Success View
  if (orderPlaced) {
    return (
      <Layout title="Order Placed — Hilgod Online Store">
        <div style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-4)' }}>
          <div style={{ 
            width: '100px', height: '100px', background: 'linear-gradient(135deg, var(--success), #2dd284)', 
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto var(--space-6)', fontSize: '2.8rem', color: '#fff',
            boxShadow: '0 8px 32px rgba(34,197,94,.3)', animation: 'pulse 2s infinite'
          }}>
            <i className="fas fa-check"></i>
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: 'var(--space-3)', color: 'var(--dark)' }}>
            Order Placed Successfully!
          </h2>
          <p style={{ color: 'var(--gray-1)', marginBottom: 'var(--space-6)', maxWidth: '500px', margin: '0 auto var(--space-6)', lineHeight: '1.6' }}>
            Thank you for shopping with Hilgod! Your order is being processed and you'll receive a confirmation email shortly.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/track-order" className="btn btn-primary btn-lg">
              <i className="fas fa-location-dot"></i> Track Order
            </Link>
            <Link href="/" className="btn btn-outline btn-lg">
              <i className="fas fa-shop"></i> Continue Shopping
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Checkout — Hilgod Online Store"
      description="Secure checkout. Pay with Stripe, Mastercard, Paystack, OPay or Visa."
    >
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <Link href="/cart">Cart</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">Checkout</span>
      </nav>

      {/* Secure Checkout Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--dark), var(--dark-2))',
        borderRadius: 'var(--radius-md)', padding: 'var(--space-4) var(--space-6)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <i className="fas fa-shield-halved" style={{ fontSize: '1.4rem', color: 'var(--success)' }}></i>
          <div>
            <div style={{ color: '#fff', fontWeight: '700', fontSize: '1rem' }}>Secure Checkout</div>
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '.78rem' }}>256-bit SSL Encrypted</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          {['Stripe', 'Visa', 'MC', 'Paystack'].map(logo => (
            <div key={logo} style={{
              background: 'rgba(255,255,255,.12)', borderRadius: 'var(--radius-sm)',
              padding: '4px 10px', fontSize: '.72rem', fontWeight: '700', color: 'rgba(255,255,255,.8)'
            }}>{logo}</div>
          ))}
        </div>
      </div>

      <h1 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: 'var(--space-6)' }}>
        <i className="fas fa-shopping-bag" style={{ color: 'var(--primary)' }}></i> Checkout
      </h1>

      {/* Steps */}
      <div className="checkout-steps" style={{ marginBottom: 'var(--space-8)' }}>
        <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
          <div className="step-number">{currentStep > 1 ? <i className="fas fa-check"></i> : '1'}</div>
          <span className="step-label">Address</span>
        </div>
        <div className="step-line"></div>
        <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
          <div className="step-number">{currentStep > 2 ? <i className="fas fa-check"></i> : '2'}</div>
          <span className="step-label">Payment</span>
        </div>
        <div className="step-line"></div>
        <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <span className="step-label">Review</span>
        </div>
      </div>

      <div className="checkout-layout">
        {/* LEFT: Steps */}
        <div>
          {/* Step 1: Address */}
          {currentStep === 1 && (
            <div className="checkout-section">
              <h3><i className="fas fa-map-marker-alt" style={{ color: 'var(--primary)' }}></i> Delivery Address</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input type="text" className="form-input" placeholder="First name" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input type="text" className="form-input" placeholder="Last name" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <div className="input-with-icon">
                    <input type="email" className="form-input" placeholder="your@email.com" name="email" value={formData.email} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <div className="input-with-icon">
                    <input type="tel" className="form-input" placeholder="+234 800 0000000" name="phone" value={formData.phone} onChange={handleInputChange} required />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Street Address *</label>
                <input type="text" className="form-input" placeholder="House number, street name" name="street" value={formData.street} onChange={handleInputChange} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City / Town *</label>
                  <input type="text" className="form-input" placeholder="City" name="city" value={formData.city} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <select className="form-select form-input" name="state" value={formData.state} onChange={handleInputChange}>
                    {['Lagos', 'Abuja', 'Kano', 'Rivers', 'Oyo', 'Enugu', 'Delta', 'Anambra', 'Kaduna', 'Edo', 'Ogun', 'Imo'].map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Instructions (optional)</label>
                <textarea className="form-textarea" placeholder="e.g. Leave at gate, call before delivery..." name="instructions" value={formData.instructions} onChange={handleInputChange}></textarea>
              </div>
              <button 
                className="btn btn-primary btn-lg btn-full"
                onClick={() => setCurrentStep(2)}
                disabled={!isFormValid}
              >
                Continue to Payment <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {currentStep === 2 && (
            <div className="checkout-section">
              <h3><i className="fas fa-credit-card" style={{ color: 'var(--primary)' }}></i> Payment Method</h3>
              <div className="payment-methods">
                {[
                  { id: 'stripe', label: 'Stripe', desc: 'Credit/Debit Card via Stripe', color: '#6772e5' },
                  { id: 'paystack', label: 'Paystack', desc: 'Card & Bank Transfer via Paystack', color: '#0ba4db' },
                  { id: 'opay', label: 'OPay', desc: 'OPay Wallet & Transfer', color: '#1dcf5f' },
                  { id: 'card', label: 'VISA / MC', desc: 'Visa / Mastercard Direct', color: '#1a1f71' },
                  { id: 'pod', label: 'CASH', desc: 'Pay on Delivery', color: 'var(--success)' },
                ].map(pm => (
                  <label 
                    key={pm.id}
                    className={`payment-option ${selectedPayment === pm.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPayment(pm.id)}
                  >
                    <input type="radio" name="payment" value={pm.id} checked={selectedPayment === pm.id} onChange={() => {}} />
                    <div style={{ 
                      background: pm.color, color: '#fff', fontSize: '.75rem', padding: '4px 12px', 
                      borderRadius: '4px', fontWeight: '700', whiteSpace: 'nowrap' 
                    }}>
                      {pm.label}
                    </div>
                    <span style={{ fontSize: '.88rem' }}>{pm.desc}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                <button className="btn btn-outline" onClick={() => setCurrentStep(1)}>
                  <i className="fas fa-arrow-left"></i> Back
                </button>
                <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => setCurrentStep(3)}>
                  Review Order <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div className="checkout-section">
              <h3><i className="fas fa-clipboard-check" style={{ color: 'var(--primary)' }}></i> Review Your Order</h3>
              
              {/* Address Summary */}
              <div style={{ 
                background: 'var(--gray-6)', borderRadius: 'var(--radius)', padding: 'var(--space-4)', 
                marginBottom: 'var(--space-4)', border: '1px solid var(--gray-4)' 
              }}>
                <div style={{ fontWeight: '700', fontSize: '.88rem', marginBottom: '6px' }}>
                  <i className="fas fa-map-marker-alt" style={{ color: 'var(--primary)' }}></i> Delivery Address
                </div>
                <p style={{ fontSize: '.85rem', color: 'var(--gray-1)', lineHeight: '1.5' }}>
                  {formData.firstName} {formData.lastName}<br />
                  {formData.street}, {formData.city}, {formData.state}<br />
                  {formData.phone} · {formData.email}
                </p>
              </div>

              {/* Order Items */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                {cart.map(item => (
                  <div key={item.product._id} className="order-summary-item">
                    <img 
                      className="order-summary-img"
                      src={item.product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'} 
                      alt={item.product.name}
                    />
                    <div className="order-summary-details">
                      <div className="order-summary-name">{item.product.name}</div>
                      <div className="order-summary-qty">Qty: {item.quantity || 1}</div>
                    </div>
                    <div className="order-summary-price">
                      ₦{(item.product.price * (item.quantity || 1)).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                <button className="btn btn-outline" onClick={() => setCurrentStep(2)}>
                  <i className="fas fa-arrow-left"></i> Back
                </button>
                <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handlePlaceOrder}>
                  <i className="fas fa-lock"></i> Place Order — ₦{totals.total.toLocaleString()}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Summary */}
        <div>
          <div className="cart-summary" style={{ position: 'sticky', top: '144px' }}>
            <h3><i className="fas fa-receipt" style={{ color: 'var(--primary)' }}></i> Order Summary</h3>
            <div style={{ fontSize: '.85rem', color: 'var(--gray-1)', marginBottom: 'var(--space-3)' }}>
              {cart.length} {cart.length === 1 ? 'item' : 'items'} in your order
            </div>
            <div className="summary-row">
              <span className="label">Subtotal</span>
              <span>₦{totals.subtotal.toLocaleString()}</span>
            </div>
            <div className="summary-row">
              <span className="label">Delivery</span>
              <span style={totals.deliveryFee === 0 ? { color: 'var(--success)', fontWeight: '600' } : {}}>
                {totals.deliveryFee === 0 ? 'FREE' : `₦${totals.deliveryFee.toLocaleString()}`}
              </span>
            </div>
            <div className="summary-row total">
              <span className="label">Total</span>
              <span>₦{totals.total.toLocaleString()}</span>
            </div>
            
            {totals.deliveryFee === 0 && (
              <div style={{ 
                marginTop: 'var(--space-3)', padding: '8px var(--space-3)', background: 'var(--success-light)', 
                borderRadius: 'var(--radius)', fontSize: '.78rem', color: 'var(--success)', fontWeight: '600',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <i className="fas fa-truck-fast"></i> Free delivery on orders above ₦50,000!
              </div>
            )}

            <div style={{ 
              marginTop: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: 'var(--gray-6)', 
              borderRadius: 'var(--radius)', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '.82rem', color: 'var(--gray-1)' 
            }}>
              <i className="fas fa-shield-halved" style={{ color: 'var(--success)' }}></i>
              <span>Your payment is secured with 256-bit SSL encryption</span>
            </div>

            <div style={{ marginTop: 'var(--space-4)' }}>
              <div style={{ fontSize: '.78rem', color: 'var(--gray-2)', marginBottom: '6px', fontWeight: '600' }}>Accepted Payments</div>
              <div className="payment-logos">
                {['Stripe', 'MC', 'VISA', 'Paystack', 'OPay'].map(logo => (
                  <div key={logo} className="payment-logo" style={{ 
                    background: 'var(--gray-6)', border: '1px solid var(--gray-4)', 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '.7rem', fontWeight: '700', color: 'var(--gray-1)' 
                  }}>
                    {logo}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

Checkout.getLayout = function getLayout(page) {
  return <AuthGuard>{page}</AuthGuard>;
};