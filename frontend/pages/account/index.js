import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { signOut, useSession } from '../../contexts/AuthContext';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';
import { apiFetch } from '../../lib/apiClient';
import ConfirmModal from '@/components/ConfirmModal';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '../../lib/supabaseClient';

export default function Account() {
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState('overview');
  const [modal, setModal] = useState({ open: false });
  const closeModal = () => setModal(m => ({ ...m, open: false }));
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ firstName: '', lastName: '', image: '' });
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });
  const [passSaving, setPassSaving] = useState(false);
  const [passStrength, setPassStrength] = useState(0);

  const [expandedOrder, setExpandedOrder] = useState(null);
  const toggleOrder = useCallback((id) => setExpandedOrder(prev => prev === id ? null : id), []);

  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session?.user?.id) return;
    const redirectByAuthoritativeRole = async () => {
      try {
        const meRes = await apiFetch('/api/auth/me');
        const meData = await meRes.json();
        const role = meData?.data?.role || session?.user?.role;
        if (role === 'admin') { router.replace('/admin/orders'); return; }
        if (role === 'seller') { router.replace('/seller/orders'); }
      } catch (_) {
        const fallbackRole = session?.user?.role;
        if (fallbackRole === 'admin') { router.replace('/admin/orders'); return; }
        if (fallbackRole === 'seller') { router.replace('/seller/orders'); }
      }
    };
    redirectByAuthoritativeRole();
  }, [session?.user?.id, session?.user?.role, router]);

  const fetchUserData = async () => {
    try {
      if (session?.user?.id) {
        const userRes = await apiFetch('/api/user/profile');
        const userData = await userRes.json();
        if (userData.success) {
          setUser(userData.data);
          setProfileData({ firstName: userData.data.firstName || '', lastName: userData.data.lastName || '', image: userData.data.image || '' });
        }
      }
      const ordersRes = await apiFetch('/api/orders');
      const ordersData = await ordersRes.json();
      if (ordersData.success) setOrders(ordersData.data || []);
      const wishlistRes = await apiFetch('/api/wishlist');
      const wishlistData = await wishlistRes.json();
      if (wishlistData.success) setWishlist((wishlistData.data || []).slice(0, 4));
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh orders data (for live status updates)
  const refreshOrders = async () => {
    try {
      const ordersRes = await apiFetch('/api/orders');
      const ordersData = await ordersRes.json();
      if (ordersData.success) {
        setOrders(ordersData.data || []);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error refreshing orders:', error);
    }
  };

  useEffect(() => { if (session) fetchUserData(); }, [session]);
  useEffect(() => { if (router.query.tab) setActiveTab(router.query.tab); }, [router.query.tab]);

  // Real-time order status updates: subscribe when on orders tab, fall back to 30s poll.
  useEffect(() => {
    if (activeTab !== 'orders' || !session) return;
    refreshOrders();
    const channel = supabase
      .channel('customer-orders-watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        refreshOrders();
      })
      .subscribe();
    const intervalId = setInterval(refreshOrders, 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [activeTab, session]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const res = await apiFetch('/api/user/profile', { method: 'PUT', body: JSON.stringify(profileData) });
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => setIsEditingProfile(false), 2000);
      } else {
        setProfileMsg({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch { setProfileMsg({ type: 'error', text: 'Network error occurred' }); }
    finally { setProfileSaving(false); }
  };

  const calculatePasswordStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    setPassStrength(score);
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) {
      setPassMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    setPassSaving(true);
    setPassMsg({ type: '', text: '' });
    try {
      const res = await apiFetch('/api/user/password', { method: 'PUT', body: JSON.stringify({ currentPassword: passData.currentPassword, newPassword: passData.newPassword }) });
      const data = await res.json();
      if (data.success) {
        setPassMsg({ type: 'success', text: 'Password updated successfully!' });
        setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPassStrength(0);
      } else {
        setPassMsg({ type: 'error', text: data.error || 'Failed to update password' });
      }
    } catch { setPassMsg({ type: 'error', text: 'Network error occurred' }); }
    finally { setPassSaving(false); }
  };

  const removeWishlistItem = async (id) => {
    try {
      const res = await apiFetch(`/api/wishlist?productId=${id}`, { method: 'DELETE' });
      if (res.ok) setWishlist(wishlist.filter(item => item._id !== id));
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <Layout title="My Account">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
        </div>
      </Layout>
    );
  }

  const getInitials = () => {
    if (!user) return 'U';
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  const strengthColors = ['var(--gray-4)', 'var(--danger)', 'var(--warning)', 'var(--success)', 'var(--info)'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  const accountStats = {
    totalOrders: orders.length,
    totalSpent: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
    wishlistItems: wishlist.length,
    memberSince: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'
  };

  const tabStyle = (tab) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '12px 16px', borderRadius: 'var(--radius)', border: 'none',
    background: activeTab === tab ? 'var(--primary-xlight)' : 'transparent',
    color: activeTab === tab ? 'var(--primary)' : 'var(--dark)',
    fontWeight: activeTab === tab ? 700 : 500, fontSize: '.9rem',
    cursor: 'pointer', textAlign: 'left', flexShrink: 0,
    transition: 'all var(--transition)', position: 'relative',
  });

  const msgBox = (msg) => msg.text ? (
    <div style={{
      padding: '12px 16px', borderRadius: 'var(--radius)', marginBottom: '16px', fontSize: '.88rem', fontWeight: 600,
      background: msg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
      color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)',
      border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
    }}>
      <i className={`fas ${msg.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: '8px' }}></i>
      {msg.text}
    </div>
  ) : null;

  return (
    <>
    <Layout title="My Account — Hilgod">
      <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
        <nav className="breadcrumb" style={{ marginBottom: 'var(--space-6)' }}>
          <Link href="/">Home</Link>
          <i className="fas fa-chevron-right sep"></i>
          <span className="current">My Account</span>
        </nav>

        <div className="acct-layout">

          {/* SIDEBAR */}
          <div className="card acct-sidebar" style={{ padding: '20px' }}>
            {user && (
              <div className="acct-sidebar-user" style={{ textAlign: 'center', padding: '20px 0 16px', borderBottom: '1px solid var(--gray-4)', marginBottom: '12px' }}>
                {user.image ? (
                  <img src={user.image} alt="Profile" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 10px', display: 'block', border: '3px solid var(--primary-xlight)' }} />
                ) : (
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: '#fff', fontWeight: 800, fontSize: '1.4rem' }}>
                    {getInitials()}
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{user.firstName} {user.lastName}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--gray-1)', marginTop: '3px' }}>{user.email}</div>
              </div>
            )}
            <nav className="acct-nav">
              {[
                { tab: 'overview', icon: 'fa-th-large', label: 'Overview' },
                { tab: 'profile', icon: 'fa-user', label: 'Profile' },
                { tab: 'orders', icon: 'fa-box', label: 'Orders', count: orders.length },
                { tab: 'wishlist', icon: 'fa-heart', label: 'Wishlist', count: wishlist.length },
                { tab: 'settings', icon: 'fa-cog', label: 'Settings' },
              ].map(({ tab, icon, label, count }) => (
                <button key={tab} style={tabStyle(tab)} onClick={() => setActiveTab(tab)}>
                  <i className={`fas ${icon}`} style={{ width: '18px', textAlign: 'center' }}></i>
                  {label}
                  {count > 0 && (
                    <span style={{ marginLeft: 'auto', background: 'var(--primary)', color: '#fff', borderRadius: '999px', fontSize: '.7rem', fontWeight: 700, padding: '2px 7px', minWidth: '20px', textAlign: 'center' }}>{count}</span>
                  )}
                </button>
              ))}
              <div className="acct-nav-sep">
                <button
                  style={{ ...tabStyle('logout'), color: 'var(--danger)' }}
                  onClick={async () => { await signOut(); router.replace('/auth/login'); }}
                >
                  <i className="fas fa-sign-out-alt" style={{ width: '18px', textAlign: 'center' }}></i> Sign Out
                </button>
              </div>
            </nav>
          </div>

          {/* MAIN CONTENT */}
          <div>

            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', borderRadius: 'var(--radius-md)', padding: '28px 32px', color: '#fff' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>Welcome back, {user?.firstName}! 👋</h2>
                  <p style={{ opacity: .8, fontSize: '.9rem' }}>Manage your orders, wishlist, and account settings here.</p>
                </div>

                <div className="acct-stats-grid">
                  {[
                    { icon: 'fa-box', label: 'Total Orders', value: accountStats.totalOrders, color: 'var(--info)' },
                    { icon: 'fa-naira-sign', label: 'Total Spent', value: formatPrice(accountStats.totalSpent, 'NGN', false), color: 'var(--success)' },
                    { icon: 'fa-heart', label: 'Wishlist', value: accountStats.wishlistItems, color: 'var(--danger)' },
                  ].map(({ icon, label, value, color }) => (
                    <div key={label} className="card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className={`fas ${icon}`} style={{ color, fontSize: '1.1rem' }}></i>
                        </div>
                        <div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{value}</div>
                          <div style={{ fontSize: '.78rem', color: 'var(--gray-1)', fontWeight: 600 }}>{label}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card" style={{ padding: '20px' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: '16px', fontSize: '1rem' }}>Quick Actions</h3>
                  <div className="acct-quick-grid">
                    {[
                      { href: '/products', icon: 'fa-shopping-bag', label: 'Shop Now', color: 'var(--primary)' },
                      { href: '/account?tab=orders', icon: 'fa-box', label: 'My Orders', color: 'var(--info)' },
                      { href: '/wishlist', icon: 'fa-heart', label: 'Wishlist', color: 'var(--danger)' },
                      { href: '/return-request', icon: 'fa-rotate-left', label: 'Returns', color: 'var(--warning)' },
                    ].map(({ href, icon, label, color }) => (
                      <Link key={label} href={href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-4)', color: 'var(--dark)', textDecoration: 'none', transition: 'all var(--transition)', background: 'var(--gray-6)' }}>
                        <i className={`fas ${icon}`} style={{ fontSize: '1.2rem', color }}></i>
                        <span style={{ fontSize: '.78rem', fontWeight: 600 }}>{label}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {orders.length > 0 && (
                  <div className="card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Recent Orders</h3>
                      <button onClick={() => setActiveTab('orders')} style={{ fontSize: '.82rem', color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>View All</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {orders.slice(0, 3).map(order => (
                        <div key={order._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--gray-6)', borderRadius: 'var(--radius)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-xlight)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="fas fa-box" style={{ color: 'var(--primary)', fontSize: '.85rem' }}></i>
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '.85rem' }}>#HGD-{order._id.substring(order._id.length - 8).toUpperCase()}</div>
                              <div style={{ fontSize: '.75rem', color: 'var(--gray-1)' }}>{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '.88rem' }}>{formatPrice(order.totalAmount || 0, 'NGN', false)}</div>
                            <span style={{ fontSize: '.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', textTransform: 'capitalize', background: order.status === 'delivered' ? '#dcfce7' : order.status === 'shipped' ? '#ede9fe' : '#fef3c7', color: order.status === 'delivered' ? '#15803d' : order.status === 'shipped' ? '#6d28d9' : '#92400e' }}>{order.status || 'pending'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="card" style={{ padding: '20px' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '14px' }}>Account Info</h3>
                  {[
                    { icon: 'fa-envelope', label: 'Email', value: user?.email },
                    { icon: 'fa-calendar', label: 'Member Since', value: accountStats.memberSince },
                    { icon: user?.provider === 'google' ? 'fa-brands fa-google' : 'fa-envelope', label: 'Login Method', value: user?.provider === 'google' ? 'Google' : 'Email' },
                  ].map(({ icon, label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--gray-5)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-1)', fontSize: '.88rem' }}>
                        <i className={`fas ${icon}`} style={{ width: '16px' }}></i> {label}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '.88rem' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PROFILE */}
            {activeTab === 'profile' && (
              <div className="card" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.2rem' }}>Profile Details</h2>
                  {!isEditingProfile && (
                    <button className="btn btn-outline btn-sm" onClick={() => setIsEditingProfile(true)}>
                      <i className="fas fa-edit"></i> Edit
                    </button>
                  )}
                </div>

                {isEditingProfile ? (
                  <form onSubmit={handleProfileUpdate}>
                    {msgBox(profileMsg)}
                    <div className="acct-form-row">
                      <div className="form-group">
                        <label className="form-label">First Name</label>
                        <input className="form-input" type="text" value={profileData.firstName} onChange={e => setProfileData({ ...profileData, firstName: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Last Name</label>
                        <input className="form-input" type="text" value={profileData.lastName} onChange={e => setProfileData({ ...profileData, lastName: e.target.value })} required />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label className="form-label">Profile Picture URL</label>
                      <input className="form-input" type="url" placeholder="https://example.com/photo.jpg" value={profileData.image} onChange={e => setProfileData({ ...profileData, image: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                        {profileSaving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-save"></i> Save Changes</>}
                      </button>
                      <button type="button" className="btn btn-outline" onClick={() => setIsEditingProfile(false)} disabled={profileSaving}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="acct-profile-flex">
                    <div>
                      {user?.image ? (
                        <img src={user.image} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-xlight)' }} />
                      ) : (
                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '2rem' }}>
                          {getInitials()}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '6px' }}>{user?.firstName} {user?.lastName}</h3>
                      <p style={{ color: 'var(--gray-1)', marginBottom: '14px' }}>{user?.email}</p>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '.78rem', fontWeight: 700, background: 'var(--primary-xlight)', color: 'var(--primary)' }}>
                          <i className={`fa-brands fa-${user?.provider === 'google' ? 'google' : 'envelope'}`}></i> {user?.provider === 'google' ? 'Google Account' : 'Email Account'}
                        </span>
                        <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '.78rem', fontWeight: 700, background: 'var(--gray-5)', color: 'var(--gray-1)' }}>
                          <i className="fas fa-calendar-alt"></i> Joined {accountStats.memberSince}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ORDERS */}
            {activeTab === 'orders' && (
              <div className="card" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.2rem' }}>Order History</h2>
                  {lastUpdated && (
                    <div style={{ fontSize: '.75rem', color: 'var(--gray-1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-sync-alt" style={{ color: 'var(--success)', fontSize: '.65rem' }}></i>
                      Updated {new Date(lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
                {orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <i className="fas fa-box-open" style={{ fontSize: '3rem', color: 'var(--gray-3)', display: 'block', marginBottom: '16px' }}></i>
                    <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No orders yet</h3>
                    <p style={{ color: 'var(--gray-1)', marginBottom: '20px' }}>Explore our products to find something you love.</p>
                    <Link href="/products" className="btn btn-primary"><i className="fas fa-shopping-bag"></i> Start Shopping</Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {orders.map(order => {
                      const isExpanded = expandedOrder === order._id;
                      const statusColor = { delivered: '#15803d', shipped: '#6d28d9', paid: '#0369a1', processing: '#1e40af', cancelled: '#b91c1c' }[order.status] || '#92400e';
                      const statusBg = { delivered: '#dcfce7', shipped: '#ede9fe', paid: '#e0f2fe', processing: '#dbeafe', cancelled: '#fee2e2' }[order.status] || '#fef3c7';
                      const addr = order.deliveryAddress;
                      return (
                        <div key={order._id} style={{ border: '1px solid var(--gray-4)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                          {/* Order header — click to expand */}
                          <div
                            onClick={() => toggleOrder(order._id)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', cursor: 'pointer', background: isExpanded ? 'var(--gray-6)' : '#fff', gap: '12px', flexWrap: 'wrap' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `${statusColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className="fas fa-box" style={{ color: statusColor, fontSize: '.85rem' }}></i>
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: '.95rem' }}>#HGD-{order._id.slice(-8).toUpperCase()}</div>
                                <div style={{ fontSize: '.75rem', color: 'var(--gray-1)' }}>{new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })} · {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '.95rem' }}>{formatPrice(order.totalAmount || 0, 'NGN', false)}</div>
                                <span style={{ fontSize: '.7rem', fontWeight: 700, padding: '2px 9px', borderRadius: '999px', background: statusBg, color: statusColor, textTransform: 'capitalize' }}>{order.status || 'pending'}</span>
                              </div>
                              <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ color: 'var(--gray-2)', fontSize: '.75rem', flexShrink: 0 }}></i>
                            </div>
                          </div>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div style={{ borderTop: '1px solid var(--gray-4)', padding: '18px 20px', background: '#fff' }}>
                              {/* Items list */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: addr ? '18px' : 0 }}>
                                {order.items?.map((item, idx) => (
                                  <div key={idx} style={{ display: 'flex', gap: '12px', background: 'var(--gray-6)', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-4)', alignItems: 'center' }}>
                                    <img
                                      src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=60&q=60'}
                                      alt={item.name}
                                      style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                                      onError={e => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=60&q=60'; }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: '2px' }}>{item.name}</div>
                                      <div style={{ fontSize: '.78rem', color: 'var(--gray-1)' }}>
                                        Qty: {item.quantity} · {formatPrice(item.price || 0, 'NGN', false)}
                                      </div>
                                      {item.seller && (
                                        <div style={{ fontSize: '.72rem', color: 'var(--primary)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <i className="fas fa-store" style={{ fontSize: '.6rem' }}></i>
                                          {item.seller.storeName || item.seller.name}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: '.88rem', flexShrink: 0 }}>
                                      {formatPrice((item.price || 0) * (item.quantity || 1), 'NGN', false)}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Delivery address */}
                              {addr && (
                                <div style={{ background: 'var(--gray-6)', borderRadius: 'var(--radius)', padding: '12px 14px', border: '1px solid var(--gray-4)', marginTop: '10px' }}>
                                  <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-1)', letterSpacing: '.5px', marginBottom: '6px' }}>
                                    <i className="fas fa-map-marker-alt" style={{ marginRight: '5px', color: 'var(--primary)' }}></i>Delivery Address
                                  </div>
                                  <div style={{ fontSize: '.85rem', fontWeight: 600 }}>
                                    {[addr.street, addr.city, addr.state, addr.country].filter(Boolean).join(', ')}
                                  </div>
                                  {addr.phone && <div style={{ fontSize: '.8rem', color: 'var(--gray-1)', marginTop: '3px' }}><i className="fas fa-phone" style={{ fontSize: '.65rem', marginRight: '4px' }}></i>{addr.phone}</div>}
                                </div>
                              )}
                              {/* Payment method */}
                              <div style={{ fontSize: '.8rem', color: 'var(--gray-1)', marginTop: '10px' }}>
                                <i className="fas fa-credit-card" style={{ fontSize: '.7rem', marginRight: '5px', color: 'var(--primary)' }}></i>
                                Paid via <strong style={{ color: 'var(--dark)' }}>{({ paystack: 'Paystack', stripe: 'Stripe', bank_transfer: 'Bank Transfer', pod: 'Pay on Delivery', opay: 'OPay', card: 'Card' }[order.paymentMethod]) || 'Unknown'}</strong>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* WISHLIST */}
            {activeTab === 'wishlist' && (
              <div className="card" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.2rem' }}>Wishlist Preview</h2>
                  <Link href="/wishlist" className="btn btn-outline btn-sm"><i className="fas fa-heart"></i> Full Wishlist</Link>
                </div>
                {wishlist.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px', border: '1.5px dashed var(--gray-3)', borderRadius: 'var(--radius-md)' }}>
                    <i className="far fa-heart" style={{ fontSize: '2.5rem', color: 'var(--gray-3)', display: 'block', marginBottom: '12px' }}></i>
                    <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>Your wishlist is empty</h3>
                    <p style={{ color: 'var(--gray-1)', marginBottom: '20px', fontSize: '.9rem' }}>Save items you love to find them easily later.</p>
                    <Link href="/products" className="btn btn-primary btn-sm"><i className="fas fa-shopping-bag"></i> Explore Products</Link>
                  </div>
                ) : (
                  <div className="acct-wishlist-grid">
                    {wishlist.map(product => (
                      <div key={product._id} style={{ display: 'flex', gap: '12px', padding: '14px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-4)', background: 'var(--gray-6)' }}>
                        <img src={product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=60'} alt={product.name} style={{ width: '70px', height: '70px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontWeight: 700, fontSize: '.85rem', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</h4>
                          <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '.88rem', marginBottom: '8px' }}>{formatPrice(product.price || 0, product.currency || 'NGN', false)}</div>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '.75rem', fontWeight: 600 }}>
                            <Link href={`/products/${product._id}`} style={{ color: 'var(--primary)' }}>View</Link>
                            <button onClick={() => removeWishlistItem(product._id)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600, padding: 0 }}>Remove</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS */}
            {activeTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                {user?.provider === 'email' && (
                  <div className="card" style={{ padding: '28px' }}>
                    <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '20px' }}>Change Password</h2>
                    <form onSubmit={handlePasswordUpdate} style={{ maxWidth: '420px' }}>
                      {msgBox(passMsg)}
                      <div className="form-group">
                        <label className="form-label">Current Password</label>
                        <input className="form-input" type="password" required value={passData.currentPassword} onChange={e => setPassData({ ...passData, currentPassword: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">New Password</label>
                        <input className="form-input" type="password" required value={passData.newPassword} onChange={e => { setPassData({ ...passData, newPassword: e.target.value }); calculatePasswordStrength(e.target.value); }} />
                        {passData.newPassword && (
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ height: '4px', borderRadius: '2px', background: 'var(--gray-4)', overflow: 'hidden' }}>
                              <div style={{ width: `${passStrength * 25}%`, height: '100%', background: strengthColors[passStrength], transition: 'all .3s' }}></div>
                            </div>
                            <div style={{ fontSize: '.72rem', color: strengthColors[passStrength], fontWeight: 700, marginTop: '4px' }}>{strengthLabels[passStrength]}</div>
                          </div>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Confirm New Password</label>
                        <input className="form-input" type="password" required value={passData.confirmPassword} onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })} />
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={passSaving} style={{ marginTop: '4px' }}>
                        {passSaving ? <><i className="fas fa-spinner fa-spin"></i> Updating...</> : 'Update Password'}
                      </button>
                    </form>
                  </div>
                )}

                <div className="card" style={{ padding: '28px' }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '20px' }}>Notification Preferences</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '420px' }}>
                    {[
                      { label: 'Order Updates', desc: 'SMS and email updates on your orders', defaultOn: true },
                      { label: 'Promotions & Deals', desc: 'Exclusive offers and newsletters', defaultOn: false },
                    ].map(({ label, desc, defaultOn }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--gray-6)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-4)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{label}</div>
                          <div style={{ fontSize: '.78rem', color: 'var(--gray-1)', marginTop: '2px' }}>{desc}</div>
                        </div>
                        <div style={{ width: '42px', height: '24px', borderRadius: '999px', background: defaultOn ? 'var(--primary)' : 'var(--gray-3)', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                          <div style={{ position: 'absolute', top: '3px', [defaultOn ? 'right' : 'left']: '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff' }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ padding: '28px', border: '1px solid #fecaca' }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--danger)', marginBottom: '8px' }}>Danger Zone</h2>
                  <p style={{ color: 'var(--gray-1)', fontSize: '.88rem', marginBottom: '16px', maxWidth: '400px' }}>Once you delete your account, there is no going back. Please be certain.</p>
                  <button
                    className="btn btn-sm"
                    style={{ border: '1px solid var(--danger)', color: 'var(--danger)', background: 'transparent' }}
                    onClick={() => setModal({
                      open: true, title: 'Delete Account',
                      message: 'Are you absolutely sure? This action cannot be undone.',
                      danger: true, confirmText: 'Delete',
                      onConfirm: () => closeModal(),
                    })}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </Layout>
    <ConfirmModal
      isOpen={modal.open}
      title={modal.title}
      message={modal.message}
      type={modal.type}
      danger={modal.danger}
      confirmText={modal.confirmText}
      onConfirm={modal.onConfirm || closeModal}
      onCancel={closeModal}
    />
    </>
  );
}

Account.getLayout = function getLayout(page) {
  return <AuthGuard>{page}</AuthGuard>;
};
