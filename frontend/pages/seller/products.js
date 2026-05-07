import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import SellerGuard from '@/components/SellerGuard';
import { apiFetch } from '../../lib/apiClient';

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  category: 'electronics',
  stock: '',
  image: '',
};

export default function SellerProducts() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [data, setData] = useState({ products: [] });
  const [form, setForm] = useState(EMPTY_FORM);

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

  const handleDelete = async (productId, productName) => {
    if (!confirm(`Remove "${productName}" from your listings?`)) return;
    try {
      const res = await apiFetch(`/api/products/${productId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: 'Product removed successfully.' });
        await load();
      } else {
        setMessage({ type: 'error', text: json.error || 'Failed to remove product' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error while removing product' });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalStock = useMemo(
    () => (data.products || []).reduce((sum, p) => sum + Number(p.stock || 0), 0),
    [data.products]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        stock: Number(form.stock),
        images: form.image ? [form.image] : [],
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
        await load();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error while uploading product' });
    } finally {
      setSaving(false);
    }
  };

  return (
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '12px' }}>
              <input className="form-input" placeholder="Product name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <select className="form-input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                <option value="electronics">Electronics</option>
                <option value="fashion">Fashion</option>
                <option value="beauty">Beauty</option>
                <option value="home">Home</option>
                <option value="menswear">Menswear</option>
                <option value="womenswear">Womenswear</option>
                <option value="shoes">Shoes</option>
              </select>
              <input className="form-input" type="number" min="0" placeholder="Price" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
              <input className="form-input" type="number" min="0" placeholder="Stock" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} required />
            </div>
            <input
              className="form-input"
              placeholder="Image URL (optional)"
              value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              style={{ marginTop: '12px' }}
            />
            <textarea
              className="form-input"
              rows={4}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              style={{ marginTop: '12px' }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }} disabled={saving}>
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
                      <td style={{ padding: '10px' }}>N{Number(p.price || 0).toLocaleString()}</td>
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
  );
}

SellerProducts.getLayout = function getLayout(page) {
  return <SellerGuard>{page}</SellerGuard>;
};
