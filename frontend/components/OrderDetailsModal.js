import { useEffect } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=60&q=80&auto=format';

export default function OrderDetailsModal({ order, isOpen, onClose }) {
  const { formatPrice } = useCurrency();

  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const custName = order.user?.firstName ? `${order.user.firstName} ${order.user.lastName}`.trim() : 'Guest';
  const custEmail = order.user?.email || 'N/A';
  const addr = order.deliveryAddress;
  const orderCurrency = order.currency || 'NGN';
  const orderId = `#${String(order._id || order.id).slice(-8).toUpperCase()}`;
  const PAYMENT_LABELS = { paystack: 'Paystack', stripe: 'Stripe', bank_transfer: 'Bank Transfer', pod: 'Pay on Delivery', opay: 'OPay', card: 'Card' };
  const paymentLabel = order.paymentMethod ? (PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod) : 'Unknown';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Order ${orderId} details`}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '640px',
          maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: '1px solid var(--gray-4)',
          position: 'sticky', top: 0, background: '#fff', borderRadius: '16px 16px 0 0', zIndex: 1,
        }}>
          <h3 style={{ fontWeight: '800', fontSize: '1.05rem', margin: 0 }}>Order {orderId}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--gray-1)', padding: '4px 8px' }}
          >
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '18px' }}>
            <div>
              <div style={{ fontSize: '.75rem', textTransform: 'uppercase', color: 'var(--gray-1)', fontWeight: '700', letterSpacing: '.5px', marginBottom: '4px' }}>Customer</div>
              <div style={{ fontWeight: '600' }}>{custName}</div>
              <div style={{ fontSize: '.85rem', color: 'var(--gray-1)' }}>{custEmail}</div>
              {order.user?.phone && <div style={{ fontSize: '.85rem', color: 'var(--gray-1)' }}><i className="fas fa-phone" style={{ fontSize: '.7rem', marginRight: 4 }}></i>{order.user.phone}</div>}
              <div style={{ fontSize: '.85rem', color: 'var(--gray-1)', marginTop: '4px' }}>
                <i className="fas fa-credit-card" style={{ fontSize: '.7rem', marginRight: 4 }}></i>Payment: <strong style={{ color: 'var(--dark)' }}>{paymentLabel}</strong>
              </div>
            </div>
            {addr && (
              <div>
                <div style={{ fontSize: '.75rem', textTransform: 'uppercase', color: 'var(--gray-1)', fontWeight: '700', letterSpacing: '.5px', marginBottom: '4px' }}>Delivery</div>
                <div style={{ fontSize: '.85rem', color: 'var(--gray-1)' }}>
                  {[addr.street, addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean).join(', ')}
                  {addr.phone && <><br />Phone: {addr.phone}</>}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong>Items ({order.items?.length || 0})</strong>
            <strong>{formatPrice(order.totalAmount || 0, orderCurrency, false)}</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {order.items?.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px', background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--gray-4)' }}>
                <img
                  src={item.image || FALLBACK_IMG}
                  alt=""
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                  onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600' }}>{item.name}</div>
                  <div style={{ fontSize: '.85rem', color: 'var(--gray-1)' }}>
                    Qty: {item.quantity} · {formatPrice(item.price || 0, item.currency || orderCurrency, false)}
                  </div>
                  {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                    <div style={{ fontSize: '.78rem', color: '#475569', marginTop: '2px', textTransform: 'capitalize' }}>
                      {Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </div>
                  )}
                  {item.fulfillmentStatus && (
                    <div style={{ fontSize: '.75rem', color: '#475569', textTransform: 'capitalize' }}>
                      Item status: {item.fulfillmentStatus}
                    </div>
                  )}
                  {item.seller && (
                    <div style={{ fontSize: '.78rem', color: 'var(--gray-1)', marginTop: '4px', borderTop: '1px dashed var(--gray-4)', paddingTop: '4px' }}>
                      <div style={{ color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fas fa-store" style={{ fontSize: '.65rem' }}></i>
                        {item.seller.storeName || item.seller.name}
                      </div>
                      {item.seller.phone && <div><i className="fas fa-phone" style={{ fontSize: '.65rem', marginRight: '4px' }}></i>{item.seller.phone}</div>}
                      {item.seller.email && <div><i className="fas fa-envelope" style={{ fontSize: '.65rem', marginRight: '4px' }}></i>{item.seller.email}</div>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
