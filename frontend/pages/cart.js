import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useShop } from '@/components/ShopProvider';
import { useCurrency } from '@/contexts/CurrencyContext';

export default function Cart() {
  const { cart, removeFromCart, updateCartQty, clearCart, showToast } = useShop();
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const router = useRouter();
  const { formatPrice } = useCurrency();

  // Update item quantity
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    updateCartQty(itemId, newQuantity);
  };

  // Remove item from cart
  const removeItem = (itemId) => {
    removeFromCart(itemId);
    showToast('Item removed from cart', 'info');
  };

  // Clear entire cart
  const handleClearCart = () => {
    if (confirm('Are you sure you want to clear your entire cart?')) {
      clearCart();
      showToast('Cart cleared', 'info');
    }
  };

  // Apply promo code
  const applyPromo = () => {
    if (promoCode.trim()) {
      setPromoApplied(true);
      showToast(`Promo code "${promoCode}" applied!`, 'success');
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let totalItems = 0;
    
    cart.forEach(item => {
      subtotal += (item.product.price || 0) * item.quantity;
      totalItems += item.quantity;
    });
    
    const deliveryFee = subtotal > 50000 ? 0 : 1500;
    const total = subtotal + deliveryFee;
    
    return { subtotal, total, deliveryFee, totalItems };
  };

  const totals = calculateTotals();
  const isEmpty = cart.length === 0;

  return (
    <Layout 
      title="Shopping Cart — Hilgod Online Store"
      description="Review your cart and proceed to checkout. Secure payment methods accepted."
    >
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">Shopping Cart</span>
      </nav>
      
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: 'var(--space-6)' }}>
        <i className="fas fa-shopping-cart" style={{ color: 'var(--primary)' }}></i> Shopping Cart
        {!isEmpty && <span style={{ fontSize: '.9rem', color: 'var(--gray-1)', fontWeight: '400', marginLeft: '8px' }}>({totals.totalItems} {totals.totalItems === 1 ? 'item' : 'items'})</span>}
      </h1>

      {isEmpty ? (
        <div className="empty-state" id="cart-empty">
          <i className="fas fa-cart-shopping"></i>
          <h3>Your cart is empty</h3>
          <p>Looks like you haven't added anything to your cart yet. Start exploring!</p>
          <Link href="/products" className="btn btn-primary btn-lg">
            <i className="fas fa-shopping-bag"></i> Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="cart-layout" id="cart-content">
          {/* LEFT: Cart Items */}
          <div>
            <div className="cart-main">
              <div className="cart-header">
                <h2><i className="fas fa-box" style={{ color: 'var(--primary)' }}></i> Order Items ({totals.totalItems})</h2>
                <span 
                  className="cart-select-all" 
                  onClick={handleClearCart}
                  style={{ cursor: 'pointer' }}
                >
                  <i className="fas fa-trash-can"></i> Clear All
                </span>
              </div>
              
              {/* Table Header - Desktop */}
              <div className="cart-table-head">
                <span></span>
                <span>Product</span>
                <span>Price</span>
                <span>Quantity</span>
                <span>Subtotal</span>
                <span></span>
              </div>
              
              {/* Cart Items */}
              <div id="cart-table-body">
                {cart.map(item => (
                  <div key={item.product._id} className="cart-table-row">
                    {/* Checkbox */}
                    <input type="checkbox" className="cart-item-check" />
                    
                    {/* Product Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img 
                        src={item.product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'} 
                        alt={item.product.name}
                        className="cart-item-img"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'; }}
                      />
                      <div>
                        <Link href={`/products/${item.product._id}`} className="cart-item-name">
                          {item.product.name}
                        </Link>
                        <div className="cart-item-brand">{item.product.brand || item.product.category}</div>
                        <div className="cart-save-later" onClick={() => {
                          showToast('Saved for later!', 'info');
                        }}>
                          <i className="far fa-bookmark"></i> Save for later
                        </div>
                      </div>
                    </div>
                    
                    {/* Price */}
                    <div className="cart-item-price">
                      {formatPrice(item.product.price || 0)}
                    </div>
                    
                    {/* Quantity Control */}
                    <div className="cart-qty-control">
                      <div 
                        className="cart-qty-btn" 
                        onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                        style={item.quantity <= 1 ? { opacity: 0.4, pointerEvents: 'none' } : {}}
                      >
                        −
                      </div>
                      <div className="cart-qty-num">{item.quantity}</div>
                      <div 
                        className="cart-qty-btn" 
                        onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                      >
                        +
                      </div>
                    </div>
                    
                    {/* Subtotal */}
                    <div className="cart-item-sub">
                      {formatPrice((item.product.price * item.quantity) || 0)}
                    </div>
                    
                    {/* Remove */}
                    <div 
                      className="cart-remove" 
                      onClick={() => removeItem(item.product._id)}
                      title="Remove item"
                    >
                      <i className="fas fa-trash-can"></i>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' 
            }}>
              <Link href="/products" className="btn btn-outline">
                <i className="fas fa-arrow-left"></i> Continue Shopping
              </Link>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Link href="/wishlist" className="btn btn-outline">
                  <i className="far fa-heart"></i> My Wishlist
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT: Summary Sidebar */}
          <div>
            <div className="cart-summary">
              <h3><i className="fas fa-receipt" style={{ color: 'var(--primary)' }}></i> Order Summary</h3>
              
              {totals.subtotal > 50000 && (
                <div 
                  style={{ 
                    background: 'var(--success-light)', color: 'var(--success)', 
                    padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '.82rem', 
                    fontWeight: '600', marginBottom: 'var(--space-3)', display: 'flex', 
                    alignItems: 'center', gap: '8px' 
                  }}
                >
                  <i className="fas fa-truck-fast"></i> You qualify for FREE delivery!
                </div>
              )}
              
              <div className="summary-row">
                <span className="label">Subtotal ({totals.totalItems} items)</span>
                <span>{formatPrice(totals.subtotal)}</span>
              </div>
              
              <div className="summary-row">
                <span className="label">Delivery Fee</span>
                <span style={totals.deliveryFee === 0 ? { color: 'var(--success)', fontWeight: '600' } : {}}>
                  {totals.deliveryFee === 0 ? 'FREE' : formatPrice(totals.deliveryFee)}
                </span>
              </div>

              {totals.deliveryFee > 0 && (
                <div style={{ 
                  fontSize: '.78rem', color: 'var(--gray-2)', marginBottom: '10px', fontStyle: 'italic' 
                }}>
                  Add {formatPrice(50000 - totals.subtotal)} more for free delivery
                </div>
              )}
              
              <div className="summary-row total">
                <span className="label">Total</span>
                <span>{formatPrice(totals.total)}</span>
              </div>

              {/* Promo Code */}
              <div className="promo-wrap">
                <div style={{ fontSize: '.85rem', fontWeight: '700', marginBottom: '8px' }}>
                  <i className="fas fa-ticket" style={{ color: 'var(--primary)' }}></i> Promo Code
                </div>
                <div style={{ fontSize: '.75rem', color: 'var(--gray-2)', marginBottom: '8px' }}>
                  Try: HILGOD10, WELCOME20, FLASH30
                </div>
                <div className="promo-input-wrap">
                  <input 
                    type="text" 
                    className="promo-input" 
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
                  />
                  <button className="promo-btn" onClick={applyPromo}>
                    Apply
                  </button>
                </div>
                {promoApplied && (
                  <div style={{ fontSize: '.8rem', color: 'var(--success)', marginTop: '6px', fontWeight: '600' }}>
                    <i className="fas fa-check-circle"></i> Promo code applied successfully!
                  </div>
                )}
              </div>

              <Link 
                href="/checkout" 
                className="btn btn-primary btn-full btn-lg cart-checkout-btn"
              >
                <i className="fas fa-lock"></i> Secure Checkout
              </Link>
              
              <div className="secure-badge">
                <i className="fas fa-shield-halved"></i> 256-bit SSL encryption
              </div>

              {/* Payment Icons */}
              <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                <div style={{ fontSize: '.75rem', color: 'var(--gray-2)', marginBottom: '8px', fontWeight: '600' }}>
                  Accepted Payments
                </div>
                <div className="payment-logos" style={{ justifyContent: 'center' }}>
                  {['Stripe', 'MC', 'VISA', 'Paystack', 'OPay'].map(logo => (
                    <div key={logo} style={{ 
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
      )}
    </Layout>
  );
}