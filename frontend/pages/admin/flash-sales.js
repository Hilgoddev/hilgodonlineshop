import { useState, useEffect, useRef } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminJson, errorMessage } from '../../lib/adminApi';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { apiFetch } from '../../lib/apiClient';
import { supabase as supabaseClient } from '../../lib/supabaseClient';
import { normalizePricing } from '../../lib/pricing';
import { categoriesData } from '@/pages/categories';
import styles from '@/css/fix.module.css';
import { useCurrency } from '@/contexts/CurrencyContext';

const EMPTY_NEW = {
  name: '', description: '', price: '', currency: 'NGN',
  category: 'electronics', brand: '', stock: '', imageUrl: '',
};

// ── Product Picker Modal ──────────────────────────────────────────────────────
function ProductPickerModal({ products, onSelect, onClose, formatPrice }) {
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '780px',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 0', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', margin: 0 }}>
              Select a Product
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '2px 0 0' }}>
              {filtered.length} product{filtered.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '36px', height: '36px', borderRadius: '50%', border: 'none',
              background: '#f1f5f9', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#64748b',
              fontSize: '1rem',
            }}
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '14px 24px', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              color: '#94a3b8', fontSize: '0.85rem', pointerEvents: 'none',
            }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by name, category or brand…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 36px',
                borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.88rem',
                outline: 'none', background: '#f8fafc',
              }}
            />
          </div>
        </div>

        {/* Product Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <i className="fas fa-box-open" style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }} />
              No products match your search.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px',
            }}>
              {filtered.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelect(p)}
                  style={{
                    background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px',
                    cursor: 'pointer', textAlign: 'left', padding: '0', overflow: 'hidden',
                    transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  {/* Product Image */}
                  <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden', background: '#f8fafc' }}>
                    <img
                      src={p.images?.[0] || p.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80'}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80'; }}
                    />
                  </div>
                  {/* Product Info */}
                  <div style={{ padding: '10px 12px 12px' }}>
                    <div style={{
                      fontSize: '0.82rem', fontWeight: 700, color: '#0f172a',
                      marginBottom: '4px', lineHeight: 1.3,
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: '6px', textTransform: 'capitalize' }}>
                      {p.category}{p.brand ? ` · ${p.brand}` : ''}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                      {formatPrice(p.price || 0, p.currency || 'NGN', false)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: p.stock > 0 ? '#16a34a' : '#dc2626', marginTop: '2px', fontWeight: 600 }}>
                      {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminFlashSales() {
  const { formatPrice } = useCurrency();
  const [sales, setSales] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form mode: 'existing' | 'new'
  const [mode, setMode] = useState('existing');

  // Existing product selection
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // New product form
  const [newForm, setNewForm] = useState(EMPTY_NEW);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const fileRef = useRef(null);

  // Flash sale fields (shared by both modes)
  const [flashPrice, setFlashPrice] = useState('');
  const [timerHours, setTimerHours] = useState('24');
  const [campaignType, setCampaignType] = useState('flash');

  const subcategoryOptions = categoriesData.find(c => c.id === newForm.category)?.subs || [];

  const fetchSales = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    const { res, json } = await adminJson('/api/campaigns/all');
    if (res.ok && json.success) setSales(json.data || []);
    else setMessage({ type: 'error', text: errorMessage(json, 'Could not load flash sales') });
    if (!silent) setLoading(false);
  };

  const fetchProducts = async () => {
    const { res, json } = await adminJson('/api/products/all');
    if (res.ok && json.success) setAllProducts(json.data || []);
  };

  useEffect(() => { fetchSales(); fetchProducts(); }, []);
  useAutoRefresh(() => fetchSales({ silent: true }), { table: 'flash_sales' });

  // Image upload for new product
  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setImageUploading(true);
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData?.session?.access_token;
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/upload/product-image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        setNewForm(f => ({ ...f, imageUrl: json.url }));
        setImagePreview(json.url);
      } else {
        setMessage({ type: 'error', text: json.error || 'Image upload failed' });
        setImagePreview('');
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error during image upload' });
      setImagePreview('');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      let productId = null;

      if (mode === 'existing') {
        if (!selectedProduct) {
          setMessage({ type: 'error', text: 'Please select a product first.' });
          setSubmitting(false);
          return;
        }
        productId = selectedProduct.id;
      } else {
        // Create new product first
        if (!newForm.imageUrl) {
          setMessage({ type: 'error', text: 'Please upload or enter an image URL for the product.' });
          setSubmitting(false);
          return;
        }
        const prodRes = await apiFetch('/api/products', {
          method: 'POST',
          body: JSON.stringify({
            name: newForm.name,
            description: newForm.description,
            price: Number(newForm.price),
            currency: newForm.currency,
            category: newForm.category,
            brand: newForm.brand || undefined,
            stock: Number(newForm.stock),
            images: [newForm.imageUrl],
          }),
        });
        const prodJson = await prodRes.json();
        if (!prodRes.ok || !prodJson.success) {
          setMessage({ type: 'error', text: errorMessage(prodJson, 'Failed to create product') });
          setSubmitting(false);
          return;
        }
        productId = prodJson.data?.id || prodJson.data?._id;
      }

      // Create campaign (flash / black_friday / easter)
      const fsRes = await apiFetch('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          sale_price: parseFloat(flashPrice),
          timer_hours: parseInt(timerHours),
          type: campaignType,
        }),
      });
      const fsJson = await fsRes.json();
      if (fsRes.ok && fsJson.success) {
        setMessage({ type: 'success', text: 'Campaign added!' });
        setSelectedProduct(null);
        setNewForm(EMPTY_NEW);
        setImagePreview('');
        setFlashPrice('');
        setTimerHours('24');
        setCampaignType('flash');
        if (fileRef.current) fileRef.current.value = '';
        fetchSales();
        if (mode === 'new') fetchProducts();
      } else {
        setMessage({ type: 'error', text: errorMessage(fsJson, 'Failed to add flash sale') });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const res = await apiFetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    const text = await res.text();
    let json = {};
    try { json = text ? JSON.parse(text) : {}; } catch { }
    if (res.ok) { setMessage({ type: 'success', text: 'Flash sale removed.' }); fetchSales(); }
    else setMessage({ type: 'error', text: errorMessage(json, 'Delete failed') });
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString() : '—';
  const isExpired = (d) => d && new Date(d) < new Date();

  return (
    <>
      {message.text && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
          background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#15803d' : '#b91c1c',
          fontSize: '0.9rem', fontWeight: 600,
        }}>
          {message.type === 'success' ? <i className="fas fa-check-circle" style={{ marginRight: 7 }} /> : <i className="fas fa-exclamation-circle" style={{ marginRight: 7 }} />}
          {message.text}
        </div>
      )}

      <p style={{ color: '#64748b', marginBottom: '20px' }}>
        Add products to flash sale — pick from existing inventory or upload a brand new product.
      </p>

      {/* Add Flash Sale Card */}
      <div className="card" style={{ marginBottom: '28px', padding: '24px' }}>
        <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '20px', color: '#0f172a' }}>
          <i className="fas fa-bolt" style={{ marginRight: '8px', color: '#ef4444' }} />
          Add Flash Sale
        </h3>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { key: 'existing', label: 'Select Existing Product', icon: 'fa-list' },
            { key: 'new', label: 'Upload New Product', icon: 'fa-upload' },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setMode(key); setMessage({ type: '', text: '' }); }}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: '1.5px solid',
                borderColor: mode === key ? '#6366f1' : '#e2e8f0',
                background: mode === key ? '#eef2ff' : '#fff',
                color: mode === key ? '#4f46e5' : '#64748b',
                fontWeight: mode === key ? 700 : 500,
                fontSize: '0.85rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '7px',
              }}
            >
              <i className={`fas ${icon}`} />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Mode: Existing ────────────────────────────────── */}
          {mode === 'existing' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', color: '#374151' }}>
                Product <span style={{ color: '#ef4444' }}>*</span>
              </label>

              {selectedProduct ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '12px 14px', borderRadius: '10px',
                  border: '2px solid #6366f1', background: '#eef2ff',
                }}>
                  <img
                    src={selectedProduct.images?.[0] || selectedProduct.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80'}
                    alt={selectedProduct.name}
                    style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, border: '1px solid #c7d2fe' }}
                    onError={e => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80'; }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedProduct.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6366f1', textTransform: 'capitalize' }}>
                      {selectedProduct.category}{selectedProduct.brand ? ` · ${selectedProduct.brand}` : ''}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                      {formatPrice(selectedProduct.price || 0, selectedProduct.currency || 'NGN', false)} original price
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1.5px solid #6366f1', background: '#fff', color: '#4f46e5', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  style={{
                    width: '100%', padding: '20px', borderRadius: '10px',
                    border: '2px dashed #c7d2fe', background: '#f8fafc',
                    cursor: 'pointer', textAlign: 'center', color: '#6366f1',
                    fontWeight: 600, fontSize: '0.88rem',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#eef2ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.background = '#f8fafc'; }}
                >
                  <i className="fas fa-images" style={{ fontSize: '1.6rem', display: 'block', marginBottom: '8px', opacity: 0.7 }} />
                  Click to browse products
                  <span style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', fontWeight: 400, marginTop: '4px' }}>
                    {allProducts.length} products available
                  </span>
                </button>
              )}
            </div>
          )}

          {/* ── Mode: New Product ─────────────────────────────── */}
          {mode === 'new' && (
            <div style={{ marginBottom: '20px', padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', marginBottom: '16px' }}>
                <i className="fas fa-box" style={{ marginRight: '7px', color: '#6366f1' }} />
                New Product Details
              </div>

              {/* Image upload */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', color: '#374151' }}>
                  Product Image <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '90px', height: '90px', borderRadius: '8px', flexShrink: 0,
                      border: imagePreview ? '2px solid #6366f1' : '2px dashed #c7d2fe',
                      background: '#f1f5f9', overflow: 'hidden', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onClick={() => !imageUploading && fileRef.current?.click()}
                  >
                    {imageUploading ? (
                      <i className="fas fa-spinner fa-spin" style={{ color: '#6366f1', fontSize: '1.2rem' }} />
                    ) : imagePreview ? (
                      <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.7rem' }}>
                        <i className="fas fa-image" style={{ fontSize: '1.4rem', display: 'block', marginBottom: '3px' }} />
                        Upload
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageFile} style={{ display: 'none' }} />
                  <div style={{ flex: 1 }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => fileRef.current?.click()}
                      disabled={imageUploading}
                      style={{ marginBottom: '8px', fontSize: '0.78rem' }}
                    >
                      {imageUploading ? <><i className="fas fa-spinner fa-spin" /> Uploading…</> : <><i className="fas fa-folder-open" /> Upload from device</>}
                    </button>
                    <input
                      className="form-input"
                      placeholder="Or paste image URL…"
                      value={newForm.imageUrl}
                      onChange={e => { setNewForm(f => ({ ...f, imageUrl: e.target.value })); setImagePreview(e.target.value); }}
                      style={{ fontSize: '0.8rem', padding: '7px 10px' }}
                      disabled={imageUploading}
                    />
                    {imagePreview && (
                      <button type="button" onClick={() => { setNewForm(f => ({ ...f, imageUrl: '' })); setImagePreview(''); if (fileRef.current) fileRef.current.value = ''; }} style={{ fontSize: '0.72rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0', display: 'block', marginTop: '3px' }}>
                        <i className="fas fa-times" style={{ marginRight: '4px' }} />Remove image
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name + Brand */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>
                    Product Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input required className="form-input" placeholder="e.g. Nike Air Max" value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>Brand (optional)</label>
                  <input className="form-input" placeholder="e.g. Nike" value={newForm.brand} onChange={e => setNewForm(f => ({ ...f, brand: e.target.value }))} />
                </div>
              </div>

              {/* Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>
                    Category <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select required className="form-input" value={newForm.category} onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))}>
                    {categoriesData.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>Currency</label>
                  <select className="form-input" value={newForm.currency} onChange={e => setNewForm(f => ({ ...f, currency: e.target.value }))}>
                    <option value="NGN">NGN — ₦</option>
                    <option value="USD">USD — $</option>
                    <option value="GBP">GBP — £</option>
                    <option value="EUR">EUR — €</option>
                  </select>
                </div>
              </div>

              {/* Price + Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>
                    Regular Price <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input required type="number" min="1" className="form-input" placeholder="0" value={newForm.price} onChange={e => setNewForm(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>
                    Stock <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input required type="number" min="0" className="form-input" placeholder="0" value={newForm.stock} onChange={e => setNewForm(f => ({ ...f, stock: e.target.value }))} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '5px', color: '#374151' }}>
                  Description <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea required className="form-input" rows={3} placeholder="Brief product description…" value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
          )}

          {/* ── Campaign type ──────────────────────────────────── */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#374151' }}>
              Campaign Type <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select className="form-input" value={campaignType} onChange={e => setCampaignType(e.target.value)}>
              <option value="flash">Flash Sale</option>
              <option value="black_friday">Black Friday</option>
              <option value="easter">Easter</option>
            </select>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
              Shows on {campaignType === 'flash' ? '/flash-sales' : campaignType === 'black_friday' ? '/black-friday' : '/easter'}.
            </div>
          </div>

          {/* ── Sale Price + Timer (shared) ────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#374151' }}>
                Flash Sale Price (₦) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                className="form-input"
                value={flashPrice}
                onChange={e => setFlashPrice(e.target.value)}
                placeholder="e.g. 12500"
              />
              {selectedProduct && flashPrice && Number(flashPrice) < Number(selectedProduct.price) && (
                <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px', fontWeight: 600 }}>
                  <i className="fas fa-tag" style={{ marginRight: '4px' }} />
                  {Math.round((1 - flashPrice / selectedProduct.price) * 100)}% off original price
                </div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#374151' }}>
                Timer Duration (hours) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                required
                type="number"
                min="1"
                max="720"
                className="form-input"
                value={timerHours}
                onChange={e => setTimerHours(e.target.value)}
                placeholder="24"
              />
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
                Sale expires after {timerHours || '?'} hour{timerHours !== '1' ? 's' : ''}
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting || imageUploading} style={{ minWidth: '160px' }}>
            {submitting
              ? <><i className="fas fa-spinner fa-spin" /> Adding…</>
              : <><i className="fas fa-bolt" /> Add Flash Sale</>}
          </button>
        </form>
      </div>

      {/* ── Current Flash Sales List ─────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', margin: 0 }}>
            <i className="fas fa-list" style={{ marginRight: '8px', color: '#64748b' }} />
            All Flash Sales
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{sales.length} total</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: 'var(--primary)' }} />
          </div>
        ) : sales.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            No flash sales yet. Add one above to get started.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: '640px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Product</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Sale Price</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Original</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Discount</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Timer</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Expires</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => {
                  const expired = isExpired(sale.expires_at);
                  const discount = normalizePricing({
                    price: sale.sale_price,
                    originalPrice: sale.original_price,
                  }).discountPercent;
                  const img = sale.products?.images?.[0] || sale.products?.image_url;
                  return (
                    <tr key={sale.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td
                        style={{ padding: '12px 16px' }}
                      >
                        <div
                          className={styles['image-and-item-description']}
                        >
                          {img && (
                            <img
                              src={img}
                              alt={sale.products?.name}
                              style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e8f0' }}
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                          )}
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{sale.products?.name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#dc2626', fontWeight: 700 }}>
                        {formatPrice(sale.sale_price || 0, sale.products?.currency || 'NGN', false)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8', textDecoration: 'line-through' }}>
                        {formatPrice(sale.original_price || 0, sale.products?.currency || 'NGN', false)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {discount > 0 && (
                          <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700 }}>
                            -{discount}%
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{sale.timer_hours}h</td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.8rem' }}>{formatDate(sale.expires_at)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {expired ? (
                          <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '5px', fontSize: '0.76rem', fontWeight: 700 }}>Expired</span>
                        ) : (
                          <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '5px', fontSize: '0.76rem', fontWeight: 700 }}>Active</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          style={{ color: '#b91c1c', borderColor: '#fecaca' }}
                          onClick={() => handleDelete(sale.id)}
                        ><i className="fas fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Picker Modal */}
      {pickerOpen && (
          <ProductPickerModal
          products={allProducts}
          onSelect={(p) => { setSelectedProduct(p); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
          formatPrice={formatPrice}
        />
      )}
    </>
  );
}

AdminFlashSales.getLayout = function getLayout(page) {
  return (
    <AdminGuard>
      <AdminLayout title="Flash Sales">{page}</AdminLayout>
    </AdminGuard>
  );
};
