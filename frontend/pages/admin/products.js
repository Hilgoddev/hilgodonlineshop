import { useCallback, useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiFetch } from '../../lib/apiClient';
import { adminJson, errorMessage } from '../../lib/adminApi';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import ConfirmModal from '@/components/ConfirmModal';
import { categoriesData } from '@/pages/categories';
import ProductSizesField from '@/components/product-form/ProductSizesField';
import { parseSizeInput } from '../../lib/parseSizes';
import styles from '@/css/fix.module.css';
import { useCurrency } from '@/contexts/CurrencyContext';
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

export default function AdminProducts() {
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [imagesBusy, setImagesBusy] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [modal, setModal] = useState({ open: false });
  const [activatingId, setActivatingId] = useState(null);
  const closeModal = () => setModal(m => ({ ...m, open: false }));
  const setImages = useCallback((update) => setForm((f) => ({ ...f, images: update(f.images) })), []);
  const showImageError = useCallback((text) => setMessage({ type: 'error', text }), []);

  const subcategoryOptions = categoriesData.find(c => c.id === form.category)?.subs || [];

  const fetchProducts = async () => {
    try {
      const { res, json } = await adminJson('/api/products/all?limit=1000&page=1');
      if (res.ok && json.success) setProducts(json.data || []);
      else setMessage({ type: 'error', text: errorMessage(json, 'Could not load products') });
    } catch {
      setMessage({ type: 'error', text: 'Network error loading products' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);
  useAutoRefresh(fetchProducts, { table: 'products' });

  const handleEdit = (product) => {
    const images = product.images?.length ? [...product.images] : [];
    while (images.length < DEFAULT_IMAGE_SLOTS) images.push('');
    setEditingId(product._id);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      currency: product.currency || 'NGN',
      originalPrice: product.originalPrice || '',
      category: product.category || 'electronics',
      subcategory: product.subcategory || '',
      brand: product.brand || '',
      stock: product.stock ?? '',
      images,
      sizes: (product.size_options || []).join(', '),
      colors: product.color_options || [],
      colorImages: product.color_images || {},
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(false);
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const uploadedImages = form.images.filter(Boolean);
    if (uploadedImages.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one product image.' });
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
        size_options: parseSizeInput(form.sizes),
        // Sent even when empty on edit, so removing every colour sticks.
        color_options: form.colors.length > 0 || editingId ? form.colors : undefined,
        color_images: form.colorImages,
      };

      const url = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
      const json = await res.json();

      if (res.ok && json.success) {
        setMessage({ type: 'success', text: `Product ${editingId ? 'updated' : 'added'} successfully!` });
        fetchProducts();
        if (!editingId) setForm(emptyForm());
      } else {
        setMessage({ type: 'error', text: json.error || 'Operation failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (productId, productName) => {
    setModal({
      open: true,
      title: 'Delete Product',
      message: `Permanently delete "${productName}"? This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        closeModal();
        try {
          const res = await apiFetch(`/api/products/${productId}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) { setMessage({ type: 'success', text: 'Product deleted' }); fetchProducts(); }
          else setMessage({ type: 'error', text: data.error || 'Deletion failed' });
        } catch { setMessage({ type: 'error', text: 'Network error' }); }
      },
    });
  };

  const handleActivate = async (productId) => {
    setActivatingId(productId);
    try {
      const res = await apiFetch(`/api/products/${productId}`, { method: 'PUT', body: JSON.stringify({ is_active: true }) });
      const data = await res.json();
      if (data.success) { setMessage({ type: 'success', text: 'Product activated' }); fetchProducts(); }
      else setMessage({ type: 'error', text: data.error || 'Failed to activate' });
    } catch { setMessage({ type: 'error', text: 'Network error' }); }
    finally { setActivatingId(null); setTimeout(() => setMessage({ type: '', text: '' }), 3000); }
  };

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Products</h1>
          <p style={{ color: 'var(--gray-1)', fontSize: '.875rem', marginTop: '2px' }}>
            {products.length} total product{products.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div
          style={{ height: 'auto' }}
        >
          <button
            className={`btn btn-width-fit ${showForm ? 'btn-outline' : 'btn-primary'}`}
            style={{ height: 'auto' }}
            onClick={() => showForm ? resetForm() : setShowForm(true)}
          >
            <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`}></i> {showForm ? 'Cancel' : 'Add Product'}
          </button>
        </div>
      </div>

      {message.text && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '20px',
          background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#16a34a' : '#ef4444',
          borderLeft: `4px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`,
        }}>
          <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i> {message.text}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="card" style={{ padding: '24px', marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 700 }}>
            <i className="fas fa-box" style={{ color: 'var(--primary)', marginRight: '8px' }}></i>
            {editingId ? 'Edit Product' : 'Add New Product'}
            <span style={{ fontSize: '.8rem', fontWeight: 400, color: 'var(--success)', marginLeft: '10px' }}>
              <i className="fas fa-bolt"></i> Goes live immediately — no approval needed
            </span>
          </h3>
          <form onSubmit={handleSubmit}>
            {/* Row 1: Name + Brand */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Product Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="form-input" placeholder="Product name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Brand (optional)</label>
                <input className="form-input" placeholder="e.g. Nike, Apple" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
              </div>
            </div>

            {/* Row 2: Category + Subcategory */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Category <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value, subcategory: '' }))} required>
                  <option value="" disabled>-- Select category --</option>
                  {categoriesData.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Subcategory (optional)</label>
                <select className="form-input" value={form.subcategory} onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}>
                  <option value="">-- Select subcategory --</option>
                  {subcategoryOptions.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>
            </div>

            {/* Row 3: Price + Currency + Original Price + Stock */}
            <div className="admin-form-4col" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Price <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="form-input" type="number" min="0" placeholder="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Currency <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select className="form-input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} required>
                  <option value="NGN">NGN — ₦</option>
                  <option value="USD">USD — $</option>
                  <option value="GBP">GBP — £</option>
                  <option value="EUR">EUR — €</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Original Price (optional)</label>
                <input className="form-input" type="number" min="0" placeholder="For discount display" value={form.originalPrice} onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Stock <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="form-input" type="number" min="0" placeholder="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} required />
              </div>
            </div>

            {/* Row 4: Sizes */}
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Sizes (optional)</label>
              <ProductSizesField value={form.sizes} onChange={sizes => setForm(f => ({...f,sizes}))} />
              <div style={{ fontSize: '.72rem', color: 'var(--gray-2)', marginTop: '4px' }}>Comma-separated</div>
            </div>

            {/* Colours — any number; buyers must pick one */}
            <div style={{ marginBottom: '12px' }}>
              <ProductColorsField
                colors={form.colors}
                onChange={(colors) => setForm(f => ({ ...f, colors }))}
                colorImages={form.colorImages}
                onColorImagesChange={(colorImages) => setForm(f => ({ ...f, colorImages }))}
                images={form.images}
              />
            </div>

            {/* Images — no limit */}
            <div style={{ marginBottom: '12px' }}>
              <ProductImagesField images={form.images} onChange={setImages} onBusyChange={setImagesBusy} onError={showImageError} />
            </div>

            {/* Description */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Description <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea className="form-input" rows={4} placeholder="Product description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving || imagesBusy}>
                {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : editingId ? 'Save Changes' : 'Add Product'}
              </button>
              <button type="button" className="btn btn-outline" onClick={resetForm} disabled={saving}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <input type="text" placeholder="Search products..." className="form-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ maxWidth: '400px' }} />
      </div>

      {/* Products Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-1)' }}>
            <i className="fas fa-box-open" style={{ fontSize: '3rem', opacity: .3 }}></i>
            <p style={{ marginTop: '12px' }}>{searchTerm ? 'No products match your search.' : 'No products yet.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--gray-6)', borderBottom: '2px solid var(--gray-4)' }}>
                  {['Product', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-1)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(product => (
                  <tr key={product._id} style={{ borderBottom: '1px solid var(--gray-5)' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px'}}>
                      <div 
                      className={styles['image-and-item-description']}
                      // style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start'}}
                      >
                        <img
                          src={product.images?.[0] || product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=60&q=80'}
                          alt={product.name}
                          style={{ width: '50%', height: 'auto', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--gray-4)', flexShrink: 0}}
                          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=60&q=80'; }}
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>{product.name}</div>
                          <div style={{ fontSize: '.75rem', color: 'var(--gray-2)' }}>{product._id?.slice(-6).toUpperCase()}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 8px', background: 'var(--gray-5)', borderRadius: '4px', fontSize: '.82rem' }}>{product.category}</span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{formatPrice(product.price || 0, product.currency || 'NGN', false)}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '.82rem', fontWeight: 600, background: product.stock > 10 ? '#dcfce7' : product.stock > 0 ? '#fef3c7' : '#fee2e2', color: product.stock > 10 ? '#16a34a' : product.stock > 0 ? '#d97706' : '#ef4444' }}>
                        {product.stock}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '.75rem', fontWeight: 700, background: product.is_active ? '#dcfce7' : '#fee2e2', color: product.is_active ? '#15803d' : '#b91c1c' }}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '.75rem', fontWeight: 600, background: product.status === 'approved' ? '#dbeafe' : '#f1f5f9', color: product.status === 'approved' ? '#1d4ed8' : '#64748b', textTransform: 'capitalize' }}>
                          {product.status || 'pending'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {!product.is_active && (
                          <button className="btn btn-sm" style={{ fontSize: '.75rem', color: '#16a34a', background: '#f0fdf4', border: '1px solid #dcfce7' }} disabled={activatingId === product._id} onClick={() => handleActivate(product._id)}>
                            {activatingId === product._id ? <i className="fas fa-spinner fa-spin" /> : 'Activate'}
                          </button>
                        )}
                        <button className="btn btn-sm btn-outline" onClick={() => handleEdit(product)} title="Edit"><i className="fas fa-edit"></i></button>
                        <button className="btn btn-sm" style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fee2e2' }} onClick={() => handleDelete(product._id, product.name)} title="Delete"><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal isOpen={modal.open} title={modal.title} message={modal.message} danger={modal.danger} onConfirm={modal.onConfirm} onCancel={closeModal} />
    </>
  );
}

AdminProducts.getLayout = function getLayout(page) {
  return (
    <AdminGuard>
      <AdminLayout title="Products">{page}</AdminLayout>
    </AdminGuard>
  );
};
