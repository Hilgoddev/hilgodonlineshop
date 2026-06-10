import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from '../contexts/AuthContext';
import { apiFetch } from '../lib/apiClient';
import { useCurrency } from '../contexts/CurrencyContext';
import { normalizePricing } from '../lib/pricing';
import { colorName } from '../lib/colorName';

import styles from '../css/fix.module.css';

const ShopContext = createContext();

export function useShop() {
  return useContext(ShopContext);
}

const GUEST_CART_KEY = 'hilgod_cart';
const GUEST_WISHLIST_KEY = 'hilgod_wishlist';
const CART_OPTIONS_KEY = 'hilgod_cart_options';

export default function ShopProvider({ children }) {
  const { formatPrice } = useCurrency();
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  // Selected variant options (size/color/...) per product id. Kept client-side
  // (the server cart only stores product + quantity) and persisted so they
  // survive reloads; sent with each item at checkout and stored on the order.
  const [cartOptions, setCartOptions] = useState({});
  const [toasts, setToasts] = useState([]);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [qvSelection, setQvSelection] = useState({ size: '', color: '' });
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && !!session?.user?.id;

  const showToast = (message, type = 'info', duration = 3500) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  };

  // Load persisted cart options once on mount, and persist on every change.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_OPTIONS_KEY);
      if (saved) setCartOptions(JSON.parse(saved) || {});
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(CART_OPTIONS_KEY, JSON.stringify(cartOptions)); } catch { /* ignore */ }
  }, [cartOptions]);

  const loadGuestData = useCallback(() => {
    try {
      const savedCart = localStorage.getItem(GUEST_CART_KEY);
      const savedWishlist = localStorage.getItem(GUEST_WISHLIST_KEY);
      setCart(savedCart ? JSON.parse(savedCart) : []);
      setWishlist(savedWishlist ? JSON.parse(savedWishlist) : []);
    } catch (err) {
      console.error('Failed to load guest local storage data', err);
      setCart([]);
      setWishlist([]);
    }
  }, []);

  const loadServerData = useCallback(async () => {
    const safeJson = async (res) => {
      if (!res.ok) return null;
      const text = await res.text();
      if (!text || text.trimStart().startsWith('<')) return null;
      try { return JSON.parse(text); } catch { return null; }
    };
    try {
      const [cartRes, wishRes] = await Promise.all([apiFetch('/api/cart'), apiFetch('/api/wishlist')]);
      const [cartData, wishData] = await Promise.all([safeJson(cartRes), safeJson(wishRes)]);
      if (cartData?.success) setCart(cartData.data || []);
      if (wishData?.success) setWishlist(wishData.data || []);
    } catch (err) {
      console.error('Failed to load server cart/wishlist', err);
    }
  }, []);

  const mergeGuestDataToServer = useCallback(async () => {
    try {
      const guestCart = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]');
      const guestWishlist = JSON.parse(localStorage.getItem(GUEST_WISHLIST_KEY) || '[]');

      for (const item of guestCart) {
        if (item?.product?._id) {
          await apiFetch('/api/cart', {
            method: 'POST',
            body: JSON.stringify({ productId: item.product._id, quantity: item.quantity || 1 }),
          });
        }
      }

      for (const product of guestWishlist) {
        if (product?._id) {
          await apiFetch('/api/wishlist', {
            method: 'POST',
            body: JSON.stringify({ productId: product._id }),
          });
        }
      }

      localStorage.removeItem(GUEST_CART_KEY);
      localStorage.removeItem(GUEST_WISHLIST_KEY);
    } catch (err) {
      console.error('Failed to merge guest data into server', err);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (isAuthenticated) {
      mergeGuestDataToServer().then(loadServerData);
    } else {
      loadGuestData();
    }
  }, [status, isAuthenticated, loadGuestData, loadServerData, mergeGuestDataToServer]);

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
    }
  }, [cart, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(wishlist));
    }
  }, [wishlist, isAuthenticated]);

  const addToCart = async (product, quantity = 1, options = null) => {
    // Remember the selected variant (size/color/...) for this product.
    const cleanOpts = options && typeof options === 'object'
      ? Object.fromEntries(Object.entries(options).filter(([, v]) => v != null && String(v).trim()))
      : null;
    if (cleanOpts && Object.keys(cleanOpts).length) {
      setCartOptions((prev) => ({ ...prev, [product._id]: cleanOpts }));
    }
    if (isAuthenticated) {
      try {
        await apiFetch('/api/cart', {
          method: 'POST',
          body: JSON.stringify({ productId: product._id, quantity }),
        });
        await loadServerData();
      } catch (err) {
        console.error('Failed to add to cart', err);
      }
    } else {
      setCart((prev) => {
        const existing = prev.find((item) => item.product._id === product._id);
        if (existing) {
          return prev.map((item) =>
            item.product._id === product._id ? { ...item, quantity: item.quantity + quantity } : item
          );
        }
        return [...prev, { product, quantity }];
      });
    }
    showToast('Added to cart!', 'success');
  };

  const removeFromCart = async (productId) => {
    setCartOptions((prev) => { const next = { ...prev }; delete next[productId]; return next; });
    if (isAuthenticated) {
      await apiFetch(`/api/cart?productId=${productId}`, { method: 'DELETE' });
      await loadServerData();
      return;
    }
    setCart((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const updateCartQty = async (productId, quantity) => {
    const safeQty = Math.max(1, quantity);
    if (isAuthenticated) {
      await apiFetch('/api/cart', {
        method: 'PUT',
        body: JSON.stringify({ productId, quantity: safeQty }),
      });
      await loadServerData();
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product._id === productId ? { ...item, quantity: safeQty } : item))
    );
  };

  const clearCart = async () => {
    setCartOptions({});
    if (isAuthenticated) {
      await apiFetch('/api/cart/clear', { method: 'DELETE' });
      setCart([]);
      return;
    }
    setCart([]);
  };

  const toggleWishlist = async (product) => {
    const productId = product?._id || product;
    if (!productId) return;

    const exists = wishlist.some((p) => p._id === productId);

    if (isAuthenticated) {
      if (exists) {
        await apiFetch(`/api/wishlist?productId=${productId}`, { method: 'DELETE' });
        showToast('Removed from wishlist', 'info');
      } else {
        await apiFetch('/api/wishlist', {
          method: 'POST',
          body: JSON.stringify({ productId }),
        });
        showToast('Added to wishlist', 'success');
      }
      await loadServerData();
      return;
    }

    setWishlist((prev) => {
      const present = prev.find((p) => p._id === productId);
      if (present) {
        showToast('Removed from wishlist', 'info');
        return prev.filter((p) => p._id !== productId);
      }
      showToast('Added to wishlist', 'success');
      return [...prev, product];
    });
  };

  const isInWishlist = (productId) => wishlist.some((p) => p._id === productId);

  const openQuickView = (product) => {
    setQuickViewProduct(product);
    // Default the variant selection to the first available option, if any.
    setQvSelection({
      size: product?.size_options?.[0] || '',
      color: product?.color_options?.[0] || '',
    });
    document.body.style.overflow = 'hidden';
  };

  const closeQuickView = () => {
    setQuickViewProduct(null);
    document.body.style.overflow = '';
  };

  // Build the {size,color} options object for the quick-view product (only keys it offers).
  const quickViewOptions = () => {
    const o = {};
    if (quickViewProduct?.size_options?.length && qvSelection.size) o.size = qvSelection.size;
    if (quickViewProduct?.color_options?.length && qvSelection.color) o.color = qvSelection.color;
    return Object.keys(o).length ? o : null;
  };

  // Carry the quick-view variant selection to the product page so it isn't reset
  // (a buyer who doesn't recheck won't end up with the wrong variant).
  const quickViewQuery = () => {
    const p = new URLSearchParams();
    if (quickViewProduct?.size_options?.length && qvSelection.size) p.set('size', qvSelection.size);
    if (quickViewProduct?.color_options?.length && qvSelection.color) p.set('color', qvSelection.color);
    const s = p.toString();
    return s ? `?${s}` : '';
  };

  const quickViewPricing = normalizePricing(quickViewProduct || {});
  const discount = quickViewPricing.discountPercent;

  return (
    <ShopContext.Provider
      value={{
        cart,
        cartOptions,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        wishlist,
        toggleWishlist,
        isInWishlist,
        showToast,
        openQuickView,
      }}
    >
      {children}

      <div
        id="toast-container"
        style={{ position: 'fixed', bottom: '20px', left: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        {toasts.map((toast) => {
          const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
          return (
            <div key={toast.id} className={`toast ${toast.type}`} style={{ animation: `fadein 0.3s, fadeout 0.3s ${toast.duration / 1000 - 0.3}s forwards` }}>
              <i className={`fas ${icons[toast.type] || icons.info} toast__icon`}></i>
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>

      {quickViewProduct && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target.className.includes('modal-overlay')) closeQuickView(); }}>
          <div className="modal" style={{ maxWidth: '750px' }}>
            <div className="modal__header">
              <span className="modal__title">Quick View</span>
              <button className="modal__close" onClick={closeQuickView}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="modal__body">
              <div className={styles.modal__inner}>

                <div style={{ background: 'var(--gray-6)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '280px', padding: '20px' }}>
                  <img
                    src={quickViewProduct.images?.[0] || quickViewProduct.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'}
                    alt={quickViewProduct.name}
                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'; }}
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
                        <i key={i} className={`fas ${i < Math.floor(quickViewProduct.rating || 0) ? 'fa-star' : i < (quickViewProduct.rating || 0) ? 'fa-star-half-alt' : 'far fa-star'}`}></i>
                      ))}
                    </div>
                    <span style={{ fontSize: '.8rem', color: 'var(--gray-1)' }}>
                      ({(quickViewProduct.review_count || 0).toLocaleString()} review{quickViewProduct.review_count === 1 ? '' : 's'})
                    </span>
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)' }}>
                      {formatPrice(quickViewPricing.price || 0, quickViewProduct.currency || 'NGN', false)}
                    </span>
                    {discount > 0 && (
                      <>
                        <span style={{ fontSize: '.9rem', color: 'var(--gray-2)', textDecoration: 'line-through', marginLeft: '8px' }}>
                          {formatPrice(quickViewPricing.originalPrice || 0, quickViewProduct.currency || 'NGN', false)}
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

                  {quickViewProduct.size_options?.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '6px' }}>Size: <strong>{qvSelection.size || 'Select'}</strong></div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {quickViewProduct.size_options.map((size) => (
                          <button key={size} type="button" onClick={() => setQvSelection((s) => ({ ...s, size }))}
                            style={{ padding: '5px 12px', borderRadius: '6px', border: qvSelection.size === size ? '2px solid var(--primary)' : '1px solid var(--gray-3)', background: qvSelection.size === size ? 'var(--primary-light)' : '#fff', cursor: 'pointer', fontSize: '.82rem', fontWeight: 600 }}>
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {quickViewProduct.color_options?.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '6px' }}>Color: <strong>{qvSelection.color ? colorName(qvSelection.color) : 'Select'}</strong></div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {quickViewProduct.color_options.map((color) => (
                          <button key={color} type="button" onClick={() => setQvSelection((s) => ({ ...s, color }))}
                            title={colorName(color)} aria-label={colorName(color)}
                            style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, cursor: 'pointer', border: qvSelection.color === color ? '2px solid var(--dark)' : '2px solid var(--gray-3)' }} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-primary btn-full" onClick={() => { addToCart(quickViewProduct, 1, quickViewOptions()); closeQuickView(); }} disabled={quickViewProduct.stock === 0}>
                      <i className="fas fa-cart-plus"></i> {quickViewProduct.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                    <Link href={`/products/${quickViewProduct._id}${quickViewQuery()}`} className="btn btn-outline" style={{ whiteSpace: 'nowrap' }} onClick={closeQuickView}>
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
