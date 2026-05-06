import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminJson, errorMessage } from '../../lib/adminApi';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState({ name: '', slug: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    const { res, json } = await adminJson('/api/categories');
    if (res.ok) {
      setCategories(json.data || []);
    } else {
      setMessage({ type: 'error', text: errorMessage(json, 'Could not load categories') });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    const { res, json } = await adminJson('/api/categories', {
      method: 'POST',
      body: JSON.stringify(newCat),
    });
    setSaving(false);
    if (res.ok && json.success !== false) {
      setNewCat({ name: '', slug: '' });
      setMessage({ type: 'success', text: 'Category created.' });
      fetchCategories();
    } else {
      setMessage({ type: 'error', text: errorMessage(json, 'Create failed') });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category? Products may still reference it.')) return;
    const { res, json } = await adminJson(`/api/categories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMessage({ type: 'success', text: 'Category deleted.' });
      fetchCategories();
    } else {
      setMessage({ type: 'error', text: errorMessage(json, 'Delete failed') });
    }
  };

  return (
    <>
      {message.text ? (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#15803d' : '#b91c1c',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {message.text}
        </div>
      ) : null}

      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Add category</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Name
            </label>
            <input
              type="text"
              placeholder="e.g. Electronics"
              value={newCat.name}
              onChange={(e) =>
                setNewCat({
                  ...newCat,
                  name: e.target.value,
                  slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                })
              }
              required
              className="form-input"
            />
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Slug
            </label>
            <input
              type="text"
              placeholder="e.g. electronics"
              value={newCat.slug}
              onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
              required
              className="form-input"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <i className="fas fa-spinner fa-spin" /> : 'Add'}
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: 'var(--primary)' }} />
          </div>
        ) : categories.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No categories yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b' }}>
                  <th style={{ padding: '12px 16px' }}>Name</th>
                  <th style={{ padding: '12px 16px' }}>Slug</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{c.slug}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="btn btn-sm btn-outline"
                        style={{ color: '#b91c1c', borderColor: '#fecaca' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

AdminCategories.getLayout = function getLayout(page) {
  return (
    <AdminGuard>
      <AdminLayout title="Categories">{page}</AdminLayout>
    </AdminGuard>
  );
};
