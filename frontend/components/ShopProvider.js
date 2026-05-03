import React, { createContext, useContext, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const ShopContext = createContext();

export function useShop() {
  return useContext(ShopContext);
}

export default function ShopProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const router = useRouter();

  // Initialize from localStorage
  useEffect(() => {
    try {
      // Get user-specific cart key if logged in
      let cartKey = 'hilgod_cart';
      const sessionData = document.querySelector('meta[name="user-id"]');
      if (sessionData) {
        cartKey = `hilgod_cart_${sessionData.getAttribute('content')}`;
      }
      
      const savedCart = localStorage.getItem(cartKey);
      const savedWishlist = localStorage.getItem('hilgod_wishlist');
      if (savedCart) setCart(JSON.parse(savedCart));
      if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
    } catch (err) {
      console.error('Failed to load local storage data', err);
    }
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    // Get user-specific cart key if logged in
    let cartKey = 'hilgod_cart';
    const sessionData = document.querySelector('meta[name="user-id"]');
    if (sessionData) {
      cartKey = `hilgod_cart_${sessionData.getAttribute('content')}`;
    }
    localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('hilgod_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const showToast = (message, type = 'info', duration = 3500) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product._id === product._id);
      if (existing) {
        return prev.map(item => 
          item.product._id === product._id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    showToast('Added to cart! 🛒', 'success');
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product._id !== productId));
  };

  const updateCartQty = (productId, quantity) => {
    setCart(prev => prev.map(item => 
      item.product._id === productId 
        ? { ...item, quantity: Math.max(1, quantity) }
        : item
    ));
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = (product) => {
    setWishlist(prev => {
      const exists = prev.find(p => p._id === (product._id || product));
      if (exists) {
        showToast('Removed from wishlist', 'info');
        return prev.filter(p => p._id !== (product._id || product));
      }
      showToast('Added to wishlist ❤️', 'success');
      // If product is just an ID, we can't save it fully, but handleAddToWishlist passes full product now.
      return [...prev, product];
    });
  };

  const isInWishlist = (productId) => {
    return wishlist.some(p => p._id === productId);
  };

  const openQuickView = (product) => {
    setQuickViewProduct(product);
    document.body.style.overflow = 'hidden';
  };

  const closeQuickView = () => {
    setQuickViewProduct(null);
    document.body.style.overflow = '';
  };

  const discount = quickViewProduct?.originalPrice && quickViewProduct?.price < quickViewProduct?.originalPrice 
    ? Math.round(((quickViewProduct.originalPrice - quickViewProduct.price) / quickViewProduct.originalPrice) * 100) 
    : 0;

  return (
    <ShopContext.Provider value={{
      cart, addToCart, removeFromCart, updateCartQty, clearCart,
      wishlist, toggleWishlist, isInWishlist,
      showToast, openQuickView
    }}>
      {children}
      
      {/* Toast Container */}
      <div id="toast-container" style={{ position: 'fixed', bottom: '20px', left: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(toast => {
          const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
          return (
            <div key={toast.id} className={`toast ${toast.type}`} style={{ animation: `fadein 0.3s, fadeout 0.3s ${toast.duration / 1000 - 0.3}s forwards` }}>
              <i className={`fas ${icons[toast.type] || icons.info} toast__icon`}></i>
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target.className.includes('modal-overlay')) closeQuickView(); }}>
          <div className="modal" style={{ maxWidth: '750px' }}>
            <div className="modal__header">
              <span className="modal__title">Quick View</span>
              <button className="modal__close" onClick={closeQuickView}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="modal__body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: 'var(--gray-6)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '280px', padding: '20px' }}>
                  <img 
                    src={quickViewProduct.images && quickViewProduct.images[0] ? quickViewProduct.images[0] : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'} 
                    alt={quickViewProduct.name} 
                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} 
                  />
                </div>
                <div>
                  <div style={{ fontSize: '.75rem', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {quickViewProduct.brand || quickViewProduct.category}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px', lineHeight: '1.3' }}>
                    {quickViewProduct.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ color: '#fbbf24', fontSize: '0.9rem' }}>
                      {[...Array(5)].map((_, i) => (
                        <i 
                          key={i} 
                          className={`fas ${i < Math.floor(quickViewProduct.ratings?.average || 0) ? 'fa-star' : i < (quickViewProduct.ratings?.average || 0) ? 'fa-star-half-alt' : 'far fa-star'}`}
                        ></i>
                      ))}
                    </div>
                    <span style={{ fontSize: '.8rem', color: 'var(--gray-1)' }}>
                      ({(quickViewProduct.ratings?.count || 0).toLocaleString()} reviews)
                    </span>
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)' }}>
                      ₦{quickViewProduct.price?.toLocaleString()}
                    </span>
                    {discount > 0 && (
                      <>
                        <span style={{ fontSize: '.9rem', color: 'var(--gray-2)', textDecoration: 'line-through', marginLeft: '8px' }}>
                          ₦{quickViewProduct.originalPrice?.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '.85rem', color: 'var(--success)', fontWeight: '700', marginLeft: '4px' }}>
                          -{discount}%
                        </span>
                      </>
                    )}
                  </div>
                  <p style={{ fontSize: '.88rem', color: 'var(--gray-1)', lineHeight: '1.6', marginBottom: '16px' }}>
                    {quickViewProduct.description?.substring(0, 150)}{quickViewProduct.description?.length > 150 ? '...' : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      className="btn btn-primary btn-full" 
                      onClick={() => { addToCart(quickViewProduct, 1); closeQuickView(); }}
                      disabled={quickViewProduct.stock === 0}
                    >
                      <i className="fas fa-cart-plus"></i> {quickViewProduct.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                    <Link href={`/products/${quickViewProduct._id}`} className="btn btn-outline" style={{ whiteSpace: 'nowrap' }} onClick={closeQuickView}>
                      <i className="fas fa-eye"></i> View
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ShopContext.Provider>
  );
}
