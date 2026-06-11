import React, { useState, useEffect, useRef } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import { apiFetch } from '../../lib/apiClient';
import { adminJson, errorMessage } from '../../lib/adminApi';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '../../lib/supabaseClient';
import { orderStatusLabel } from '../../lib/orderStatus';

const ORDER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

// Quick-fill templates shown in the email compose modal
const EMAIL_TEMPLATES = [
  { label: '✅ Approved',    subject: 'Your order has been approved',     body: 'Great news! Your order has been approved and is now being prepared for dispatch. We\'ll notify you once it\'s on its way.' },
  { label: '🔄 Processing',  subject: 'Your order is being processed',    body: 'Your order is currently being processed and packed by our team. We\'ll update you as soon as it ships.' },
  { label: '🚚 Shipped',     subject: 'Your order is on its way!',        body: 'Exciting news — your order has been shipped and is on its way to you! Please allow a few days for delivery.' },
  { label: '🛵 Out for Delivery', subject: 'Your order is out for delivery', body: 'Your order is out for delivery today and should reach you very soon. Please ensure someone is available to receive it.' },
  { label: '📦 Delivered',   subject: 'Your order has been delivered',    body: 'Your order has been delivered. We hope you love your purchase! If you have any issues, please don\'t hesitate to contact our support team.' },
  { label: '❌ Cancelled',   subject: 'Your order has been cancelled',    body: 'We\'re sorry to inform you that your order has been cancelled. If you believe this is a mistake or need assistance, please contact our support team.' },
];

export default function AdminOrders() {
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [localStatuses, setLocalStatuses] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [emailModal, setEmailModal] = useState(null); // { order } | null
  const [emailForm, setEmailForm] = useState({ subject: '', body: '' });
  const [emailSending, setEmailSending] = useState(false);

  const fetchOrders = async () => {
    try {
      const { res, json } = await adminJson('/api/orders/all');
      if (res.ok && json.success) {
        setOrders(json.data || []);
        const statuses = {};
        (json.data || []).forEach((o) => {
          statuses[o._id] = o.status || 'pending';
        });
        setLocalStatuses(statuses);
      } else {
        setMessage({ type: 'error', text: errorMessage(json, 'Could not load orders') });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  // Initial load + Supabase real-time + 30s fallback poll.
  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('admin-orders-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();
    // Fallback: poll every 30s in case the real-time subscription is unavailable.
    const poll = setInterval(fetchOrders, 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, []);

  // When status dropdown changes, immediately pre-fill the matching email template
  // so that when the modal opens (after Save) the right message is already loaded.
  const handleStatusChange = (id, val) => {
    setLocalStatuses(prev => ({ ...prev, [id]: val }));
    const tpl = EMAIL_TEMPLATES.find(t => t.label.toLowerCase().includes(val.toLowerCase()));
    if (tpl) setEmailForm({ subject: tpl.subject, body: tpl.body });
  };

  const handleSaveStatus = async (orderId) => {
    setUpdatingId(orderId);
    try {
      const res = await apiFetch(`/api/orders/${orderId}`, { method: 'PUT', body: JSON.stringify({ status: localStatuses[orderId] }) });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Status updated!' });
        fetchOrders();
        // Auto-open email compose modal with pre-filled template for the new status
        const updatedOrder = data.data || orders.find(o => o._id === orderId);
        if (updatedOrder) setEmailModal({ order: { ...updatedOrder, _id: orderId } });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update' });
      }
    } catch (err) { setMessage({ type: 'error', text: 'Network error' }); }
    finally { setUpdatingId(null); setTimeout(() => setMessage({ type: '', text: '' }), 3000); }
  };

  const openEmailModal = (order) => {
    // Pre-fill based on the pending/selected status for this order (may differ from saved status)
    const pendingStatus = localStatuses[order._id] || order.status || '';
    const tpl = EMAIL_TEMPLATES.find(t => t.label.toLowerCase().includes(pendingStatus.toLowerCase()));
    setEmailForm({ subject: tpl?.subject || `Update on your order #${order._id.slice(-8).toUpperCase()}`, body: tpl?.body || '' });
    setEmailModal({ order });
  };

  const handleSendEmail = async () => {
    if (!emailForm.subject.trim() || !emailForm.body.trim()) return;
    setEmailSending(true);
    try {
      const res = await apiFetch(`/api/orders/${emailModal.order._id}/notify`, {
        method: 'POST',
        body: JSON.stringify({ subject: emailForm.subject, message: emailForm.body }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Email sent to customer!` });
        setEmailModal(null);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send email' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error sending email' });
    } finally {
      setEmailSending(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }
  };

  const filteredOrders = orders.filter(order => {
    const name = order.user?.firstName ? `${order.user.firstName} ${order.user.lastName}` : '';
    const email = order.user?.email || '';
    const matchesSearch = order._id.toLowerCase().includes(searchTerm.toLowerCase()) || name.toLowerCase().includes(searchTerm.toLowerCase()) || email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (d) => new Date(d).toLocaleString('en-NG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const statusColors = { pending: '#f59e0b', paid: '#0ba4db', processing: '#3b82f6', shipped: '#8b5cf6', delivered: '#10b981', cancelled: '#ef4444' };
  const payColors = { paid: '#10b981', pending: '#f59e0b', failed: '#ef4444', refunded: '#6366f1' };
  const PAYMENT_LABELS = { paystack: 'Paystack', stripe: 'Stripe', bank_transfer: 'Bank Transfer', pod: 'Pay on Delivery', opay: 'OPay', card: 'Card' };
  const methodLabel = (m) => (m ? (PAYMENT_LABELS[m] || m) : 'Unknown');

  const badge = (text, colorMap) => {
    const c = colorMap[text] || '#64748b';
    return { padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', background: `${c}18`, color: c, textTransform: 'capitalize' };
  };

  return (
    <>
        <p style={{ color: '#64748b', marginBottom: '16px' }}>
          <strong>{filteredOrders.length}</strong> orders match your filters.
        </p>

        {message.text && (
          <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', background: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#16a34a' : '#ef4444', fontSize: '.9rem', fontWeight: '600' }}>
            <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i> {message.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Search by order ID, customer name or email..." className="form-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1 }} />
          <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '.88rem', minWidth: '640px' }}>
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

                    return (
                      <React.Fragment key={order._id}>
                        <tr style={{ borderBottom: '1px solid var(--gray-4)' }}>
                          <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--primary)', verticalAlign: 'top' }}>#{order._id.slice(-8).toUpperCase()}</td>
                          <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: '600' }}>{custName}</div>
                            <div style={{ fontSize: '.8rem', color: 'var(--gray-1)' }}>{custEmail}</div>
                          </td>
                          <td style={{ padding: '14px 16px', verticalAlign: 'top', fontWeight: '600' }}>{order.items?.length || 0}</td>
                          <td style={{ padding: '14px 16px', fontWeight: '700', verticalAlign: 'top' }}>{formatPrice(order.totalAmount || 0, order.currency || 'NGN', false)}</td>
                          <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                            <span style={badge(order.paymentStatus || 'pending', payColors)}>{order.paymentStatus || 'pending'}</span>
                            <div style={{ fontSize: '.72rem', color: 'var(--gray-1)', marginTop: '4px' }}>
                              <i className="fas fa-credit-card" style={{ fontSize: '.62rem', marginRight: '3px' }}></i>{methodLabel(order.paymentMethod)}
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <select className="form-input" value={currentStatus} onChange={(e) => handleStatusChange(order._id, e.target.value)} style={{ padding: '4px 8px', fontSize: '.82rem', width: '150px', border: `1px solid ${statusColors[currentStatus] || '#ccc'}`, color: statusColors[currentStatus], fontWeight: '600', background: `${statusColors[currentStatus]}10` }}>
                                {ORDER_STATUSES
                                  // POD has no separate 'paid' step (paid at delivery).
                                  .filter((s) => !(String(order.paymentMethod || '').toLowerCase() === 'pod' && s === 'paid' && currentStatus !== 'paid'))
                                  .map((s) => (
                                    <option key={s} value={s}>{orderStatusLabel(s, order.paymentMethod)}</option>
                                  ))}
                              </select>
                              {isChanged && (<button className="btn btn-primary btn-sm" onClick={() => handleSaveStatus(order._id)} disabled={updatingId === order._id} style={{ padding: '4px 10px', fontSize: '.78rem' }}>{updatingId === order._id ? <i className="fas fa-spinner fa-spin"></i> : 'Save'}</button>)}
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '.82rem', color: 'var(--gray-1)', verticalAlign: 'top' }}>{formatDate(order.createdAt)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button className="btn btn-sm btn-outline" onClick={() => setSelectedOrder(order)} style={{ fontSize: '.8rem' }}>
                                View
                              </button>
                              <button
                                className="btn btn-sm"
                                title="Send email to customer"
                                onClick={() => openEmailModal(order)}
                                style={{ fontSize: '.8rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '4px 10px' }}
                              >
                                <i className="fas fa-envelope"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <OrderDetailsModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />

        {/* Email Compose Modal */}
        {emailModal && (
          <div
            onClick={() => !emailSending && setEmailModal(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--gray-4)', position: 'sticky', top: 0, background: '#fff', borderRadius: '16px 16px 0 0', zIndex: 1 }}>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>
                    <i className="fas fa-envelope" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
                    Send Email to Customer
                  </h3>
                  <div style={{ fontSize: '.78rem', color: 'var(--gray-1)', marginTop: 3 }}>
                    Order #{emailModal.order._id.slice(-8).toUpperCase()} · {emailModal.order.user?.email || 'customer'}
                  </div>
                </div>
                <button onClick={() => setEmailModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--gray-1)', padding: '4px 8px' }} disabled={emailSending}>
                  <i className="fas fa-xmark"></i>
                </button>
              </div>

              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Quick templates */}
                <div>
                  <div style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-1)', letterSpacing: '.5px', marginBottom: '8px' }}>Quick Templates</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {EMAIL_TEMPLATES.map(tpl => (
                      <button
                        key={tpl.label}
                        type="button"
                        onClick={() => setEmailForm({ subject: tpl.subject, body: tpl.body })}
                        style={{
                          padding: '5px 12px', borderRadius: '999px', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--gray-3)',
                          background: emailForm.subject === tpl.subject ? 'var(--primary)' : 'var(--gray-6)',
                          color: emailForm.subject === tpl.subject ? '#fff' : 'var(--dark)',
                          transition: 'all .15s',
                        }}
                      >
                        {tpl.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEmailForm({ subject: '', body: '' })}
                      style={{ padding: '5px 12px', borderRadius: '999px', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--gray-3)', background: 'var(--gray-6)', color: 'var(--dark)' }}
                    >
                      ✏️ Custom
                    </button>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 700, marginBottom: '6px' }}>Subject</label>
                  <input
                    className="form-input"
                    type="text"
                    value={emailForm.subject}
                    onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Email subject..."
                    maxLength={200}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Message body */}
                <div>
                  <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 700, marginBottom: '6px' }}>Message</label>
                  <textarea
                    className="form-textarea"
                    value={emailForm.body}
                    onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))}
                    placeholder="Type your message to the customer..."
                    maxLength={2000}
                    style={{ width: '100%', minHeight: '140px', resize: 'vertical' }}
                  />
                  <div style={{ fontSize: '.72rem', color: 'var(--gray-1)', textAlign: 'right', marginTop: '4px' }}>{emailForm.body.length}/2000</div>
                </div>

                {/* Actions */}
                <div className="email-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'center', paddingTop: '4px' }}>
                  <button className="btn btn-outline" onClick={() => setEmailModal(null)} disabled={emailSending}>Cancel</button>
                  <button
                    className="btn btn-primary"
                     style={{ margin: 0 }}
                    onClick={handleSendEmail}
                    disabled={emailSending || !emailForm.subject.trim() || !emailForm.body.trim()}
                  >
                    {emailSending
                      ? <><i className="fas fa-spinner fa-spin"></i> Sending...</>
                      : <><i className="fas fa-paper-plane"></i> Send Email</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
}

AdminOrders.getLayout = function getLayout(page) {
  return (
    <AdminGuard>
      <AdminLayout title="Orders">{page}</AdminLayout>
    </AdminGuard>
  );
};


