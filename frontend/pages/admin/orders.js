import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import AdminGuard from '@/components/AdminGuard';
import { apiFetch } from '../../lib/apiClient';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [localStatuses, setLocalStatuses] = useState({});
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchOrders = async () => {
    try {
      const res = await apiFetch('/api/orders/all');
      const data = await res.json();
      if (data.success) {
        setOrders(data.data || []);
        const statuses = {};
        (data.data || []).forEach(o => { statuses[o._id] = o.status || 'pending'; });
        setLocalStatuses(statuses);
      }
    } catch (error) { console.error('Error fetching orders:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleStatusChange = (id, val) => setLocalStatuses(prev => ({ ...prev, [id]: val }));

  const handleSaveStatus = async (orderId) => {
    setUpdatingId(orderId);
    try {
      const res = await apiFetch(`/api/orders/${orderId}`, { method: 'PUT', body: JSON.stringify({ status: localStatuses[orderId] }) });
      const data = await res.json();
      if (data.success) { setMessage({ type: 'success', text: 'Status updated!' }); fetchOrders(); }
      else { setMessage({ type: 'error', text: data.error || 'Failed to update' }); }
    } catch (err) { setMessage({ type: 'error', text: 'Network error' }); }
    finally { setUpdatingId(null); setTimeout(() => setMessage({ type: '', text: '' }), 3000); }
  };

  const filteredOrders = orders.filter(order => {
    const name = order.user?.firstName ? `${order.user.firstName} ${order.user.lastName}` : '';
    const email = order.user?.email || '';
    const matchesSearch = order._id.toLowerCase().includes(searchTerm.toLowerCase()) || name.toLowerCase().includes(searchTerm.toLowerCase()) || email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (d) => new Date(d).toLocaleString('en-NG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const statusColors = { pending: '#f59e0b', processing: '#3b82f6', shipped: '#8b5cf6', delivered: '#10b981', cancelled: '#ef4444' };
  const payColors = { paid: '#10b981', pending: '#f59e0b', failed: '#ef4444', refunded: '#6366f1' };

  const badge = (text, colorMap) => {
    const c = colorMap[text] || '#64748b';
    return { padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', background: `${c}18`, color: c, textTransform: 'capitalize' };
  };

  return (
    <Layout title="Manage Orders — Admin Panel">
      <div style={{ padding: 'var(--space-8) 0', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}><i className="fas fa-shopping-cart" style={{ color: 'var(--primary)' }}></i> Manage Orders <span style={{ fontSize: '.9rem', fontWeight: '500', color: 'var(--gray-1)' }}>({filteredOrders.length})</span></h1>
        </div>

        {message.text && (
          <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', background: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#16a34a' : '#ef4444', fontSize: '.9rem', fontWeight: '600' }}>
            <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i> {message.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Search by order ID, customer name or email..." className="form-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ minWidth: '280px', flex: 1 }} />
          <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ minWidth: '140px' }}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i></div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}><i className="fas fa-box-open" style={{ fontSize: '3rem', color: 'var(--gray-3)', marginBottom: '15px', display: 'block' }}></i><h3>No orders found</h3><p style={{ color: 'var(--gray-1)' }}>Try different search criteria.</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-5)', color: 'var(--gray-1)', fontSize: '0.82rem' }}>
                    <th style={{ padding: '14px 16px' }}>Order ID</th>
                    <th style={{ padding: '14px 16px' }}>Customer</th>
                    <th style={{ padding: '14px 16px' }}>Items</th>
                    <th style={{ padding: '14px 16px' }}>Amount</th>
                    <th style={{ padding: '14px 16px' }}>Payment</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 16px' }}>Date</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => {
                    const custName = order.user?.firstName ? `${order.user.firstName} ${order.user.lastName}` : 'Guest';
                    const custEmail = order.user?.email || 'N/A';
                    const currentStatus = localStatuses[order._id] || order.status || 'pending';
                    const isChanged = currentStatus !== (order.status || 'pending');
                    const isExpanded = expandedOrder === order._id;

                    return (
                      <tr key={order._id} style={{ borderBottom: '1px solid var(--gray-4)', background: isExpanded ? '#f8fafc' : 'transparent' }}>
                        <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--primary)', verticalAlign: 'top' }}>#{order._id.slice(-8).toUpperCase()}</td>
                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: '600' }}>{custName}</div>
                          <div style={{ fontSize: '.8rem', color: 'var(--gray-1)' }}>{custEmail}</div>
                        </td>
                        <td style={{ padding: '14px 16px', verticalAlign: 'top', fontWeight: '600' }}>{order.items?.length || 0}</td>
                        <td style={{ padding: '14px 16px', fontWeight: '700', verticalAlign: 'top' }}>₦{order.totalAmount?.toLocaleString()}</td>
                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}><span style={badge(order.paymentStatus || 'pending', payColors)}>{order.paymentStatus || 'pending'}</span></td>
                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <select className="form-input" value={currentStatus} onChange={(e) => handleStatusChange(order._id, e.target.value)} style={{ padding: '4px 8px', fontSize: '.82rem', width: '120px', border: `1px solid ${statusColors[currentStatus] || '#ccc'}`, color: statusColors[currentStatus], fontWeight: '600', background: `${statusColors[currentStatus]}10` }}>
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            {isChanged && (<button className="btn btn-primary btn-sm" onClick={() => handleSaveStatus(order._id)} disabled={updatingId === order._id} style={{ padding: '4px 10px', fontSize: '.78rem' }}>{updatingId === order._id ? <i className="fas fa-spinner fa-spin"></i> : 'Save'}</button>)}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '.82rem', color: 'var(--gray-1)', verticalAlign: 'top' }}>{formatDate(order.createdAt)}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'top' }}>
                          <button className="btn btn-sm btn-outline" onClick={() => setExpandedOrder(isExpanded ? null : order._id)} style={{ fontSize: '.8rem' }}>
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Expanded Order Detail */}
              {expandedOrder && (() => {
                const order = orders.find(o => o._id === expandedOrder);
                if (!order) return null;
                return (
                  <div style={{ padding: '20px 24px', borderTop: '2px solid var(--primary)', background: '#f8fafc' }}>
                    <h4 style={{ fontWeight: '700', marginBottom: '12px' }}>Order #{order._id.slice(-8).toUpperCase()} Details</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                      <div><strong>Customer:</strong> {order.user?.firstName} {order.user?.lastName}<br /><span style={{ fontSize: '.85rem', color: 'var(--gray-1)' }}>{order.user?.email}</span></div>
                      {order.deliveryAddress && (
                        <div><strong>Delivery:</strong><br /><span style={{ fontSize: '.85rem', color: 'var(--gray-1)' }}>{order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}, {order.deliveryAddress.country}<br />Phone: {order.deliveryAddress.phone}</span></div>
                      )}
                    </div>
                    <strong>Items:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
                      {order.items?.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-4)', fontSize: '.85rem' }}>
                          {item.image && <img src={item.image} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />}
                          <div><div style={{ fontWeight: '600' }}>{item.name}</div><div style={{ color: 'var(--gray-1)' }}>Qty: {item.quantity} · ₦{item.price?.toLocaleString()}</div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

AdminOrders.getLayout = function getLayout(page) {
  return <AdminGuard>{page}</AdminGuard>;
};
