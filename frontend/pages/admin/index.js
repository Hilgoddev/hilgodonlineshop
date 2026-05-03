import { useState, useEffect } from 'react';
import { useSession } from '../../contexts/AuthContext';
import Link from 'next/link';
import Layout from '@/components/Layout';
import AdminGuard from '@/components/AdminGuard';

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({ products: 0, orders: 0, customers: 0, revenue: 0, recentOrders: [], lowStock: [], loading: true });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, ordRes, custRes] = await Promise.all([
          fetch('/api/products?limit=100'),
          fetch('/api/orders/all'),
          fetch('/api/admin/customers'),
        ]);
        const prodData = await prodRes.json();
        const ordData = await ordRes.json();
        const custData = await custRes.json();

        const allProducts = prodData.data || [];
        const lowStockProducts = allProducts.filter(p => p.stock < 10 && p.stock !== undefined);

        setStats({
          products: prodData.pagination?.total || allProducts.length,
          orders: ordData.pagination?.total || 0,
          customers: custData.pagination?.total || 0,
          revenue: ordData.totalRevenue || 0,
          recentOrders: (ordData.data || []).slice(0, 10),
          lowStock: lowStockProducts.slice(0, 5),
          loading: false,
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };
    fetchData();
  }, []);

  const getStatusBadge = (status) => {
    const map = { pending: { bg: '#fef3c7', color: '#d97706' }, processing: { bg: '#dbeafe', color: '#2563eb' }, shipped: { bg: '#ede9fe', color: '#7c3aed' }, delivered: { bg: '#dcfce7', color: '#16a34a' }, cancelled: { bg: '#fee2e2', color: '#ef4444' } };
    const s = map[status] || map.pending;
    return { padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', background: s.bg, color: s.color, textTransform: 'capitalize' };
  };

  const getPayBadge = (ps) => {
    const map = { paid: { bg: '#dcfce7', color: '#16a34a' }, pending: { bg: '#fef3c7', color: '#d97706' }, failed: { bg: '#fee2e2', color: '#ef4444' } };
    const s = map[ps] || map.pending;
    return { padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', background: s.bg, color: s.color, textTransform: 'capitalize' };
  };

  return (
    <Layout title="Admin Dashboard — Hilgod Online Store">
      <div style={{ padding: 'var(--space-8) 0', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}><i className="fas fa-tachometer-alt" style={{ color: 'var(--primary)' }}></i> Admin Dashboard</h1>
            <p style={{ color: 'var(--gray-1)' }}>Welcome back, <strong>{session?.user?.firstName || 'Admin'}</strong>!</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/admin/products" className="btn btn-outline"><i className="fas fa-plus"></i> Add Product</Link>
            <Link href="/admin/orders" className="btn btn-primary"><i className="fas fa-shopping-cart"></i> View Orders</Link>
            <Link href="/admin/customers" className="btn btn-outline"><i className="fas fa-users"></i> Customers</Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          {[
            { icon: 'fa-box', label: 'Total Products', value: stats.products, bg: 'var(--primary-light)', clr: 'var(--primary)' },
            { icon: 'fa-shopping-bag', label: 'Total Orders', value: stats.orders, bg: '#dcfce7', clr: '#16a34a' },
            { icon: 'fa-users', label: 'Customers', value: stats.customers, bg: '#fef3c7', clr: '#d97706' },
            { icon: 'fa-naira-sign', label: 'Revenue', value: `₦${stats.revenue.toLocaleString()}`, bg: '#ede9fe', clr: '#7c3aed' },
          ].map((card, i) => (
            <div key={i} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: card.bg, color: card.clr, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                <i className={`fas ${card.icon}`}></i>
              </div>
              <div>
                <p style={{ color: 'var(--gray-1)', fontSize: '.82rem', fontWeight: '600', marginBottom: '2px' }}>{card.label}</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>
                  {stats.loading ? <i className="fas fa-spinner fa-spin" style={{ fontSize: '1rem' }}></i> : card.value}
                </h3>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-6)', alignItems: 'start' }}>
          {/* Recent Orders */}
          <div className="card" style={{ padding: 'var(--space-5)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontWeight: '700', fontSize: '1.1rem' }}><i className="fas fa-clock-rotate-left" style={{ color: 'var(--primary)' }}></i> Recent Orders</h3>
              <Link href="/admin/orders" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>View All →</Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-5)', color: 'var(--gray-1)', fontSize: '0.82rem' }}>
                    <th style={{ padding: '10px 12px', borderRadius: '6px 0 0 6px' }}>Order</th>
                    <th style={{ padding: '10px 12px' }}>Customer</th>
                    <th style={{ padding: '10px 12px' }}>Amount</th>
                    <th style={{ padding: '10px 12px' }}>Payment</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px', borderRadius: '0 6px 6px 0' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.loading ? (
                    <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}></i></td></tr>
                  ) : stats.recentOrders.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'var(--gray-1)' }}>No orders yet.</td></tr>
                  ) : stats.recentOrders.map((order) => (
                    <tr key={order._id} style={{ borderBottom: '1px solid var(--gray-4)' }}>
                      <td style={{ padding: '12px' }}><Link href="/admin/orders" style={{ fontWeight: '700', color: 'var(--primary)', textDecoration: 'none', fontSize: '.82rem' }}>#{order._id.slice(-6).toUpperCase()}</Link></td>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{order.user?.firstName || 'N/A'} {order.user?.lastName || ''}</td>
                      <td style={{ padding: '12px', fontWeight: '700' }}>₦{order.totalAmount?.toLocaleString()}</td>
                      <td style={{ padding: '12px' }}><span style={getPayBadge(order.paymentStatus)}>{order.paymentStatus || 'pending'}</span></td>
                      <td style={{ padding: '12px' }}><span style={getStatusBadge(order.status)}>{order.status || 'pending'}</span></td>
                      <td style={{ padding: '12px', fontSize: '.8rem', color: 'var(--gray-1)' }}>{new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar: Low Stock + Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="card" style={{ padding: 'var(--space-5)' }}>
              <h3 style={{ fontWeight: '700', fontSize: '1.05rem', marginBottom: '12px' }}><i className="fas fa-triangle-exclamation" style={{ color: '#f59e0b' }}></i> Low Stock Alert</h3>
              {stats.loading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}><i className="fas fa-spinner fa-spin"></i></div>
              ) : stats.lowStock.length === 0 ? (
                <p style={{ color: 'var(--gray-1)', fontSize: '.88rem' }}>All products have healthy stock levels.</p>
              ) : stats.lowStock.map(p => (
                <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--gray-4)', fontSize: '.88rem' }}>
                  <span style={{ fontWeight: '600', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <span style={{ color: p.stock <= 3 ? '#ef4444' : '#f59e0b', fontWeight: '700', marginLeft: '8px', whiteSpace: 'nowrap' }}>{p.stock} left</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 'var(--space-5)' }}>
              <h3 style={{ fontWeight: '700', fontSize: '1.05rem', marginBottom: '12px' }}><i className="fas fa-bolt" style={{ color: 'var(--primary)' }}></i> Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link href="/admin/products" className="btn btn-primary" style={{ textAlign: 'center', fontSize: '.88rem' }}><i className="fas fa-plus"></i> Add New Product</Link>
                <Link href="/admin/orders" className="btn btn-outline" style={{ textAlign: 'center', fontSize: '.88rem' }}><i className="fas fa-list"></i> View All Orders</Link>
                <Link href="/admin/customers" className="btn btn-outline" style={{ textAlign: 'center', fontSize: '.88rem' }}><i className="fas fa-users"></i> View Customers</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

AdminDashboard.getLayout = function getLayout(page) {
  return <AdminGuard>{page}</AdminGuard>;
};