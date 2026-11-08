import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSession } from '../contexts/AuthContext';
import { apiFetch } from '../lib/apiClient';
import { useCurrency } from '../contexts/CurrencyContext';
import { normalizePricing } from '../lib/pricing';
import { cleanOptions, variantKey, needsColor, needsSize, colorImage } from '../lib/variants';
import ColorSwatches from './ColorSwatches';

import styles from '../css/fix.module.css';

const ShopContext = createContext();

export function useShop() {
  return useContext(ShopContext);
}

const GUEST_CART_KEY = 'hilgod_cart';
const GUEST_WISHLIST_KEY = 'hilgod_wishlist';
// Older builds kept the chosen size/colour per product id under this key; it is
// folded into the guest cart lines once and then removed.
const LEGACY_CART_OPTIONS_KEY = 'hilgod_cart_options';

// Cart lines are { product, quantity, options, variantKey }: the same product
// can appear once per colour/size, and a line is identified by product id +
// variantKey (see lib/variants.js; the server computes the same key).
const sameLine = (item, productId, key = '') => item.product._id === productId && (item.variantKey || '') === key;

export default function ShopProvider({ children }) {
  const { formatPrice } = useCurrency();
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [qvSelection, setQvSelection] = useState({ size: '', color: '' });
  const [qvColorError, setQvColorError] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && !!session?.user?.id;

  const showToast = (message, type = 'info', duration = 3500) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  };

  // Guest cart/wishlist are written back to localStorage only after they have
  // been read from it — otherwise the empty initial state (while auth is still
  // loading) overwrote the saved cart on every page load.
  const guestLoaded = useRef(false);

  const loadGuestData = useCallback(() => {
    guestLoaded.current = true;
    try {
      const savedCart = localStorage.getItem(GUEST_CART_KEY);
      const savedWishlist = localStorage.getItem(GUEST_WISHLIST_KEY);
      let legacyOptions = {};
      try { legacyOptions = JSON.parse(localStorage.getItem(LEGACY_CART_OPTIONS_KEY) || '{}') || {}; } catch { /* ignore */ }
      const lines = (savedCart ? JSON.parse(savedCart) : []).map((item) => {
        const options = cleanOptions(item.options || legacyOptions[item.product?._id]);
        return { ...item, options, variantKey: variantKey(options) };
      });
      try { localStorage.removeItem(LEGACY_CART_OPTIONS_KEY); } catch { /* ignore */ }
      setCart(lines);
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
            body: JSON.stringify({ productId: item.product._id, quantity: item.quantity || 1, selectedOptions: item.options || undefined }),
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
      guestLoaded.current = false;
      mergeGuestDataToServer().then(loadServerData);
    } else {
      loadGuestData();
    }
  }, [status, isAuthenticated, loadGuestData, loadServerData, mergeGuestDataToServer]);

  useEffect(() => {
    if (!isAuthenticated && guestLoaded.current) {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
    }
  }, [cart, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated && guestLoaded.current) {
      localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(wishlist));
    }
  }, [wishlist, isAuthenticated]);

  // Adds one line per product + chosen variant. A product with colours must have
  // one chosen: without it nothing is added, the buyer is told, and false is
  // returned so the caller can point at the colour picker.
  const addToCart = async (product, quantity = 1, options = null) => {
    const opts = cleanOptions(options);
    if (needsSize(product, opts)) {
      showToast('Please choose an available size first.', 'warning');
      return false;
    }
    if (needsColor(product, opts)) {
      showToast('Please choose a colour first.', 'warning');
      return false;
    }
    const key = variantKey(opts);
    if (isAuthenticated) {
      try {
        const res = await apiFetch('/api/cart', {
          method: 'POST',
          body: JSON.stringify({ productId: product._id, quantity, selectedOptions: opts || undefined }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          showToast(json.error || 'Could not add to cart. Please try again.', 'error');
          return false;
        }
        await loadServerData();
      } catch (err) {
        console.error('Failed to add to cart', err);
        showToast('Could not add to cart. Please try again.', 'error');
        return false;
      }
    } else {
      setCart((prev) => {
        if (prev.some((item) => sameLine(item, product._id, key))) {
          return prev.map((item) =>
            sameLine(item, product._id, key) ? { ...item, quantity: item.quantity + quantity } : item
          );
        }
        return [...prev, { product, quantity, options: opts, variantKey: key }];
      });
    }
    showToast('Added to cart!', 'success');
    return true;
  };

  const removeFromCart = async (productId, key = '') => {
    if (isAuthenticated) {
      await apiFetch(`/api/cart?productId=${encodeURIComponent(productId)}&variantKey=${encodeURIComponent(key)}`, { method: 'DELETE' });
      await loadServerData();
      return;
    }
    setCart((prev) => prev.filter((item) => !sameLine(item, productId, key)));
  };

  const updateCartQty = async (productId, quantity, key = '') => {
    const safeQty = Math.max(1, quantity);
    if (isAuthenticated) {
      await apiFetch('/api/cart', {
        method: 'PUT',
        body: JSON.stringify({ productId, variantKey: key, quantity: safeQty }),
      });
      await loadServerData();
      return;
    }
    setCart((prev) =>
      prev.map((item) => (sameLine(item, productId, key) ? { ...item, quantity: safeQty } : item))
    );
  };

  // Change a line's chosen options (e.g. pick the colour for an older line that
  // has none). Lands on an existing line for that variant if there is one.
  const updateCartOptions = async (productId, key, options) => {
    const opts = cleanOptions(options);
    const newKey = variantKey(opts);
    if (isAuthenticated) {
      const res = await apiFetch('/api/cart', {
        method: 'PUT',
        body: JSON.stringify({ productId, variantKey: key, selectedOptions: opts }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showToast(json.error || 'Could not update this item.', 'error');
      }
      await loadServerData();
      return;
    }
    setCart((prev) => {
      const line = prev.find((item) => sameLine(item, productId, key));
      if (!line || newKey === key) {
        return prev.map((item) => (sameLine(item, productId, key) ? { ...item, options: opts } : item));
      }
      const target = prev.find((item) => sameLine(item, productId, newKey));
      return prev
        .filter((item) => !sameLine(item, productId, key))
        .map((item) => (item === target ? { ...item, quantity: item.quantity + line.quantity } : item))
        .concat(target ? [] : [{ ...line, options: opts, variantKey: newKey }]);
    });
  };

  const clearCart = async () => {
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
    // Size requires an explicit choice; colour is never pre-selected — the
    // buyer has to pick one (a single-colour product is picked for them).
    setQvSelection({
      size: '',
      color: product?.color_options?.length === 1 ? product.color_options[0] : '',
    });
    setQvColorError(false);
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
        addToCart,
        removeFromCart,
        updateCartQty,
        updateCartOptions,
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
                    src={colorImage(quickViewProduct, qvSelection.color) || quickViewProduct.images?.[0] || quickViewProduct.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'}
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
                          <button key={size} type="button" aria-pressed={qvSelection.size === size} onClick={() => setQvSelection((s) => ({ ...s, size }))}
                            style={{ minHeight: '44px', minWidth: '44px', padding: '8px 12px', borderRadius: '6px', border: qvSelection.size === size ? '2px solid var(--primary)' : '1px solid var(--gray-3)', background: qvSelection.size === size ? 'var(--primary-light)' : '#fff', cursor: 'pointer', fontSize: '.82rem', fontWeight: 600 }}>
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {quickViewProduct.color_options?.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <ColorSwatches
                        colors={quickViewProduct.color_options}
                        value={qvSelection.color}
                        onChange={(color) => { setQvSelection((s) => ({ ...s, color })); setQvColorError(false); }}
                        error={qvColorError}
                        size={28}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="btn btn-primary btn-full"
                      onClick={async () => {
                        if (needsColor(quickViewProduct, qvSelection)) { setQvColorError(true); return; }
                        if (await addToCart(quickViewProduct, 1, quickViewOptions())) closeQuickView();
                      }}
                      disabled={quickViewProduct.stock === 0}
                    >
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
