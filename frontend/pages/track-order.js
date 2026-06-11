import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';
import { apiFetch, safeJson } from '../lib/apiClient';
import { useCurrency } from '@/contexts/CurrencyContext';
import { orderStatusLabel } from '../lib/orderStatus';
import { formatOptionValue } from '../lib/colorName';

// Online-payment timeline (payment happens before shipment).
const STEPS = [
  { key: 'pending', label: 'Placed', icon: 'fa-receipt' },
  { key: 'paid', label: 'Paid', icon: 'fa-credit-card' },
  { key: 'processing', label: 'Preparing', icon: 'fa-box' },
  { key: 'shipped', label: 'Shipped', icon: 'fa-truck' },
  { key: 'delivered', label: 'Delivered', icon: 'fa-circle-check' },
];
const STEP_INDEX = { pending: 0, paid: 1, processing: 2, shipped: 3, delivered: 4 };

// Pay-on-Delivery timeline — no pre-paid step; cash is collected AT delivery.
const STEPS_POD = [
  { key: 'pending', label: 'Placed', icon: 'fa-receipt' },
  { key: 'processing', label: 'Preparing', icon: 'fa-box' },
  { key: 'shipped', label: 'Out for delivery', icon: 'fa-truck' },
  { key: 'delivered', label: 'Delivered & paid', icon: 'fa-money-bill-wave' },
];
const STEP_INDEX_POD = { pending: 0, paid: 1, processing: 1, shipped: 2, delivered: 3 };

function StatusTimeline({ status, pod }) {
  if (status === 'cancelled') {
    return (
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '10px', padding: '12px 16px', fontWeight: 600, fontSize: '.9rem' }}>
        <i className="fas fa-circle-xmark" style={{ marginRight: '8px' }} />This order was cancelled.
      </div>
    );
  }
  const STEP_LIST = pod ? STEPS_POD : STEPS;
  const current = (pod ? STEP_INDEX_POD : STEP_INDEX)[status] ?? 0;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', overflowX: 'auto', padding: '4px 0' }}>
      {STEP_LIST.map((s, i) => {
        const done = i <= current;
        return (
          <div key={s.key} style={{ flex: 1, minWidth: '64px', textAlign: 'center', position: 'relative' }}>
            {i > 0 && (
              <div style={{ position: 'absolute', top: '15px', left: 'calc(-50% + 16px)', right: 'calc(50% + 16px)', height: '3px', background: i <= current ? 'var(--primary)' : 'var(--gray-4)' }} />
            )}
            <div style={{
              position: 'relative', width: '32px', height: '32px', borderRadius: '50%', margin: '0 auto 6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? 'var(--primary)' : 'var(--gray-5)', color: done ? '#fff' : 'var(--gray-2)',
            }}>
              <i className={`fas ${s.icon}`} style={{ fontSize: '.8rem' }} />
            </div>
            <div style={{ fontSize: '.72rem', fontWeight: i === current ? 800 : 500, color: done ? 'var(--dark)' : 'var(--gray-2)' }}>{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function TrackOrderPage() {
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/orders');
        const json = await safeJson(res);
        if (!cancelled) {
          if (json?.success) setOrders(json.data || []);
          else setError(json?.message || json?.error || 'Could not load your orders.');
        }
      } catch {
        if (!cancelled) setError('Could not load your orders.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Optionally focus a specific order passed from checkout (?order=<id>).
  const focusId = router.query.order;
  const sorted = [...orders].sort((a, b) => {
    if (focusId) {
      if ((a._id || a.id) === focusId) return -1;
      if ((b._id || b.id) === focusId) return 1;
    }
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  return (
    <Layout title="Track Order — Hilgod" description="Track the status of your Hilgod orders.">
      <div style={{ padding: 'var(--space-6) 0', maxWidth: '820px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
          <i className="fas fa-location-dot" style={{ color: 'var(--primary)', marginRight: '8px' }} />Track Your Orders
        </h1>
        <p style={{ color: 'var(--gray-1)', marginBottom: 'var(--space-5)', fontSize: '.9rem' }}>Live status of every order on your account.</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '1.8rem', color: 'var(--primary)' }} /></div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>{error}</div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-1)' }}>
            <i className="fas fa-box-open" style={{ fontSize: '2rem', marginBottom: '12px', display: 'block' }} />
            <p>You have no orders yet.</p>
            <Link href="/products" className="btn btn-primary" style={{ marginTop: '16px' }}>Start shopping</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {sorted.map((o) => {
              const id = o._id || o.id;
              const highlight = focusId && id === focusId;
              const pod = (o.paymentMethod || '').toLowerCase() === 'pod';
              // For POD, "pending" means placed (not awaiting online payment).
              const statusLabel = pod && o.status === 'pending' ? 'Order placed' : orderStatusLabel(o.status);
              return (
                <div key={id} className="card" style={{ padding: '18px 20px', border: highlight ? '2px solid var(--primary)' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>Order #{String(id).slice(0, 8).toUpperCase()}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--gray-1)' }}>
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} · {o.items?.length || 0} item{(o.items?.length || 0) === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800 }}>{formatPrice(o.totalAmount || 0, o.currency || 'NGN', false)}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--primary)', fontWeight: 700 }}>{statusLabel}</div>
                    </div>
                  </div>

                  {pod && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', borderRadius: '8px', padding: '6px 10px', fontSize: '.78rem', fontWeight: 700, marginBottom: '12px' }}>
                      <i className="fas fa-money-bill-wave" />
                      {o.status === 'delivered' ? 'Paid on delivery' : 'Pay cash on delivery'}
                    </div>
                  )}

                  <StatusTimeline status={o.status} pod={pod} />

                  <div style={{ marginTop: '14px', borderTop: '1px solid var(--gray-5)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(o.items || []).map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '.85rem' }}>
                        <img src={it.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=60&q=60'} alt={it.name} style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=60&q=60'; }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{it.name}</div>
                          <div style={{ color: 'var(--gray-1)', fontSize: '.78rem' }}>
                            Qty: {it.quantity}
                            {it.selectedOptions && Object.keys(it.selectedOptions).length > 0 && (
                              <> · {Object.entries(it.selectedOptions).map(([k, v]) => `${k}: ${formatOptionValue(k, v)}`).join(' · ')}</>
                            )}
                          </div>
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
    </Layout>
  );
}

TrackOrderPage.getLayout = function getLayout(page) {
  return <AuthGuard>{page}</AuthGuard>;
};

export default TrackOrderPage;
