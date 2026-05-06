import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import SellerGuard from '@/components/SellerGuard';
import { apiFetch } from '../../lib/apiClient';

export default function SellerStore() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '' });

  useEffect(() => {
    fetchStore();
  }, []);

  const fetchStore = async () => {
    try {
      const res = await apiFetch('/api/stores/me');
      const data = await res.json();
      const myStore = data.data || null;
      if (myStore) {
        setStore(myStore);
        setFormData({ name: myStore.name, slug: myStore.slug, description: myStore.description });
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = store ? `/api/stores/${store.id}` : '/api/stores';
      const method = store ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        alert('Store profile saved!');
        setStore(data.data);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save store profile.');
    }
  };

  return (
    <Layout title="Manage Store Profile - Seller Zone">
      <div style={{ padding: 'var(--space-8) 0', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: 'var(--space-6)' }}>
          <i className="fas fa-store" style={{ color: 'var(--primary)' }}></i> My Store Profile
        </h1>

        <div className="card" style={{ padding: '30px' }}>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              {store && (
                <div style={{
                  marginBottom: '20px',
                  padding: '15px',
                  background:
                    store.status === 'approved'
                      ? '#dcfce7'
                      : store.status === 'rejected'
                      ? '#fee2e2'
                      : '#fef3c7',
                  borderRadius: '8px'
                }}>
                  <strong>Status:</strong>{' '}
                  {store.status === 'approved' && 'Approved and Active'}
                  {store.status === 'pending' && 'Pending Admin Approval'}
                  {store.status === 'rejected' && 'Rejected (contact admin)'}
                </div>
              )}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Store Name</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-')})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Store URL Slug</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={formData.slug}
                    onChange={e => setFormData({...formData, slug: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea 
                    className="form-input"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    rows="4"
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-lg">
                  {store ? 'Update Store' : 'Create Store'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

SellerStore.getLayout = function getLayout(page) {
  return <SellerGuard>{page}</SellerGuard>;
};
