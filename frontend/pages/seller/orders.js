import { useEffect, useRef, useState } from 'react';
import Layout from '@/components/Layout';
import SellerGuard from '@/components/SellerGuard';
import Link from 'next/link';
import { apiFetch } from '../../lib/apiClient';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '../../lib/supabaseClient';
import { orderStatusLabel } from '../../lib/orderStatus';
import { formatOptionValue } from '../../lib/colorName';

const STATUS_STYLE = {
  pending: { bg: '#fef3c7', color: '#92400e' },
  paid: { bg: '#dcfce7', color: '#15803d' },
  processing: { bg: '#dbeafe', color: '#1e40af' },
  shipped: { bg: '#ede9fe', color: '#5b21b6' },
  delivered: { bg: '#dcfce7', color: '#15803d' },
  cancelled: { bg: '#fee2e2', color: '#b91c1c' },
};

export default function SellerOrders() {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [savingItemId, setSavingItemId] = useState(null);
  const [itemStatuses, setItemStatuses] = useState({});
  // Tracks the last known server fulfillment status per item so background
  // polls can refresh values without clobbering edits the seller hasn't saved.
  const serverStatusRef = useRef({});

  const loadOrders = async ({ silent = false } = {}) => {
    try {
      const res = await apiFetch('/api/seller/orders');
      const json = await res.json();
      if (json.success) {
        const rows = json.data || [];
        setOrders(rows);
        const serverMap = {};
        rows.forEach((order) => {
          (order.items || []).forEach((item) => {
            serverMap[item.id] = item.fulfillmentStatus || 'pending';
          });
        });
        setItemStatuses((prev) => {
          const next = { ...prev };
          Object.entries(serverMap).forEach(([id, srv]) => {
            const prevServer = serverStatusRef.current[id];
            const localUnsaved = prev[id] !== undefined && prev[id] !== prevServer;
            // Only overwrite the dropdown when the seller has no unsaved edit.
            if (!localUnsaved) next[id] = srv;
          });
          return next;
        });
        serverStatusRef.current = serverMap;
        if (error) setError('');
      } else if (!silent) setError(json.error || 'Could not load orders');
    } catch {
      if (!silent) setError('Network error loading orders');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // Supabase real-time: re-fetch when any order or order_item changes.
    const channel = supabase
      .channel('seller-orders-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders({ silent: true });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        loadOrders({ silent: true });
      })
      .subscribe();
    // Fallback poll every 30s in case real-time is unavailable.
    const id = setInterval(() => loadOrders({ silent: true }), 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveItemStatus = async (itemId) => {
    const fulfillmentStatus = itemStatuses[itemId];
    if (!fulfillmentStatus) return;
    setSavingItemId(itemId);
    try {
      const res = await apiFetch(`/api/seller/order-items/${itemId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ fulfillmentStatus }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to update item status');

      // Mark as the new server baseline so background polls don't treat it as unsaved.
      serverStatusRef.current = { ...serverStatusRef.current, [itemId]: fulfillmentStatus };
      setOrders((prev) =>
        prev.map((order) => ({
          ...order,
          items: (order.items || []).map((it) =>
            it.id === itemId ? { ...it, fulfillmentStatus } : it
          ),
        }))
      );
    } catch (e) {
      setError(e.message || 'Failed to update item status');
    } finally {
      setSavingItemId(null);
    }
  };

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);
  const statuses = ['all', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

  return (
    <Layout title="My Orders - Hilgod Seller">
      <div style={{ padding: 'var(--space-8) 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            <i className="fas fa-shopping-bag" style={{ color: 'var(--primary)' }}></i> Customer Orders
          </h1>
          <Link href="/seller/dashboard" className="btn btn-outline btn-sm">
            <i className="fas fa-arrow-left"></i> Dashboard
          </Link>
        </div>

        {/* Summary */}
        <div className="seller-metrics-grid" style={{ marginBottom: '20px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--gray-1)', fontSize: '.85rem' }}>Total Orders</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{orders.length}</div>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--gray-1)', fontSize: '.85rem' }}>Your Revenue</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {formatPrice(orders.reduce((s, o) => s + o.sellerTotal, 0), 'NGN', false)}
            </div>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--gray-1)', fontSize: '.85rem' }}>Pending</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {orders.filter((o) => o.status === 'pending' || o.status === 'processing').length}
            </div>
          </div>
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}></i>
            </div>
          ) : error ? (
            <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px' }}>{error}</div>
          ) : !filtered.length ? (
            <p style={{ color: 'var(--gray-1)' }}>
              {filter === 'all' ? 'No orders for your products yet.' : `No ${filter} orders.`}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filtered.map((order) => {
                const { bg, color } = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
                return (
                  <div key={order.id} style={{ border: '1px solid var(--gray-4)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--gray-6)', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '.9rem' }}>#{order.id.slice(0, 8).toUpperCase()}</div>
                        <div style={{ fontSize: '.78rem', color: 'var(--gray-1)' }}>
                          {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '.95rem' }}>{formatPrice(order.sellerTotal, order.currency || 'NGN', false)}</div>
                          <div style={{ fontSize: '.75rem', color: 'var(--gray-1)' }}>{order.buyer.name}</div>
                          {order.buyer.phone && <div style={{ fontSize: '.72rem', color: 'var(--gray-1)' }}>{order.buyer.phone}</div>}
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '.75rem', fontWeight: 700, background: bg, color }}>
                          {orderStatusLabel(order.status, order.paymentMethod)}
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: '12px 16px' }}>
                      {order.items.map((item, i) => (
                        <div key={item.id || i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--gray-4)' : 'none' }}>
                          {item.image ? (
                            <img src={item.image} alt={item.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: '40px', height: '40px', background: 'var(--gray-5)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <i className="fas fa-image" style={{ color: 'var(--gray-2)' }} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                            <div style={{ fontSize: '.78rem', color: 'var(--gray-1)' }}>Qty: {item.quantity} · {formatPrice(Number(item.price), item.currency || 'NGN', false)} each</div>
                            {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                              <div style={{ fontSize: '.74rem', color: 'var(--primary)', marginTop: '2px', textTransform: 'capitalize', fontWeight: 600 }}>
                                {Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${formatOptionValue(k, v)}`).join(' · ')}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <select
                              className="form-input"
                              value={itemStatuses[item.id] || item.fulfillmentStatus || 'pending'}
                              onChange={(e) => setItemStatuses((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              style={{ padding: '4px 8px', fontSize: '.76rem', minWidth: '120px' }}
                            >
                              <option value="pending">pending</option>
                              <option value="packed">packed</option>
                              <option value="shipped">shipped</option>
                              <option value="delivered">delivered</option>
                              <option value="cancelled">cancelled</option>
                            </select>
                            {(itemStatuses[item.id] || item.fulfillmentStatus || 'pending') !== (item.fulfillmentStatus || 'pending') && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => saveItemStatus(item.id)}
                                disabled={savingItemId === item.id}
                                style={{ padding: '4px 10px', fontSize: '.74rem' }}
                              >
                                {savingItemId === item.id ? <i className="fas fa-spinner fa-spin"></i> : 'Save'}
                              </button>
                            )}
                            <div style={{ fontWeight: 700, fontSize: '.9rem', flexShrink: 0 }}>{formatPrice(item.price * item.quantity, item.currency || 'NGN', false)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

SellerOrders.getLayout = function getLayout(page) {
  return <SellerGuard>{page}</SellerGuard>;
};
