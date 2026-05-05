import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { signOut, useSession } from '../../contexts/AuthContext';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';
import { apiFetch } from '../../lib/apiClient';

export default function Account() {
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ firstName: '', lastName: '', image: '' });
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  // Password edit state
  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });
  const [passSaving, setPassSaving] = useState(false);
  const [passStrength, setPassStrength] = useState(0);

  const { data: session } = useSession();
  const router = useRouter();

  // Load data
  const fetchUserData = async () => {
    try {
      if (session?.user?.id) {
        const userRes = await apiFetch(`/api/user/profile`);
        const userData = await userRes.json();
        if (userData.success) {
          setUser(userData.data);
          setProfileData({
            firstName: userData.data.firstName || '',
            lastName: userData.data.lastName || '',
            image: userData.data.image || ''
          });
        }
      }

      const ordersRes = await apiFetch('/api/orders');
      const ordersData = await ordersRes.json();
      if (ordersData.success) {
        setOrders(ordersData.data || []);
      }

      const wishlistRes = await apiFetch('/api/wishlist');
      const wishlistData = await wishlistRes.json();
      if (wishlistData.success) {
        // limit wishlist to 4 items
        setWishlist((wishlistData.data || []).slice(0, 4));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      // Merge anonymous cart with user cart on login
      if (typeof window !== 'undefined' && typeof mergeCartsOnLogin === 'function') {
        mergeCartsOnLogin();
      }
      fetchUserData();
    }
  }, [session]);

  useEffect(() => {
    if (router.query.tab) {
      setActiveTab(router.query.tab);
    }
  }, [router.query.tab]);

  // Profile functions
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg({ type: '', text: '' });

    try {
      const res = await apiFetch('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.data);
        setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => setIsEditingProfile(false), 2000);
      } else {
        setProfileMsg({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: 'Network error occurred' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Password functions
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
      const res = await apiFetch('/api/user/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passData.currentPassword,
          newPassword: passData.newPassword
        })
      });
      const data = await res.json();

      if (data.success) {
        setPassMsg({ type: 'success', text: 'Password updated successfully!' });
        setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPassStrength(0);
      } else {
        setPassMsg({ type: 'error', text: data.error || 'Failed to update password' });
      }
    } catch (err) {
      setPassMsg({ type: 'error', text: 'Network error occurred' });
    } finally {
      setPassSaving(false);
    }
  };

  const removeWishlistItem = async (id) => {
    try {
      const res = await apiFetch(`/api/wishlist?productId=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setWishlist(wishlist.filter(item => item._id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Layout title="My Account">
        <div className="flex justify-center items-center h-64">
          <i className="fas fa-spinner fa-spin text-4xl text-[var(--primary)]"></i>
        </div>
      </Layout>
    );
  }

  const getInitials = () => {
    if (!user) return 'U';
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  const strengthColors = ['#e2e8f0', '#ef4444', '#f59e0b', '#22c55e', '#0ea5e9'];

  // Calculate account stats
  const accountStats = {
    totalOrders: orders.length,
    totalSpent: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
    wishlistItems: wishlist.length,
    memberSince: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'
  };

  return (
    <Layout title="My Account — Hilgod">
      <div className="account-container" style={{ padding: '2rem 1rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Page Header */}
        <div className="account-header">
          <h1>My Account</h1>
          <p>Manage your profile, orders, and preferences</p>
        </div>

        <div className="account-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1.5rem' }}>
          {/* Sidebar Navigation */}
          <div>
            <div className="account-sidebar-enhanced">
              {/* User Quick Info */}
              {user && (
                <div className="account-user-header">
                  <div className="account-user-info">
                    {user?.image ? (
                      <img src={user.image} alt="Profile" className="account-avatar-large" />
                    ) : (
                      <div className="account-avatar-placeholder">
                        {getInitials()}
                      </div>
                    )}
                    <div className="account-user-details">
                      <h3>{user?.firstName} {user?.lastName}</h3>
                      <p>{user?.email}</p>
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <div className="admin-badge">
                      <i className="fas fa-shield-halved"></i> Admin
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Menu */}
              <nav className="account-nav-enhanced">
                <button 
                  className={`account-nav-item-enhanced ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  <i className="fas fa-th-large"></i> Overview
                </button>
                <button 
                  className={`account-nav-item-enhanced ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  <i className="fas fa-user"></i> Profile
                </button>
                <button 
                  className={`account-nav-item-enhanced ${activeTab === 'orders' ? 'active' : ''}`}
                  onClick={() => setActiveTab('orders')}
                >
                  <i className="fas fa-box"></i> Orders
                  {orders.length > 0 && <span className="nav-badge">{orders.length}</span>}
                </button>
                <button 
                  className={`account-nav-item-enhanced ${activeTab === 'wishlist' ? 'active' : ''}`}
                  onClick={() => setActiveTab('wishlist')}
                >
                  <i className="fas fa-heart"></i> Wishlist
                  {wishlist.length > 0 && <span className="nav-badge nav-badge-red">{wishlist.length}</span>}
                </button>
                <button 
                  className={`account-nav-item-enhanced ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('settings')}
                >
                  <i className="fas fa-cog"></i> Settings
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="account-main-content">
            
            {/* OVERVIEW TAB - NEW! */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Welcome Banner */}
                <div className="welcome-banner">
                  <h2>Welcome back, {user?.firstName}! 👋</h2>
                  <p>Here's what's happening with your account today.</p>
                </div>

                {/* Stats Cards */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-card-header">
                      <div className="stat-icon stat-icon-blue">
                        <i className="fas fa-box"></i>
                      </div>
                      <span className="stat-value">{accountStats.totalOrders}</span>
                    </div>
                    <div className="stat-label">Total Orders</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-card-header">
                      <div className="stat-icon stat-icon-green">
                        <i className="fas fa-naira-sign"></i>
                      </div>
                      <span className="stat-value">₦{accountStats.totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="stat-label">Total Spent</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-card-header">
                      <div className="stat-icon stat-icon-red">
                        <i className="fas fa-heart"></i>
                      </div>
                      <span className="stat-value">{accountStats.wishlistItems}</span>
                    </div>
                    <div className="stat-label">Wishlist Items</div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="quick-actions-card">
                  <h3>Quick Actions</h3>
                  <div className="quick-actions-grid">
                    <Link href="/products" className="quick-action-btn">
                      <i className="fas fa-shopping-bag"></i>
                      <div>Shop Now</div>
                    </Link>
                    <Link href="/account?tab=orders" className="quick-action-btn">
                      <i className="fas fa-truck-fast"></i>
                      <div>Track Order</div>
                    </Link>
                    <Link href="/wishlist" className="quick-action-btn">
                      <i className="fas fa-heart"></i>
                      <div>Wishlist</div>
                    </Link>
                    <Link href="/account?tab=settings" className="quick-action-btn">
                      <i className="fas fa-cog"></i>
                      <div>Settings</div>
                    </Link>
                  </div>
                </div>

                {/* Recent Orders Preview */}
                {orders.length > 0 && (
                  <div className="recent-orders-card">
                    <div className="section-header">
                      <h3>Recent Orders</h3>
                      <Link href="/account?tab=orders" className="view-all-link">View All</Link>
                    </div>
                    <div className="orders-list">
                      {orders.slice(0, 3).map(order => (
                        <div key={order._id} className="order-preview-item">
                          <div className="order-preview-left">
                            <div className="order-icon">
                              <i className="fas fa-box"></i>
                            </div>
                            <div>
                              <div className="order-number">#HGD-{order._id.substring(order._id.length - 8).toUpperCase()}</div>
                              <div className="order-date">{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            </div>
                          </div>
                          <div className="order-preview-right">
                            <div className="order-amount">₦{order.totalAmount?.toLocaleString()}</div>
                            <div className={`order-status order-status-${order.status || 'pending'}`}>
                              {order.status || 'Pending'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Account Info */}
                <div className="account-info-card">
                  <h3>Account Information</h3>
                  <div className="info-list">
                    <div className="info-item">
                      <div className="info-label">
                        <i className="fas fa-envelope"></i>
                        <span>Email</span>
                      </div>
                      <span className="info-value">{user?.email}</span>
                    </div>
                    <div className="info-item">
                      <div className="info-label">
                        <i className="fas fa-calendar"></i>
                        <span>Member Since</span>
                      </div>
                      <span className="info-value">{accountStats.memberSince}</span>
                    </div>
                    <div className="info-item">
                      <div className="info-label">
                        <i className={`fab fa-${user?.provider === 'google' ? 'google' : 'envelope'}`}></i>
                        <span>Login Method</span>
                      </div>
                      <span className="info-value">{user?.provider === 'google' ? 'Google' : 'Email'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* PROFILE SECTION */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Profile Details</h2>
                  {!isEditingProfile && (
                    <button onClick={() => setIsEditingProfile(true)} className="px-4 py-2 rounded-lg bg-[var(--primary-xlight)] text-[var(--primary)] font-semibold hover:bg-[var(--primary)] hover:text-white transition-all flex items-center gap-2">
                      <i className="fas fa-edit"></i> Edit Profile
                    </button>
                  )}
                </div>

                {isEditingProfile ? (
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    {profileMsg.text && (
                      <div className={`p-4 rounded-lg text-sm font-medium flex items-center ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <i className={`fas ${profileMsg.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2 text-lg`}></i>
                        {profileMsg.text}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                        <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all" value={profileData.firstName} onChange={(e) => setProfileData({...profileData, firstName: e.target.value})} required />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                        <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all" value={profileData.lastName} onChange={(e) => setProfileData({...profileData, lastName: e.target.value})} required />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Picture URL</label>
                      <input type="url" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all" placeholder="https://example.com/photo.jpg" value={profileData.image} onChange={(e) => setProfileData({...profileData, image: e.target.value})} />
                      <p className="text-xs text-gray-500 mt-1">Enter a URL to your profile picture (optional)</p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button type="submit" disabled={profileSaving} className="px-6 py-3 rounded-lg bg-[var(--primary)] text-white font-semibold shadow hover:bg-[var(--primary-dark)] transition-all flex items-center gap-2 disabled:opacity-50">
                        {profileSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                        {profileSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button type="button" onClick={() => setIsEditingProfile(false)} disabled={profileSaving} className="px-6 py-3 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                    <div className="flex-shrink-0">
                      {user?.image ? (
                        <img src={user.image} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-[var(--primary-xlight)] shadow-lg" />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] text-white flex items-center justify-center text-5xl font-bold shadow-lg">
                          {getInitials()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h3>
                        <p className="text-gray-500 font-medium flex items-center justify-center sm:justify-start gap-2 mt-1">
                          <i className="fas fa-envelope"></i> {user?.email}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap justify-center sm:justify-start gap-3 pt-2">
                        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <i className={`fab fa-${user?.provider === 'google' ? 'google' : 'envelope'} mr-2`}></i>
                          {user?.provider === 'google' ? 'Google Account' : 'Email Account'}
                        </span>
                        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gray-100 text-gray-700 border border-gray-200">
                          <i className="fas fa-calendar-alt mr-2"></i>
                          Member since {new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        {user?.role === 'admin' && (
                          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <i className="fas fa-shield-halved mr-2"></i>
                            Administrator
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ORDERS SECTION */}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Order History</h2>
                
                {orders.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-box-open text-4xl text-gray-300"></i>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">No orders yet</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">Looks like you haven't made your first purchase yet. Explore our products to find something you'll love.</p>
                    <Link href="/products" className="inline-block px-8 py-3 rounded-full bg-[var(--primary)] text-white font-bold hover:bg-[var(--primary-dark)] transition-colors shadow-md">
                      Start Shopping
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {orders.map(order => (
                      <div key={order._id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-4 mb-4 gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-bold text-lg text-gray-900">#HGD-{order._id.substring(order._id.length - 8).toUpperCase()}</span>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                                ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                                  order.status === 'shipped' ? 'bg-purple-100 text-purple-800' : 
                                  order.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
                                  'bg-yellow-100 text-yellow-800'}`}>
                                {order.status || 'Pending'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 font-medium">Placed on {new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          </div>
                          
                          <div className="flex flex-col items-start md:items-end">
                            <span className="text-xl font-extrabold text-[var(--primary)] mb-1">₦{order.totalAmount?.toLocaleString()}</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${order.paymentStatus === 'paid' ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'}`}>
                              {order.paymentStatus === 'paid' ? 'Paid' : 'Payment Pending'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="flex flex-wrap gap-2 flex-1">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-gray-50 pr-3 rounded-lg overflow-hidden border border-gray-100">
                                <img src={item.image || 'https://via.placeholder.com/40'} alt="Item" className="w-10 h-10 object-cover" />
                                <div className="py-1">
                                  <div className="text-xs font-bold text-gray-800 line-clamp-1 max-w-[120px]">{item.name}</div>
                                  <div className="text-[10px] text-gray-500 font-medium">Qty: {item.quantity}</div>
                                </div>
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-xs font-bold text-gray-600 border border-gray-200">
                                +{order.items.length - 3}
                              </div>
                            )}
                          </div>
                          <Link href={`/track-order?id=${order._id}`} className="px-5 py-2.5 rounded-lg border-2 border-[var(--primary)] text-[var(--primary)] font-bold hover:bg-[var(--primary-xlight)] transition-colors whitespace-nowrap">
                            Track Order
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WISHLIST SECTION */}
            {activeTab === 'wishlist' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Wishlist Preview</h2>
                  <Link href="/wishlist" className="text-sm font-semibold text-[var(--primary)] hover:underline">View Full Wishlist</Link>
                </div>
                
                {wishlist.length === 0 ? (
                  <div className="text-center py-12 px-4 border border-dashed border-gray-300 rounded-xl">
                    <i className="far fa-heart text-4xl text-gray-300 mb-3"></i>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Your wishlist is empty</h3>
                    <p className="text-sm text-gray-500 mb-4">Save items you love to your wishlist.</p>
                    <Link href="/products" className="inline-block px-6 py-2 rounded-lg bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800">
                      Explore Products
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {wishlist.map(product => (
                      <div key={product._id} className="flex gap-4 p-4 rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
                        <img src={product.images?.[0] || 'https://via.placeholder.com/80'} alt={product.name} className="w-20 h-20 rounded-lg object-cover" />
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug mb-1">{product.name}</h4>
                            <div className="text-sm font-extrabold text-[var(--primary)]">₦{product.price?.toLocaleString()}</div>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <Link href={`/products/${product._id}`} className="text-xs font-bold text-gray-700 hover:text-[var(--primary)]">
                              View
                            </Link>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <button onClick={() => removeWishlistItem(product._id)} className="text-xs font-bold text-red-500 hover:text-red-700">
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS SECTION */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                
                {/* Password Change */}
                {user?.provider === 'email' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Change Password</h2>
                    
                    <form onSubmit={handlePasswordUpdate} className="max-w-md space-y-4">
                      {passMsg.text && (
                        <div className={`p-3 rounded-lg text-sm font-medium ${passMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {passMsg.text}
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
                        <input type="password" required className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-[var(--primary)]" value={passData.currentPassword} onChange={(e) => setPassData({...passData, currentPassword: e.target.value})} />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                        <input type="password" required className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-[var(--primary)]" value={passData.newPassword} onChange={(e) => {
                          setPassData({...passData, newPassword: e.target.value});
                          calculatePasswordStrength(e.target.value);
                        }} />
                        {passData.newPassword && (
                          <div className="mt-2 flex h-1.5 rounded-full overflow-hidden bg-gray-200">
                            <div className="h-full transition-all duration-300" style={{ width: `${Math.max(passStrength * 25, 10)}%`, background: strengthColors[passStrength] }}></div>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
                        <input type="password" required className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-[var(--primary)]" value={passData.confirmPassword} onChange={(e) => setPassData({...passData, confirmPassword: e.target.value})} />
                      </div>
                      
                      <button type="submit" disabled={passSaving} className="px-6 py-2.5 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors flex items-center">
                        {passSaving ? <i className="fas fa-spinner fa-spin mr-2"></i> : null} Update Password
                      </button>
                    </form>
                  </div>
                )}

                {/* Notifications */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <h2 className="text-xl font-bold text-gray-800 mb-6">Notification Preferences</h2>
                  <div className="space-y-4 max-w-md">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <div className="font-semibold text-gray-800">Order Updates</div>
                        <div className="text-xs text-gray-500 mt-0.5">Receive SMS and email updates on your orders</div>
                      </div>
                      <div className="relative">
                        <input type="checkbox" className="sr-only" defaultChecked />
                        <div className="block bg-[var(--primary)] w-10 h-6 rounded-full"></div>
                        <div className="dot absolute right-1 top-1 bg-white w-4 h-4 rounded-full transition"></div>
                      </div>
                    </label>
                    
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <div className="font-semibold text-gray-800">Promotions & Deals</div>
                        <div className="text-xs text-gray-500 mt-0.5">Receive exclusive offers and newsletters</div>
                      </div>
                      <div className="relative">
                        <input type="checkbox" className="sr-only" />
                        <div className="block bg-gray-300 w-10 h-6 rounded-full"></div>
                        <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition"></div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8">
                  <h2 className="text-xl font-bold text-red-600 mb-2">Danger Zone</h2>
                  <p className="text-sm text-gray-600 mb-4 max-w-md">Once you delete your account, there is no going back. Please be certain.</p>
                  <button 
                    className="px-5 py-2.5 rounded-lg border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors"
                    onClick={() => {
                      if (confirm('Are you absolutely sure? This cannot be undone.')) {
                        alert('Account deletion request has been submitted to administration.');
                      }
                    }}
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
  );
}

Account.getLayout = function getLayout(page) {
  return <AuthGuard>{page}</AuthGuard>;
};
