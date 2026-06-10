import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';
import { useShop } from '@/components/ShopProvider';
import { useCurrency } from '../contexts/CurrencyContext';
import { apiFetch, safeJson } from '../lib/apiClient';
import { normalizePricing } from '../lib/pricing';
import { cleanEnv } from '../lib/env';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePublishableKey = cleanEnv(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
// Enabled if the flag is 'true' OR if a publishable key is present (fail-open so
// a misconfigured NEXT_PUBLIC_STRIPE_ENABLED doesn't silently hide Stripe).
const stripeEnabled = cleanEnv(process.env.NEXT_PUBLIC_STRIPE_ENABLED)?.toLowerCase() === 'true'
  || (!!stripePublishableKey && stripePublishableKey.startsWith('pk_'));
// Catch a failed Stripe.js load (commonly blocked by ad-blockers / Firefox
// tracking protection, or offline) so it degrades to "Stripe unavailable"
// instead of throwing an uncaught promise rejection. Paystack/POD still work.
const stripePromise = stripePublishableKey?.startsWith('pk_')
  ? loadStripe(stripePublishableKey).catch((err) => {
      console.warn('Stripe.js failed to load — Stripe payments unavailable:', err?.message || err);
      return null;
    })
  : null;

const PAYMENT_METHODS = [
  { id: 'paystack', label: 'Paystack', desc: 'Card & bank transfer via Paystack', color: '#0ba4db' },
  { id: 'stripe', label: 'Stripe', desc: 'Credit / debit card via Stripe', color: '#635bff' },
  { id: 'bank_transfer', label: 'Bank Transfer', desc: 'Transfer directly to our bank account', color: '#2563eb' },
  { id: 'pod', label: 'Pay on Delivery', desc: 'Pay cash when your order arrives', color: '#16a34a' },
];


function StripePaymentForm({ amount, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const { formatPrice } = useCurrency();
  const [stripeError, setStripeError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [formComplete, setFormComplete] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !formComplete) return;
    setProcessing(true);
    setStripeError('');

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout` },
      redirect: 'if_required',
    });

    if (error) {
      setStripeError(error.message || 'Payment failed. Please try again.');
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  const canPay = stripe && elements && formComplete && !processing;

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        border: '1px solid var(--gray-4)', borderRadius: 'var(--radius)',
        padding: 'var(--space-4)', marginBottom: 'var(--space-4)', background: '#fff'
      }}>
        <PaymentElement
          onChange={(e) => {
            setFormComplete(e.complete);
            if (e.error) setStripeError(e.error.message);
            else setStripeError('');
          }}
        />
      </div>
      {stripeError && (
        <div style={{
          color: 'var(--danger)', fontSize: '.85rem', marginBottom: 'var(--space-3)',
          padding: '8px 12px', background: 'var(--danger-light)', borderRadius: 'var(--radius)'
        }}>
          <i className="fas fa-circle-exclamation"></i> {stripeError}
        </div>
      )}
      <button
        type="submit"
        className="btn btn-primary btn-lg btn-full"
        disabled={!canPay}
        style={!canPay ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
      >
        {processing
          ? <><i className="fas fa-spinner fa-spin"></i> Processing...</>
          : <><i className="fas fa-lock"></i> Pay {formatPrice(amount, 'NGN', false)}</>
        }
      </button>
    </form>
  );
}

export default function Checkout() {
  const { cart, cartOptions = {}, clearCart, showToast } = useShop();
  const { formatPrice } = useCurrency();

  const [currentStep, setCurrentStep] = useState(1);
  const [view, setView] = useState('checkout'); // 'checkout' | 'stripe' | 'bank_transfer' | 'success'
  const [selectedPayment, setSelectedPayment] = useState('paystack');
  const [submitting, setSubmitting] = useState(false);
  const [showBankComingSoon, setShowBankComingSoon] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    street: '', city: '', country: 'Nigeria', state: 'Lagos', instructions: '',
  });

  const [geoData, setGeoData] = useState(null);

  // Detect return from Paystack redirect or Stripe 3DS redirect.
  // For Paystack we MUST call verify/:reference to sync the order status —
  // just showing the success screen without verifying leaves the order as
  // 'pending' whenever the webhook fires late or not at all.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paystackRef = params.get('reference') || params.get('trxref');
    const stripeIntent = params.get('payment_intent');
    const stripeStatus = params.get('redirect_status');

    if (paystackRef) {
      window.history.replaceState({}, '', '/checkout');
      // Verify with backend — syncs order to 'paid' and fires emails
      apiFetch(`/api/payment/verify/${encodeURIComponent(paystackRef)}`)
        .then(r => r.json())
        .then(result => {
          if (result?.data?.status === 'success') {
            clearCart();
            setView('success');
          } else {
            // Payment failed or abandoned
            showToast(
              `Payment ${result?.data?.status || 'could not be confirmed'}. Your order is saved — please retry.`,
              'error'
            );
          }
        })
        .catch(() => {
          // Network error — still show success; webhook will sync later
          clearCart();
          setView('success');
        });
      return;
    }

    if (stripeIntent && stripeStatus === 'succeeded') {
      clearCart();
      setView('success');
      window.history.replaceState({}, '', '/checkout');
    }
  }, []);

  useEffect(() => {
    fetch('https://countriesnow.space/api/v0.1/countries/states')
      .then(r => r.json())
      .then(json => setGeoData(json.data || []))
      .catch(() => setGeoData([]));
  }, []);

  // Deduplicate countries — countriesnow.space returns duplicate entries
  // (e.g. "Congo" appears twice). Use Map keyed by name to keep first occurrence.
  const countries = geoData
    ? [...new Map(geoData.map(c => [c.name, c])).values()].map(c => c.name)
    : [];
  const currentCountryData = geoData?.find(c => c.name === formData.country);
  const states = currentCountryData
    ? [...new Set(currentCountryData.states?.map(s => s.name) || [])]
    : [];

  // Saved when order is placed so views after cart-clear still have correct values
  const [stripeClientSecret, setStripeClientSecret] = useState(null);
  const [placedOrderId, setPlacedOrderId] = useState(null);
  const [orderTotals, setOrderTotals] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'country') {
      setFormData(prev => ({ ...prev, country: value, state: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    cart.forEach(item => {
      const itemPricing = normalizePricing(item.product || {});
      subtotal += itemPricing.price * (item.quantity || 1);
    });
    const deliveryFee = subtotal > 50000 ? 0 : 1500;
    return { subtotal, deliveryFee, total: subtotal + deliveryFee };
  };

  const totals = calculateTotals();
  const displayTotals = orderTotals || totals;
  const isFormValid = formData.firstName && formData.lastName && formData.email && formData.phone && formData.street && formData.city && formData.state;

  const handlePlaceOrder = async () => {
    if (!isFormValid) { showToast('Please fill in all required fields.', 'error'); return; }
    setSubmitting(true);

    try {
      const snapshot = calculateTotals();
      const cartSnapshot = [...cart];

      const orderRes = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map(i => {
            const itemPricing = normalizePricing(i.product || {});
            return {
              productId: i.product._id,
              quantity: i.quantity,
              price: itemPricing.price,
              selectedOptions: i.options || cartOptions[i.product._id] || null,
            };
          }),
          shippingAddress: { ...formData },
          paymentMethod: selectedPayment,
        }),
      });
      const orderResult = await safeJson(orderRes);

      if (!orderResult.success) {
        showToast(orderResult.error || orderResult.message || 'Failed to place order. Please try again.', 'error');
        setSubmitting(false);
        return;
      }

      const orderId = orderResult.data._id;
      setPlacedOrderId(orderId);
      setOrderTotals(snapshot);
      // NOTE: clearCart() is called only on each payment's SUCCESS path below,
      // so if payment fails the user still has their cart and can retry.

      if (selectedPayment === 'paystack') {
        const payRes = await apiFetch('/api/payment/initiate', {
          method: 'POST',
          body: JSON.stringify({ orderId, amount: snapshot.total, email: formData.email }),
        });
        const payResult = await safeJson(payRes);
        if (payResult.success) {
          clearCart(); // clear only on successful redirect to Paystack
          window.location.href = payResult.data.authorization_url;
        } else {
          const reason = payResult.message ? ` (${payResult.message})` : '';
          showToast(`Payment initialization failed${reason}. Your order is saved — please retry or choose a different payment method.`, 'error');
          setSubmitting(false);
        }

      } else if (selectedPayment === 'stripe') {
        const piRes = await apiFetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          body: JSON.stringify({ order_id: orderId }),
        });
        const piResult = await safeJson(piRes);
        if (piResult.success) {
          clearCart(); // clear when entering Stripe payment flow
          setStripeClientSecret(piResult.clientSecret);
          setView('stripe');
        } else {
          const msg = piRes.status === 503
            ? 'Stripe payments are not yet available. Your order has been saved — please use Bank Transfer or Pay on Delivery instead.'
            : piResult.message || 'Stripe initialization failed.';
          showToast(msg, 'error');
          setSubmitting(false);
        }

      } else if (selectedPayment === 'bank_transfer') {
        const bdRes = await apiFetch('/api/payment/bank-details');
        const bdResult = await safeJson(bdRes);
        if (bdResult.success) setBankDetails(bdResult.data);
        clearCart(); // order placed, awaiting bank transfer confirmation
        setView('bank_transfer');

      } else {
        // Pay on delivery — order confirmed
        clearCart();
        setView('success');
      }
    } catch (err) {
      console.error('Order error:', err);
      showToast('An error occurred. Please try again.', 'error');
      setSubmitting(false);
    }
  };

  // ── SUCCESS VIEW ────────────────────────────────────────────────────────────
  if (view === 'success') {
    return (
      <Layout title="Order Placed — Hilgod Online Store">
        <div style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-4)' }}>
          <div style={{
            width: '100px', height: '100px',
            background: 'linear-gradient(135deg, var(--success), #2dd284)',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto var(--space-6)',
            fontSize: '2.8rem', color: '#fff',
            boxShadow: '0 8px 32px rgba(34,197,94,.3)',
          }}>
            <i className="fas fa-check"></i>
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: 'var(--space-3)' }}>
            Order Placed!
          </h2>
          <p style={{ color: 'var(--gray-1)', maxWidth: '500px', margin: '0 auto var(--space-6)', lineHeight: '1.6' }}>
            Thank you for shopping with Hilgod. Your order is being processed and you will receive a confirmation email shortly.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/track-order" className="checkout-btn btn btn-primary btn-lg">
              <i className="fas fa-location-dot"></i> Track Order
            </Link>
            <Link href="/" className="checkout-btn-outline btn btn-outline btn-lg">
              <i className="fas fa-shop"></i> Continue Shopping
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // ── STRIPE PAYMENT VIEW ─────────────────────────────────────────────────────
  if (view === 'stripe' && stripeClientSecret && stripePromise && stripeEnabled) {
    return (
      <Layout title="Pay with Stripe — Hilgod Online Store">
        <nav className="breadcrumb">
          <Link href="/">Home</Link>
          <i className="fas fa-chevron-right sep"></i>
          <span className="current">Payment</span>
        </nav>
        <div style={{ maxWidth: '520px', margin: '0 auto', padding: 'var(--space-6) 0' }}>
          <div className="checkout-section" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: 'var(--space-2)' }}>
              <i className="fas fa-credit-card" style={{ color: 'var(--primary)' }}></i> Pay with Stripe
            </h2>
            <p style={{ fontSize: '.88rem', color: 'var(--gray-1)', marginBottom: 'var(--space-4)' }}>
              Secured by Stripe. We never store your card details.
            </p>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: stripeClientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: { colorPrimary: '#E31C1C', borderRadius: '8px' },
                },
                loader: 'auto',
              }}
            >
              <StripePaymentForm
                amount={displayTotals.total}
                onSuccess={() => setView('success')}
              />
            </Elements>
          </div>
          <div style={{ textAlign: 'center', fontSize: '.78rem', color: 'var(--gray-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <i className="fas fa-shield-halved" style={{ color: 'var(--success)' }}></i>
            256-bit SSL encrypted · Powered by Stripe
          </div>
        </div>
      </Layout>
    );
  }

  // ── BANK TRANSFER VIEW ──────────────────────────────────────────────────────
  if (view === 'bank_transfer') {
    const ref = `HGD-${(placedOrderId || '').substring(0, 8).toUpperCase()}`;
    return (
      <Layout title="Bank Transfer — Hilgod Online Store">
        <nav className="breadcrumb">
          <Link href="/">Home</Link>
          <i className="fas fa-chevron-right sep"></i>
          <span className="current">Bank Transfer</span>
        </nav>
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: 'var(--space-6) 0' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{
              width: '72px', height: '72px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto var(--space-3)', fontSize: '1.8rem', color: '#fff',
            }}>
              <i className="fas fa-building-columns"></i>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '6px' }}>Bank Transfer Details</h2>
            <p style={{ color: 'var(--gray-1)', fontSize: '.9rem' }}>
              Transfer <strong>{formatPrice(displayTotals.total, 'NGN', false)}</strong> to the account below.
            </p>
          </div>

          {/* Bank Details Card */}
          <div className="checkout-section" style={{ marginBottom: 'var(--space-4)' }}>
            {bankDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[
                  { label: 'Bank', value: bankDetails.bankName },
                  { label: 'Account Name', value: bankDetails.accountName },
                  { label: 'Account Number', value: bankDetails.accountNumber },
                  { label: 'Sort Code', value: bankDetails.sortCode },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--gray-6)', borderRadius: 'var(--radius)',
                    border: '1px solid var(--gray-4)',
                  }}>
                    <span style={{ fontSize: '.82rem', color: 'var(--gray-1)' }}>{label}</span>
                    <span style={{ fontWeight: '700', fontSize: '.95rem' }}>{value}</span>
                  </div>
                ))}

                {/* Reference — highlight */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 'var(--space-3) var(--space-4)',
                  background: '#eff6ff', borderRadius: 'var(--radius)',
                  border: '2px solid #2563eb',
                }}>
                  <span style={{ fontSize: '.82rem', color: '#1e40af', fontWeight: '600' }}>
                    Transfer Reference <i className="fas fa-circle-info"></i>
                  </span>
                  <span style={{ fontWeight: '800', fontSize: '1rem', color: '#1e40af', letterSpacing: '.05em' }}>
                    {ref}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--gray-1)' }}>
                <i className="fas fa-spinner fa-spin"></i> Loading bank details...
              </div>
            )}
          </div>

          {/* Instructions */}
          <div style={{
            background: 'var(--info-light)', borderRadius: 'var(--radius)',
            padding: 'var(--space-4)', marginBottom: 'var(--space-4)',
            fontSize: '.85rem', color: 'var(--info)', lineHeight: '1.6',
          }}>
            <strong><i className="fas fa-circle-info"></i> Instructions</strong>
            <ol style={{ margin: 'var(--space-2) 0 0 var(--space-4)', paddingLeft: '0' }}>
              <li>Transfer exactly <strong>{formatPrice(displayTotals.total, 'NGN', false)}</strong> to the account above.</li>
              <li>Include <strong>{ref}</strong> as the transfer description / narration.</li>
              <li>Your order will be confirmed and processed once payment is verified.</li>
            </ol>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Link href="/track-order" className="btn btn-primary" style={{ flex: 1 }}>
              <i className="fas fa-location-dot"></i> Track Order
            </Link>
            <Link href="/account" className="btn btn-outline" style={{ flex: 1 }}>
              <i className="fas fa-receipt"></i> My Orders
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // ── MAIN CHECKOUT (Steps 1–3) ───────────────────────────────────────────────
  return (
    <Layout
      title="Checkout — Hilgod Online Store"
      description="Secure checkout. Pay with Paystack, Stripe, bank transfer, or cash on delivery."
    >
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <Link href="/cart">Cart</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">Checkout</span>
      </nav>

      {/* Secure banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--dark), var(--dark-2))',
        borderRadius: 'var(--radius-md)', padding: 'var(--space-4) var(--space-6)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <i className="fas fa-shield-halved" style={{ fontSize: '1.4rem', color: 'var(--success)' }}></i>
          <div>
            <div style={{ color: '#fff', fontWeight: '700', fontSize: '1rem' }}>Secure Checkout</div>
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '.78rem' }}>256-bit SSL Encrypted</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          {['Paystack', 'Stripe', 'Bank Transfer', 'Cash on Delivery'].map(label => (
            <div key={label} style={{
              background: 'rgba(255,255,255,.12)', borderRadius: 'var(--radius-sm)',
              padding: '4px 10px', fontSize: '.72rem', fontWeight: '700', color: 'rgba(255,255,255,.8)',
            }}>{label}</div>
          ))}
        </div>
      </div>

      <h1 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: 'var(--space-6)' }}>
        <i className="fas fa-shopping-bag" style={{ color: 'var(--primary)' }}></i> Checkout
      </h1>

      {/* Step indicators */}
      <div className="checkout-steps" style={{ marginBottom: 'var(--space-8)' }}>
        {['Address', 'Payment', 'Review'].map((label, idx) => (
          <div key={label} style={{ display: 'contents' }}>
            <div className={`step ${currentStep >= idx + 1 ? 'active' : ''} ${currentStep > idx + 1 ? 'completed' : ''}`}>
              <div className="step-number">
                {currentStep > idx + 1 ? <i className="fas fa-check"></i> : idx + 1}
              </div>
              <span className="step-label">{label}</span>
            </div>
            {idx < 2 && <div className="step-line"></div>}
          </div>
        ))}
      </div>

      <div className="checkout-layout">
        <div>

          {/* ── Step 1: Address ─────────────────────────────── */}
          {currentStep === 1 && (
            <div className="checkout-section">
              <h3><i className="fas fa-map-marker-alt" style={{ color: 'var(--primary)' }}></i> Delivery Address</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input className="form-input" type="text" placeholder="First name" name="firstName" value={formData.firstName} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input className="form-input" type="text" placeholder="Last name" name="lastName" value={formData.lastName} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input className="form-input" type="email" placeholder="your@email.com" name="email" value={formData.email} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input className="form-input" type="tel" placeholder="+234 800 0000000" name="phone" value={formData.phone} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Street Address *</label>
                <input className="form-input" type="text" placeholder="House number, street name" name="street" value={formData.street} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <select className="form-select form-input" name="country" value={formData.country} onChange={handleInputChange} disabled={!geoData}>
                  {!geoData && <option value="Nigeria">Loading countries...</option>}
                  {countries.map((c, i) => <option key={`${c}-${i}`} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City / Town *</label>
                  <input className="form-input" type="text" placeholder="City" name="city" value={formData.city} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">State / Province *</label>
                  {states.length > 0 ? (
                    <select className="form-select form-input" name="state" value={formData.state} onChange={handleInputChange} required>
                      <option value="">Select state</option>
                      {states.map((s, i) => <option key={`${s}-${i}`} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input className="form-input" type="text" placeholder="State / Province" name="state" value={formData.state} onChange={handleInputChange} required />
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Instructions (optional)</label>
                <textarea className="form-textarea" placeholder="e.g. Leave at gate, call before delivery..." name="instructions" value={formData.instructions} onChange={handleInputChange}></textarea>
              </div>
              <button className="btn btn-primary btn-lg btn-full" onClick={() => setCurrentStep(2)} disabled={!isFormValid}>
                Continue to Payment <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          )}

          {/* ── Step 2: Payment Method ───────────────────────── */}
          {currentStep === 2 && (
            <div className="checkout-section">
              <h3><i className="fas fa-credit-card" style={{ color: 'var(--primary)' }}></i> Payment Method</h3>
              <div className="payment-methods">
                {PAYMENT_METHODS.map(pm => (
                  <label
                    key={pm.id}
                    className={`payment-option ${selectedPayment === pm.id ? 'selected' : ''}`}
                    onClick={() => {
                      if (pm.id === 'bank_transfer') { setShowBankComingSoon(true); return; }
                      setSelectedPayment(pm.id);
                    }}
                  >
                    <input type="radio" name="payment" value={pm.id} checked={selectedPayment === pm.id} onChange={() => {}} />
                    <div style={{
                      background: pm.color, color: '#fff', fontSize: '.75rem',
                      padding: '4px 12px', borderRadius: '4px', fontWeight: '700', whiteSpace: 'nowrap',
                    }}>
                      {pm.label}
                    </div>
                    <span style={{ fontSize: '.88rem' }}>{pm.desc}</span>
                  </label>
                ))}
              </div>

              {selectedPayment === 'stripe' && !stripeEnabled && (
                <div style={{
                  marginTop: 'var(--space-3)', padding: 'var(--space-4)',
                  background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                  borderRadius: 'var(--radius)', border: '1px solid #c4b5fd',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: '6px' }}>
                    <i className="fas fa-credit-card" style={{ color: '#7c3aed' }}></i>
                  </div>
                  <div style={{ fontWeight: '700', color: '#7c3aed', fontSize: '.95rem', marginBottom: '4px' }}>
                    Stripe Payments — Coming Soon
                  </div>
                  <div style={{ fontSize: '.82rem', color: '#6d28d9', lineHeight: '1.5' }}>
                    We're setting up card payments via Stripe. In the meantime, please use Paystack, bank transfer, or pay on delivery.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                <button className="btn btn-outline" onClick={() => setCurrentStep(1)}>
                  <i className="fas fa-arrow-left"></i> Back
                </button>
                <button
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1 }}
                  onClick={() => setCurrentStep(3)}
                  disabled={selectedPayment === 'stripe' && !stripeEnabled}
                >
                  Review Order <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Review & Place ───────────────────────── */}
          {currentStep === 3 && (
            <div className="checkout-section">
              <h3><i className="fas fa-clipboard-check" style={{ color: 'var(--primary)' }}></i> Review Your Order</h3>

              {/* Address summary */}
              <div style={{
                background: 'var(--gray-6)', borderRadius: 'var(--radius)', padding: 'var(--space-4)',
                marginBottom: 'var(--space-4)', border: '1px solid var(--gray-4)',
              }}>
                <div style={{ fontWeight: '700', fontSize: '.88rem', marginBottom: '6px' }}>
                  <i className="fas fa-map-marker-alt" style={{ color: 'var(--primary)' }}></i> Delivery Address
                </div>
                <p style={{ fontSize: '.85rem', color: 'var(--gray-1)', lineHeight: '1.6', margin: 0 }}>
                  {formData.firstName} {formData.lastName}<br />
                  {formData.street}, {formData.city}{formData.state ? `, ${formData.state}` : ''}<br />
                  {formData.country}<br />
                  {formData.phone} · {formData.email}
                </p>
              </div>

              {/* Payment summary */}
              <div style={{
                background: 'var(--gray-6)', borderRadius: 'var(--radius)', padding: 'var(--space-3) var(--space-4)',
                marginBottom: 'var(--space-4)', border: '1px solid var(--gray-4)',
                display: 'flex', alignItems: 'center', gap: '10px', fontSize: '.85rem',
              }}>
                <i className="fas fa-credit-card" style={{ color: 'var(--primary)' }}></i>
                <span style={{ fontWeight: '600' }}>
                  {PAYMENT_METHODS.find(p => p.id === selectedPayment)?.label}
                </span>
                <span style={{ color: 'var(--gray-1)' }}>
                  — {PAYMENT_METHODS.find(p => p.id === selectedPayment)?.desc}
                </span>
              </div>

              {/* Items */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                {cart.map(item => {
                  const itemPricing = normalizePricing(item.product || {});
                  return (
                  <div key={item.product._id} className="order-summary-item">
                    <img
                      className="order-summary-img"
                      src={item.product.images?.[0] || item.product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'}
                      alt={item.product.name}
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'; }}
                    />
                    <div className="order-summary-details">
                      <div className="order-summary-name">{item.product.name}</div>
                      <div className="order-summary-qty">Qty: {item.quantity || 1}</div>
                      {(() => {
                        const opts = item.options || cartOptions[item.product._id];
                        if (!opts || !Object.keys(opts).length) return null;
                        return (
                          <div style={{ fontSize: '.75rem', color: 'var(--gray-1)', marginTop: '2px', textTransform: 'capitalize' }}>
                            {Object.entries(opts).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="order-summary-price">
                      {formatPrice(itemPricing.price * (item.quantity || 1), item.product.currency || 'NGN', false)}
                    </div>
                  </div>
                );})}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                <button className="btn btn-outline" onClick={() => setCurrentStep(2)}>
                  <i className="fas fa-arrow-left"></i> Back
                </button>
                <button
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1 }}
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                >
                  {submitting
                    ? <><i className="fas fa-spinner fa-spin"></i> Placing Order...</>
                    : <><i className="fas fa-lock"></i> Place Order — {formatPrice(totals.total, 'NGN', false)}</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Order Summary Sidebar ─────────────────────────── */}
        <div>
          <div className="cart-summary" style={{ position: 'sticky', top: '144px' }}>
            <h3><i className="fas fa-receipt" style={{ color: 'var(--primary)' }}></i> Order Summary</h3>
            <div style={{ fontSize: '.85rem', color: 'var(--gray-1)', marginBottom: 'var(--space-3)' }}>
              {cart.length} {cart.length === 1 ? 'item' : 'items'} in your order
            </div>
            <div className="summary-row">
              <span className="label">Subtotal</span>
              <span>{formatPrice(totals.subtotal, 'NGN', false)}</span>
            </div>
            <div className="summary-row">
              <span className="label">Delivery</span>
              <span style={totals.deliveryFee === 0 ? { color: 'var(--success)', fontWeight: '600' } : {}}>
                {totals.deliveryFee === 0 ? 'FREE' : formatPrice(totals.deliveryFee, 'NGN', false)}
              </span>
            </div>
            <div className="summary-row total">
              <span className="label">Total</span>
              <span>{formatPrice(totals.total, 'NGN', false)}</span>
            </div>

            {totals.deliveryFee === 0 && (
              <div style={{
                marginTop: 'var(--space-3)', padding: '8px var(--space-3)',
                background: 'var(--success-light)', borderRadius: 'var(--radius)',
                fontSize: '.78rem', color: 'var(--success)', fontWeight: '600',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <i className="fas fa-truck-fast"></i> Free delivery on orders above {formatPrice(50000, 'NGN', false)}
              </div>
            )}

            <div style={{
              marginTop: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)',
              background: 'var(--gray-6)', borderRadius: 'var(--radius)',
              display: 'flex', gap: '8px', alignItems: 'center',
              fontSize: '.82rem', color: 'var(--gray-1)',
            }}>
              <i className="fas fa-shield-halved" style={{ color: 'var(--success)' }}></i>
              <span>Payment secured with 256-bit SSL encryption</span>
            </div>

            <div style={{ marginTop: 'var(--space-4)' }}>
              <div style={{ fontSize: '.78rem', color: 'var(--gray-2)', marginBottom: '6px', fontWeight: '600' }}>
                Accepted Payments
              </div>
              <div className="payment-logos">
                {['Paystack', 'Stripe', 'Bank Transfer', 'Cash'].map(logo => (
                  <div key={logo} className="payment-logo" style={{
                    background: 'var(--gray-6)', border: '1px solid var(--gray-4)',
                    padding: '4px 8px', borderRadius: '4px', fontSize: '.7rem', fontWeight: '700', color: 'var(--gray-1)',
                  }}>{logo}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Transfer Coming Soon modal */}
      {showBankComingSoon && (
        <div className="modal-overlay open" onClick={() => setShowBankComingSoon(false)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <span className="modal__title">Bank Transfer</span>
              <button className="modal__close" onClick={() => setShowBankComingSoon(false)}>
                <i className="fas fa-xmark"></i>
              </button>
            </div>
            <div className="modal__body" style={{ textAlign: 'center', padding: 'var(--space-6) var(--space-4)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
                <i className="fas fa-building-columns" style={{ color: '#2563eb' }}></i>
              </div>
              <h3 style={{ fontWeight: '800', marginBottom: '8px' }}>Coming Soon</h3>
              <p style={{ color: 'var(--gray-1)', fontSize: '.9rem', lineHeight: '1.6' }}>
                Direct bank transfer payments are being set up and will be available shortly.
                Please use <strong>Paystack</strong> or <strong>Pay on Delivery</strong> for now.
              </p>
              <button
                className="btn btn-primary"
                style={{ marginTop: '20px', minWidth: '140px' }}
                onClick={() => setShowBankComingSoon(false)}
              >
                OK, Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

Checkout.getLayout = function getLayout(page) {
  return <AuthGuard>{page}</AuthGuard>;
};
