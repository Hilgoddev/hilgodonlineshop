import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import SellerGuard from '@/components/SellerGuard';
import { apiFetch } from '../../lib/apiClient';
import ConfirmModal from '@/components/ConfirmModal';
import { categoriesData } from '@/pages/categories';
import { useCurrency } from '@/contexts/CurrencyContext';
import { colorName } from '../../lib/colorName';
import { parseSizeInput } from '../../lib/parseSizes';
import ProductImagesField, { emptyImageSlots, DEFAULT_IMAGE_SLOTS } from '@/components/product-form/ProductImagesField';
import ProductColorsField from '@/components/product-form/ProductColorsField';

const emptyForm = () => ({
  name: '',
  description: '',
  price: '',
  currency: 'NGN',
  originalPrice: '',
  category: '',
  subcategory: '',
  brand: '',
  stock: '',
  images: emptyImageSlots(),
  sizes: '',
  colors: [],
  colorImages: {},
});

export default function SellerProducts() {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [modal, setModal] = useState({ open: false });
  const closeModal = () => setModal(m => ({ ...m, open: false }));
  const [data, setData] = useState({ products: [] });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [imagesBusy, setImagesBusy] = useState(false);
  const setImages = useCallback((update) => setForm((f) => ({ ...f, images: update(f.images) })), []);
  const showImageError = useCallback((text) => setMessage({ type: 'error', text }), []);

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

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  // Load an existing product into the form so photos/colours can be added later.
  const handleEdit = (p) => {
    const images = p.images?.length ? [...p.images] : [];
    while (images.length < DEFAULT_IMAGE_SLOTS) images.push('');
    setEditingId(p._id);
    setForm({
      name: p.name || '',
      description: p.description || '',
      price: p.price ?? '',
      currency: p.currency || 'NGN',
      originalPrice: p.original_price || '',
      category: p.category || '',
      subcategory: p.subcategory || '',
      brand: p.brand || '',
      stock: p.stock ?? '',
      images,
      sizes: (p.size_options || []).join(', '),
      colors: p.color_options || [],
      colorImages: p.color_images || {},
    });
    setMessage({ type: '', text: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        size_options: form.sizes ? parseSizeInput(form.sizes) : undefined,
        // Sent even when empty on edit, so removing every colour sticks.
        color_options: form.colors.length > 0 || editingId ? form.colors : undefined,
        color_images: form.colorImages,
      };
      const res = await apiFetch(editingId ? `/api/products/${editingId}` : '/api/products', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage({ type: 'error', text: json.error || (editingId ? 'Saving changes failed' : 'Product upload failed') });
      } else {
        const status = json.data?.status;
        setMessage({
          type: 'success',
          text: editingId
            ? (status === 'pending' ? 'Changes saved. The product is back in review until an admin approves it.' : 'Changes saved.')
            : (status === 'approved' ? 'Product uploaded and live.' : 'Product uploaded. It is now pending admin approval.'),
        });
        resetForm();
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <h3 style={{ fontWeight: 700 }}>{editingId ? `Edit: ${form.name || 'Product'}` : 'Upload Product'}</h3>
            {editingId && (
              <button type="button" className="btn btn-outline btn-sm" onClick={resetForm}>
                <i className="fas fa-times"></i> Cancel edit
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="seller-product-form-grid">
              <input className="form-input" placeholder="Product name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <input className="form-input" placeholder="Brand (optional)" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
              <select
                className="form-input"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, subcategory: '' }))}
                required
              >
                <option value="" disabled>-- Select category --</option>
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
            </div>

            <div style={{ marginTop: '16px' }}>
              <ProductColorsField
                colors={form.colors}
                onChange={(colors) => setForm((f) => ({ ...f, colors }))}
                colorImages={form.colorImages}
                onColorImagesChange={(colorImages) => setForm((f) => ({ ...f, colorImages }))}
                images={form.images}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <ProductImagesField images={form.images} onChange={setImages} onBusyChange={setImagesBusy} onError={showImageError} />
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
            <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }} disabled={saving || imagesBusy}>
              {saving ? <i className="fas fa-spinner fa-spin"></i> : imagesBusy ? 'Uploading photos…' : editingId ? 'Save Changes' : 'Upload Product'}
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
                      <td style={{ padding: '10px', maxWidth: '220px' }}>
                        <div>{p.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '.72rem', color: 'var(--gray-1)', flexWrap: 'wrap' }}>
                          <span><i className="fas fa-images"></i> {p.images?.length || 0}</span>
                          {(p.color_options || []).slice(0, 8).map((c) => (
                            <span key={c} title={colorName(c)} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c, border: '1px solid var(--gray-3)', display: 'inline-block' }} />
                          ))}
                          {(p.color_options?.length || 0) > 8 && <span>+{p.color_options.length - 8}</span>}
                        </div>
                      </td>
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
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleEdit(p)}
                          className="btn btn-sm btn-outline"
                          style={{ marginRight: '6px' }}
                          title="Edit product"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
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
