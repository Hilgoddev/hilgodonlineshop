import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import AdminGuard from '@/components/AdminGuard';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'electronics',
    stock: '',
    images: [''] // First item is primary image
  });
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      
      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'image') {
      setFormData(prev => ({ ...prev, images: [value] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      category: product.category,
      stock: product.stock || 0,
      images: product.images && product.images.length > 0 ? [...product.images] : ['']
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'electronics',
      stock: '',
      images: ['']
    });
    setShowForm(false);
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PUT' : 'POST';

      // Ensure data types
      const payload = {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: `Product successfully ${editingId ? 'updated' : 'added'}!` });
        fetchProducts();
        if (!editingId) {
          setTimeout(resetForm, 2000);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Operation failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      try {
        const res = await fetch(`/api/products/${productId}`, {
          method: 'DELETE',
        });
        
        const data = await res.json();
        if (data.success) {
          setMessage({ type: 'success', text: 'Product deleted successfully' });
          fetchProducts();
        } else {
          setMessage({ type: 'error', text: data.error || 'Deletion failed' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Network error occurred' });
      }
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout title="Manage Products — Admin Panel">
      <div style={{ padding: 'var(--space-8) 0' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 'var(--space-6)',
          flexWrap: 'wrap',
          gap: 'var(--space-3)'
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>
            <i className="fas fa-box" style={{ color: 'var(--primary)' }}></i> Manage Products
          </h1>
          <button 
            className={`btn ${showForm ? 'btn-outline' : 'btn-primary'}`}
            onClick={() => showForm ? resetForm() : setShowForm(true)}
          >
            <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`}></i> {showForm ? 'Cancel' : 'Add New Product'}
          </button>
        </div>

        {message.text && (
          <div style={{ 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            background: message.type === 'success' ? '#dcfce7' : '#fef2f2',
            color: message.type === 'success' ? '#16a34a' : '#ef4444',
            borderLeft: `4px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`
          }}>
            <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i> {message.text}
          </div>
        )}

        {/* Inline Add/Edit Form */}
        {showForm && (
          <div className="card" style={{ padding: '24px', marginBottom: '30px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>
              {editingId ? 'Edit Product' : 'Add New Product'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600' }}>Product Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="form-input" required />
                </div>
                
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600' }}>Category</label>
                  <select name="category" value={formData.category} onChange={handleInputChange} className="form-input" required>
                    <option value="electronics">Electronics</option>
                    <option value="fashion">Fashion & Style</option>
                    <option value="beauty">Beauty</option>
                    <option value="womenswear">Womenswear</option>
                    <option value="menswear">Menswear</option>
                    <option value="home">Home & Kitchen</option>
                    <option value="shoes">Shoes</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600' }}>Price (₦)</label>
                  <input type="number" name="price" value={formData.price} onChange={handleInputChange} className="form-input" required min="0" />
                </div>
                
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600' }}>Stock Quantity</label>
                  <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} className="form-input" required min="0" />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: '600' }}>Image URL</label>
                <input type="url" name="image" value={formData.images[0] || ''} onChange={handleInputChange} className="form-input" placeholder="https://images.unsplash.com/photo-..." required />
                {formData.images[0] && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={formData.images[0]} alt="Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} onError={(e) => e.target.style.display = 'none'} />
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ fontWeight: '600' }}>Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} className="form-input" rows="4" required></textarea>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? <i className="fas fa-spinner fa-spin"></i> : editingId ? 'Save Changes' : 'Create Product'}
                </button>
                <button type="button" className="btn btn-outline" onClick={resetForm} disabled={formLoading}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search Bar */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <input
            type="text"
            placeholder="Search products by name or category..."
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', maxWidth: '400px' }}
          />
        </div>

        {/* Products Table */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
              <i className="fas fa-box-open" style={{ fontSize: '3rem', color: 'var(--gray-3)', marginBottom: '15px' }}></i>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>No products found</h3>
              <p style={{ color: 'var(--gray-1)', marginBottom: '20px' }}>{searchTerm ? 'Try a different search term.' : 'No products have been added yet.'}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-5)', color: 'var(--gray-1)', fontSize: '0.9rem' }}>
                    <th style={{ padding: '16px', fontWeight: '600' }}>Product</th>
                    <th style={{ padding: '16px', fontWeight: '600' }}>Category</th>
                    <th style={{ padding: '16px', fontWeight: '600' }}>Price</th>
                    <th style={{ padding: '16px', fontWeight: '600' }}>Stock</th>
                    <th style={{ padding: '16px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr key={product._id} style={{ borderBottom: '1px solid var(--gray-4)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img 
                            src={product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=40&h=40&fit=crop'} 
                            alt={product.name}
                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--gray-4)' }}
                          />
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--dark)' }}>{product.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--gray-1)' }}>ID: {product._id.substring(product._id.length - 6).toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ padding: '4px 8px', background: 'var(--gray-5)', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500' }}>
                          {product.category}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontWeight: '700' }}>₦{product.price?.toLocaleString()}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '20px', 
                          fontSize: '0.85rem', 
                          fontWeight: '600',
                          background: product.stock > 10 ? '#dcfce7' : product.stock > 0 ? '#fef3c7' : '#fef2f2',
                          color: product.stock > 10 ? '#16a34a' : product.stock > 0 ? '#d97706' : '#ef4444'
                        }}>
                          {product.stock} in stock
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn btn-sm btn-outline"
                            onClick={() => handleEdit(product)}
                            title="Edit"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className="btn btn-sm btn-outline"
                            style={{ color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2' }}
                            onClick={() => handleDelete(product._id)}
                            title="Delete"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
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

AdminProducts.getLayout = function getLayout(page) {
  return <AdminGuard>{page}</AdminGuard>;
};