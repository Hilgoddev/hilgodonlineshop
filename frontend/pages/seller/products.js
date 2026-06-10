import { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '@/components/Layout';
import SellerGuard from '@/components/SellerGuard';
import { apiFetch } from '../../lib/apiClient';
import { supabase as supabaseClient } from '../../lib/supabaseClient';
import ConfirmModal from '@/components/ConfirmModal';
import { categoriesData } from '@/pages/categories';
import { useCurrency } from '@/contexts/CurrencyContext';
import { colorName } from '../../lib/colorName';

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  currency: 'NGN',
  originalPrice: '',
  category: 'electronics',
  subcategory: '',
  brand: '',
  stock: '',
  images: ['', '', ''],
  sizes: '',
  colors: [],
};

export default function SellerProducts() {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [modal, setModal] = useState({ open: false });
  const closeModal = () => setModal(m => ({ ...m, open: false }));
  const [data, setData] = useState({ products: [] });
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageUploading, setImageUploading] = useState([false, false, false]);
  const [imagePreviews, setImagePreviews] = useState(['', '', '']);
  const [uploadedFilenames, setUploadedFilenames] = useState(['', '', '']);

  const fileRef0 = useRef(null);
  const fileRef1 = useRef(null);
  const fileRef2 = useRef(null);
  const fileRefs = [fileRef0, fileRef1, fileRef2];

  const subcategoryOptions = categoriesData.find(c => c.id === form.category)?.subs || [];

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/seller/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json.data || { products: [] });
      } else {
        setMessage({ type: 'error', text: json.error || 'Could not load products' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error while loading products' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (productId, productName) => {
    setModal({
      open: true,
      title: 'Remove Product',
      message: `Remove "${productName}" from your listings?`,
      danger: true,
      onConfirm: async () => {
        closeModal();
        try {
          const res = await apiFetch(`/api/products/${productId}`, { method: 'DELETE' });
          const json = await res.json();
          if (json.success) {
            setMessage({ type: 'success', text: 'Product removed successfully.' });
            await load();
          } else {
            setMessage({ type: 'error', text: json.error || 'Failed to remove product' });
          }
        } catch {
          setMessage({ type: 'error', text: 'Network error while removing product' });
        }
      },
    });
  };

  useEffect(() => {
    load();
  }, []);

  const totalStock = useMemo(
    () => (data.products || []).reduce((sum, p) => sum + Number(p.stock || 0), 0),
    [data.products]
  );

  const handleImageFile = async (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setImagePreviews(prev => { const n = [...prev]; n[index] = localUrl; return n; });

    setImageUploading(prev => { const n = [...prev]; n[index] = true; return n; });
    setMessage({ type: '', text: '' });
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
        setForm(f => { const imgs = [...f.images]; imgs[index] = json.url; return { ...f, images: imgs }; });
        setImagePreviews(prev => { const n = [...prev]; n[index] = json.url; return n; });
        setUploadedFilenames(prev => { const n = [...prev]; n[index] = file.name; return n; });
      } else {
        setMessage({ type: 'error', text: json.error || 'Image upload failed' });
        setImagePreviews(prev => { const n = [...prev]; n[index] = ''; return n; });
        setForm(f => { const imgs = [...f.images]; imgs[index] = ''; return { ...f, images: imgs }; });
        setUploadedFilenames(prev => { const n = [...prev]; n[index] = ''; return n; });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error during image upload' });
      setImagePreviews(prev => { const n = [...prev]; n[index] = ''; return n; });
      setForm(f => { const imgs = [...f.images]; imgs[index] = ''; return { ...f, images: imgs }; });
      setUploadedFilenames(prev => { const n = [...prev]; n[index] = ''; return n; });
    } finally {
      setImageUploading(prev => { const n = [...prev]; n[index] = false; return n; });
    }
  };

  const clearImage = (index) => {
    setForm(f => { const imgs = [...f.images]; imgs[index] = ''; return { ...f, images: imgs }; });
    setImagePreviews(prev => { const n = [...prev]; n[index] = ''; return n; });
    setUploadedFilenames(prev => { const n = [...prev]; n[index] = ''; return n; });
    if (fileRefs[index].current) fileRefs[index].current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const uploadedImages = form.images.filter(Boolean);
    if (uploadedImages.length === 0) {
      setMessage({ type: 'error', text: 'Please upload at least one product image.' });
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const toArray = (str) => str.split(',').map(s => s.trim()).filter(Boolean);
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        currency: form.currency,
        original_price: form.originalPrice ? Number(form.originalPrice) : undefined,
        category: form.category,
        subcategory: form.subcategory || undefined,
        brand: form.brand || undefined,
        stock: Number(form.stock),
        images: uploadedImages,
        size_options: form.sizes ? toArray(form.sizes) : undefined,
        color_options: form.colors.length > 0 ? form.colors : undefined,
      };
      const res = await apiFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage({ type: 'error', text: json.error || 'Product upload failed' });
      } else {
        setMessage({ type: 'success', text: 'Product uploaded. It is now pending admin approval.' });
        setForm(EMPTY_FORM);
        setImagePreviews(['', '', '']);
        setUploadedFilenames(['', '', '']);
        fileRefs.forEach(r => { if (r.current) r.current.value = ''; });
        await load();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error while uploading product' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Layout title="Seller Products - Hilgod">
      <div style={{ padding: 'var(--space-8) 0' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
          <i className="fas fa-box" style={{ color: 'var(--primary)' }}></i> Seller Products
        </h1>

        {message.text ? (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: message.type === 'success' ? '#15803d' : '#b91c1c',
            }}
          >
            {message.text}
          </div>
        ) : null}

        <div className="seller-metrics-grid">
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--gray-1)', fontSize: '.85rem' }}>My products</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{data.products?.length || 0}</div>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--gray-1)', fontSize: '.85rem' }}>Total stock</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalStock}</div>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--gray-1)', fontSize: '.85rem' }}>Pending approval</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {(data.products || []).filter((p) => p.status === 'pending').length}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontWeight: 700 }}>Upload Product</h3>
          <form onSubmit={handleSubmit}>
            <div className="seller-product-form-grid">
              <input className="form-input" placeholder="Product name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <input className="form-input" placeholder="Brand (optional)" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
              <select
                className="form-input"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, subcategory: '' }))}
              >
                {categoriesData.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <select
                className="form-input"
                value={form.subcategory}
                onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
              >
                <option value="">-- Subcategory (optional) --</option>
                {subcategoryOptions.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
              <input className="form-input" type="number" min="0" placeholder="Price" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
              <input className="form-input" type="number" min="0" placeholder="Original price (optional, for discount)" value={form.originalPrice} onChange={(e) => setForm((f) => ({ ...f, originalPrice: e.target.value }))} />
              <select
                className="form-input"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                required
                title="Currency your price is in"
              >
                <option value="NGN">NGN — Nigerian Naira (₦)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="GBP">GBP — British Pound (£)</option>
                <option value="EUR">EUR — Euro (€)</option>
              </select>
              <input className="form-input" type="number" min="0" placeholder="Stock" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} required />
              <input className="form-input" placeholder="Sizes — comma separated e.g. S, M, L, XL (optional)" value={form.sizes} onChange={(e) => setForm((f) => ({ ...f, sizes: e.target.value }))} />
              <div style={{ padding: '8px 10px', border: '1px solid var(--gray-4)', borderRadius: '8px', background: 'var(--white)' }}>
                <div style={{ fontSize: '.75rem', color: 'var(--gray-1)', marginBottom: '6px' }}>Colors (optional)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {form.colors.map((color, i) => (
                    <button
                      key={i}
                      type="button"
                      title={`Remove ${colorName(color)} (${color})`}
                      onClick={() => setForm(f => ({ ...f, colors: f.colors.filter((_, ci) => ci !== i) }))}
                      style={{ width: '30px', height: '30px', borderRadius: '50%', border: '2px solid var(--gray-3)', background: color, cursor: 'pointer', position: 'relative', flexShrink: 0 }}
                    >
                      <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '14px', height: '14px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, fontWeight: 700 }}>×</span>
                    </button>
                  ))}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px 8px', border: '1px dashed var(--gray-3)', borderRadius: '6px', fontSize: '.76rem', color: 'var(--gray-1)' }}>
                    <input
                      type="color"
                      defaultValue="#000000"
                      style={{ width: '20px', height: '20px', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '3px' }}
                      onChange={e => {
                        const hex = e.target.value;
                        setForm(f => f.colors.includes(hex) ? f : { ...f, colors: [...f.colors, hex] });
                      }}
                    />
                    Add color
                  </label>
                </div>
              </div>
            </div>

            {/* Multi-image section — up to 3 images, at least 1 required */}
            <div style={{ marginTop: '16px', padding: '16px', background: 'var(--gray-6)', borderRadius: '8px', border: '1px solid var(--gray-4)' }}>
              <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: '10px', color: 'var(--dark)' }}>
                <i className="fas fa-images" style={{ color: 'var(--primary)', marginRight: '6px' }}></i>
                Product Images <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span>
                <span style={{ fontWeight: 400, color: 'var(--gray-1)', fontSize: '.78rem', marginLeft: '8px' }}>Upload 1–3 images (at least 1 required)</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[0, 1, 2].map((index) => (
                  <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: 'var(--white)', borderRadius: '8px', border: index === 0 ? '1.5px solid var(--primary)' : '1px solid var(--gray-4)' }}>
                    {/* Preview box */}
                    <div
                      style={{
                        width: '80px', height: '80px', borderRadius: '6px', flexShrink: 0,
                        border: '1.5px dashed var(--gray-3)',
                        background: 'var(--gray-6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', cursor: 'pointer',
                      }}
                      onClick={() => !imageUploading[index] && fileRefs[index].current?.click()}
                      title="Click to choose a file"
                    >
                      {imageUploading[index] ? (
                        <i className="fas fa-spinner fa-spin" style={{ color: 'var(--primary)', fontSize: '1.2rem' }} />
                      ) : imagePreviews[index] ? (
                        <img src={imagePreviews[index]} alt={`preview ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--gray-2)', fontSize: '.68rem', padding: '6px' }}>
                          <i className="fas fa-image" style={{ fontSize: '1.4rem', display: 'block', marginBottom: '3px' }} />
                          {index === 0 ? 'Main' : `#${index + 1}`}
                        </div>
                      )}
                    </div>

                    {/* Hidden file input */}
                    <input
                      ref={fileRefs[index]}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleImageFile(index, e)}
                      style={{ display: 'none' }}
                    />

                    {/* Controls */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--dark)' }}>
                        {index === 0 ? 'Main Image' : `Image ${index + 1}`}
                        {index === 0 && <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span>}
                      </div>

                      {/* URL input / uploaded file badge */}
                      {uploadedFilenames[index] ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <div style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', fontSize: '.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                            <i className="fas fa-check-circle" style={{ flexShrink: 0 }}></i>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadedFilenames[index]}</span>
                          </div>
                          <button type="button" onClick={() => clearImage(index)} className="btn btn-sm" style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '4px 8px', flexShrink: 0 }} title="Remove">
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            className="form-input"
                            placeholder="Paste image URL..."
                            value={form.images[index]}
                            onChange={(e) => {
                              const url = e.target.value;
                              setForm(f => { const imgs = [...f.images]; imgs[index] = url; return { ...f, images: imgs }; });
                              setImagePreviews(prev => { const n = [...prev]; n[index] = url; return n; });
                            }}
                            style={{ flex: 1, fontSize: '.82rem', padding: '7px 10px' }}
                            disabled={imageUploading[index]}
                          />
                          {imagePreviews[index] && (
                            <button type="button" onClick={() => clearImage(index)} className="btn btn-sm" style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '4px 8px', flexShrink: 0 }} title="Remove">
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                        </div>
                      )}

                      {/* File upload button */}
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => fileRefs[index].current?.click()}
                        disabled={imageUploading[index]}
                        style={{ fontSize: '.75rem', alignSelf: 'flex-start' }}
                      >
                        {imageUploading[index] ? (
                          <><i className="fas fa-spinner fa-spin"></i> Uploading...</>
                        ) : (
                          <><i className="fas fa-folder-open"></i> Upload from device</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '.72rem', color: 'var(--gray-2)', marginTop: '10px' }}>
                File upload: JPEG, PNG or WebP · Max 5 MB · Or paste any public image URL
              </div>
            </div>

            <textarea
              className="form-input"
              rows={4}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              style={{ marginTop: '12px' }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }} disabled={saving || imageUploading.some(Boolean)}>
              {saving ? <i className="fas fa-spinner fa-spin"></i> : 'Upload Product'}
            </button>
          </form>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ marginBottom: '12px', fontWeight: 700 }}>My Product List</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}></i>
            </div>
          ) : !(data.products || []).length ? (
            <p style={{ color: 'var(--gray-1)' }}>No products uploaded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-5)' }}>
                    <th style={{ textAlign: 'left', padding: '10px', width: '52px' }}></th>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Category</th>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Price</th>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Stock</th>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '10px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(data.products || []).map((p) => (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--gray-4)' }}>
                      <td style={{ padding: '10px' }}>
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '6px', display: 'block' }} />
                        ) : (
                          <div style={{ width: '42px', height: '42px', background: 'var(--gray-5)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-image" style={{ color: 'var(--gray-2)', fontSize: '1rem' }} />
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px', maxWidth: '200px' }}>{p.name}</td>
                      <td style={{ padding: '10px', textTransform: 'capitalize' }}>{p.category}</td>
                      <td style={{ padding: '10px' }}>{formatPrice(Number(p.price || 0), p.currency || 'NGN', false)}</td>
                      <td style={{ padding: '10px' }}>{p.stock}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontSize: '.78rem',
                          fontWeight: 700,
                          background: p.status === 'approved' ? '#dcfce7' : p.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                          color: p.status === 'approved' ? '#15803d' : p.status === 'rejected' ? '#b91c1c' : '#92400e',
                          textTransform: 'capitalize',
                        }}>
                          {p.status || 'pending'}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <button
                          onClick={() => handleDelete(p._id, p.name)}
                          className="btn btn-sm"
                          style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', cursor: 'pointer' }}
                          title="Remove product"
                        >
                          <i className="fas fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
    <ConfirmModal
      isOpen={modal.open}
      title={modal.title}
      message={modal.message}
      danger={modal.danger}
      onConfirm={modal.onConfirm}
      onCancel={closeModal}
    />
    </>
  );
}

SellerProducts.getLayout = function getLayout(page) {
  return <SellerGuard>{page}</SellerGuard>;
};
