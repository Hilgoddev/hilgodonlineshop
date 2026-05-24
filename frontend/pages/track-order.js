import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { apiFetch } from '@/lib/apiClient';
import { useSession } from '@/contexts/AuthContext';

export default function TrackOrder() {
  const router = useRouter();
  const [orderId, setOrderId] = useState('');
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { status } = useSession();

  const trackOrder = async (idToTrack = orderId) => {
    const targetId = (idToTrack || '').trim().replace(/^HGD-/i, '');
    if (!targetId) {
      setError('Please enter an order ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (status === 'authenticated') {
        const res = await apiFetch(`/api/orders/${targetId}`);
        const data = await res.json();
        if (data.success) {
          setOrderData(data.data);
        } else {
          setError('Order not found. Please check the order ID and try again.');
          setOrderData(null);
        }
      } else {
        setError('Please log in to track your order, or check your confirmation email for updates.');
        setOrderData(null);
      }
    } catch (err) {
      console.error('Error tracking order:', err);
      setError('An error occurred while tracking your order. Please try again.');
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (router.isReady && router.query.id && status !== 'loading') {
      const urlId = String(router.query.id);
      setOrderId(urlId);
      trackOrder(urlId);
    }
  }, [router.isReady, router.query.id, status]);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'var(--warning)',
      confirmed: 'var(--info)',
      shipped: 'var(--primary)',
      delivered: 'var(--success)',
      cancelled: 'var(--danger)'
    };
    return colors[status] || 'var(--gray-1)';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout 
      title="Track Your Order — Hilgod Online Store"
      description="Track your Hilgod order in real-time. Enter your order ID to see delivery status."
    >
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">Track Order</span>
      </nav>
      
      <div className="track-page" style={{ padding: 'var(--space-8) 0' }}>
        <div className="track-input-card">
          <i className="fas fa-location-dot" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: 'var(--space-4)' }}></i>
          <h2>Track Your Order</h2>
          <p>Enter your order ID to see real-time delivery status and estimated arrival.</p>
          <div className="track-input-wrap">
            <input 
              type="text" 
              className="track-input" 
              id="track-input" 
              placeholder="e.g. HGD-20248821" 
              autoComplete="off"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && trackOrder()}
            />
            <button 
              className="track-btn" 
              onClick={trackOrder}
              disabled={loading}
            >
              {loading ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-search"></i>
              )}{' '}
              Track
            </button>
          </div>
          {error && (
            <div style={{
              color: status !== 'authenticated' ? 'var(--info)' : 'var(--danger)',
              fontSize: '.85rem',
              marginTop: '10px',
              padding: '10px 14px',
              background: status !== 'authenticated' ? 'var(--info-light)' : 'var(--danger-light)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
              <i className={`fas ${status !== 'authenticated' ? 'fa-circle-info' : 'fa-circle-exclamation'}`}></i>
              <span>{error}</span>
              {status !== 'authenticated' && (
                <Link href="/auth/login?redirect=/track-order" style={{ fontWeight: 700, color: 'var(--primary)', marginLeft: '4px' }}>
                  Log in →
                </Link>
              )}
            </div>
          )}
          <p style={{ fontSize: '.78rem', color: 'var(--gray-2)', marginTop: '10px' }}>
            Your order ID can be found in your confirmation email or{' '}
            <Link href="/account" style={{ color: 'var(--primary)' }}>account dashboard</Link>.
          </p>
        </div>

        {/* Result */}
        {orderData && (
          <div className="track-result" id="track-result">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: '12px', 
              marginBottom: 'var(--space-6)' 
            }}>
              <div>
                <div style={{ fontSize: '.82rem', color: 'var(--gray-1)' }}>Order ID</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700' }} id="tracked-order-id">
                  HGD-{orderData._id.substring(0, 8)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '.82rem', color: 'var(--gray-1)' }}>Estimated Delivery</div>
                <div style={{ fontWeight: '600', color: 'var(--success)' }}>
                  {orderData.status === 'delivered'
                    ? formatDate(orderData.updatedAt || orderData.createdAt)
                    : formatDate(new Date(new Date(orderData.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000))}
                </div>
              </div>
              <span 
                className={`order-status status-${orderData.status}`}
                style={{ 
                  padding: '6px 16px', 
                  borderRadius: 'var(--radius-full)', 
                  fontSize: '.85rem', 
                  fontWeight: '700',
                  backgroundColor: `${getStatusColor(orderData.status)}20`,
                  color: getStatusColor(orderData.status)
                }}
              >
                {orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1)}
              </span>
            </div>

            <div style={{ 
              background: 'var(--info-light)', 
              borderRadius: 'var(--radius)', 
              padding: 'var(--space-3) var(--space-4)', 
              display: 'flex', 
              gap: '10px', 
              alignItems: 'center', 
              marginBottom: 'var(--space-6)', 
              fontSize: '.88rem', 
              color: 'var(--info)' 
            }}>
              <i className="fas fa-circle-info"></i>
              <span>
                Your package is with our delivery partner and on its way to you. Call <strong>+234 800 HILGOD</strong> for assistance.
              </span>
            </div>

            {/* Progress Steps */}
            <div className="order-progress" style={{ flexDirection: 'column' }}>
              <div className="progress-step done">
                <div className="progress-icon">
                  <i className="fas fa-check"></i>
                </div>
                <div className="progress-text">
                  <h4>Order Placed</h4>
                  <p>Your order was confirmed and payment received.</p>
                  <div className="time">{formatDate(orderData.createdAt)}</div>
                </div>
              </div>
              
              <div className={`progress-step ${['confirmed', 'shipped', 'delivered'].includes(orderData.status) ? 'done' : 'current'}`}>
                <div className="progress-icon">
                  {orderData.status === 'confirmed' || orderData.status === 'shipped' || orderData.status === 'delivered' ? (
                    <i className="fas fa-check"></i>
                  ) : (
                    <i className="fas fa-check"></i>
                  )}
                </div>
                <div className="progress-text">
                  <h4>Order Confirmed</h4>
                  <p>Seller has confirmed and is preparing your item.</p>
                  <div className="time">
                    {orderData.status !== 'pending' ? formatDate(new Date(orderData.createdAt)) : 'Pending'}
                  </div>
                </div>
              </div>
              
              <div className={`progress-step ${orderData.status === 'shipped' || orderData.status === 'delivered' ? 'done' : orderData.status === 'confirmed' ? 'current' : ''}`}>
                <div className="progress-icon">
                  {orderData.status === 'shipped' || orderData.status === 'delivered' ? (
                    <i className="fas fa-check"></i>
                  ) : (
                    <i className="fas fa-truck"></i>
                  )}
                </div>
                <div className="progress-text">
                  <h4>Dispatched from Warehouse</h4>
                  <p>Order left our fulfillment center.</p>
                  <div className="time">
                    {orderData.status === 'shipped' || orderData.status === 'delivered' ?
                      formatDate(new Date(orderData.updatedAt || orderData.createdAt)) :
                      'Pending'
                    }
                  </div>
                </div>
              </div>
              
              <div className={`progress-step ${orderData.status === 'shipped' ? 'current' : orderData.status === 'delivered' ? 'done' : ''}`}>
                <div className="progress-icon">
                  {orderData.status === 'delivered' ? (
                    <i className="fas fa-check"></i>
                  ) : (
                    <i className="fas fa-motorcycle"></i>
                  )}
                </div>
                <div className="progress-text">
                  <h4>Out for Delivery</h4>
                  <p>Your rider is on the way to your address.</p>
                  <div className="time">
                    {orderData.status === 'shipped' || orderData.status === 'delivered' ? 
                      formatDate(new Date()) : 
                      'Pending'
                    }
                  </div>
                </div>
              </div>
              
              <div className={`progress-step ${orderData.status === 'delivered' ? 'done' : ''}`}>
                <div className="progress-icon">
                  <i className="fas fa-house"></i>
                </div>
                <div className="progress-text">
                  <h4>Delivered</h4>
                  <p>Your delivery will arrive soon.</p>
                </div>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: 'var(--space-3)', 
              marginTop: 'var(--space-6)', 
              flexWrap: 'wrap' 
            }}>
              <button
                className="btn btn-outline"
                disabled={orderData.status !== 'shipped'}
                title={orderData.status !== 'shipped' ? 'Available once your order is dispatched' : 'Call your rider'}
              >
                <i className="fas fa-phone"></i> Contact Rider
              </button>
              <Link href="/account" className="btn btn-outline">
                <i className="fas fa-headset"></i> Get Help
              </Link>
              <Link href="/account" className="btn btn-primary">
                <i className="fas fa-box"></i> All Orders
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}