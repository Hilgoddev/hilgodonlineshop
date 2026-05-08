import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSession, signOut } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useShop } from './ShopProvider';
import { useCurrency } from '../contexts/CurrencyContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [allCatsMenuOpen, setAllCatsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  /** Avoid SSR/client mismatch on currency <select disabled> while rates load. */
  const [currencyUiReady, setCurrencyUiReady] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { cart, wishlist } = useShop();
  const { currency, setCurrency, loading: currencyLoading } = useCurrency();

  const isAdmin = session?.user?.role === 'admin';
  const isSeller = session?.user?.role === 'seller';
  const isAdminPage = router.pathname.startsWith('/admin');

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const fetchResults = async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery.trim())}&limit=5`);
        const data = await res.json();
        if (data.success) { setSearchResults(data.data || []); setIsSearching(true); }
      } catch (err) { console.error('Error fetching search suggestions', err); }
    };
    const debounce = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleLogout = async () => {
    if (session?.user?.id) localStorage.removeItem(`hilgod_cart_${session.user.id}`);
    closeMobileMenu();
    setAccountDropdownOpen(false);
    await signOut();
    router.replace('/auth/login');
  };
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.account-dropdown-wrap')) setAccountDropdownOpen(false);
      if (!e.target.closest('#all-cats-wrap')) setAllCatsMenuOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrencyUiReady(true);
  }, []);

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const FALLBACK_CATS = [
      { name: 'Beauty & Personal Care', slug: 'beauty', icon: 'fa-sparkles' },
      { name: 'Womenswear & Underwear', slug: 'womenswear', icon: 'fa-person-dress' },
      { name: 'Menswear & Underwear', slug: 'menswear', icon: 'fa-person' },
      { name: 'Phones & Electronics', slug: 'electronics', icon: 'fa-mobile-screen' },
      { name: 'Fashion Accessories', slug: 'accessories', icon: 'fa-glasses' },
      { name: 'Home Supplies', slug: 'home', icon: 'fa-house' },
      { name: 'Kitchenware', slug: 'kitchen', icon: 'fa-kitchen-set' },
      { name: 'Shoes', slug: 'shoes', icon: 'fa-shoe-prints' },
      { name: 'Sports', slug: 'sports', icon: 'fa-basketball' },
      { name: 'Toys', slug: 'toys', icon: 'fa-gamepad' },
      { name: 'Food', slug: 'food', icon: 'fa-utensils' },
      { name: 'Collectibles', slug: 'collectibles', icon: 'fa-gem' },
    ];
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) { setCategories(FALLBACK_CATS); return; }
        const text = await res.text();
        if (!text || text.trimStart().startsWith('<')) { setCategories(FALLBACK_CATS); return; }
        const data = JSON.parse(text);
        if (data.success && data.data?.length > 0) {
          setCategories(data.data.map(c => ({ name: c.name, slug: c.slug, icon: c.icon || 'fa-tags' })));
        } else {
          setCategories(FALLBACK_CATS);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setCategories(FALLBACK_CATS);
      }
    };
    fetchCategories();
  }, []);

  // ─── ADMIN NAVBAR ───
  if (isAdmin && isAdminPage) {
    return (
      <>
        {mobileMenuOpen && <div className="mobile-menu-overlay" onClick={closeMobileMenu}></div>}
        <header className="main-header" id="main-header">
          <div className="header-top">
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <Link href="/" className="header-logo">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                    <i className="fas fa-shopping-bag" style={{ fontSize: '1.8rem', color: 'var(--primary)' }}></i>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '2px' }}>HILGOD</div>
                      <div style={{ fontSize: '.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,.7)' }}>ADMIN PANEL</div>
                    </div>
                  </div>
                </Link>
                <nav className="admin-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Link href="/" style={{ color: 'rgba(255,255,255,.8)', fontSize: '.85rem', fontWeight: '600', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-store" style={{ fontSize: '.8rem' }}></i> Store Front
                  </Link>
                  <Link href="/admin" className={router.pathname === '/admin' ? 'admin-link-active' : ''} style={{ color: router.pathname === '/admin' ? '#fff' : 'rgba(255,255,255,.8)', fontSize: '.85rem', fontWeight: '600', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', background: router.pathname === '/admin' ? 'rgba(255,255,255,.1)' : 'transparent', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-tachometer-alt" style={{ fontSize: '.8rem' }}></i> Dashboard
                  </Link>
                  <Link href="/admin/products" style={{ color: router.pathname === '/admin/products' ? '#fff' : 'rgba(255,255,255,.8)', fontSize: '.85rem', fontWeight: '600', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', background: router.pathname === '/admin/products' ? 'rgba(255,255,255,.1)' : 'transparent', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-box" style={{ fontSize: '.8rem' }}></i> Products
                  </Link>
                  <Link href="/admin/orders" style={{ color: router.pathname === '/admin/orders' ? '#fff' : 'rgba(255,255,255,.8)', fontSize: '.85rem', fontWeight: '600', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', background: router.pathname === '/admin/orders' ? 'rgba(255,255,255,.1)' : 'transparent', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-shopping-cart" style={{ fontSize: '.8rem' }}></i> Orders
                  </Link>
                  <Link href="/admin/customers" style={{ color: router.pathname === '/admin/customers' ? '#fff' : 'rgba(255,255,255,.8)', fontSize: '.85rem', fontWeight: '600', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', background: router.pathname === '/admin/customers' ? 'rgba(255,255,255,.1)' : 'transparent', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-users" style={{ fontSize: '.8rem' }}></i> Customers
                  </Link>
                </nav>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="account-dropdown-wrap">
                  <div className="header-action-btn account" onClick={() => setAccountDropdownOpen(!accountDropdownOpen)} style={{ cursor: 'pointer' }}>
                    {session.user?.image ? (
                      <img src={session.user.image} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
                    ) : (
                      <i className="fas fa-user-circle"></i>
                    )}
                    <span>{session.user?.firstName || 'Admin'}</span>
                  </div>
                  <div className={`account-dropdown ${accountDropdownOpen ? 'open' : ''}`}>
                    <div className="dropdown-header">
                      <div className="user-name">{session.user?.firstName} {session.user?.lastName}</div>
                      <div className="user-email">{session.user?.email}</div>
                      <div style={{ marginTop: '4px' }}>
                        <span style={{ fontSize: '.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: '#7c3aed20', color: '#7c3aed' }}>
                          <i className="fas fa-shield-halved"></i> Admin
                        </span>
                      </div>
                    </div>
                    <Link href="/account" className="dropdown-item"><i className="fas fa-user"></i>My Profile</Link>
                    <Link href="/" className="dropdown-item"><i className="fas fa-store"></i>View Store</Link>
                    <hr className="dropdown-divider" />
                    <div className="dropdown-item logout" onClick={handleLogout}><i className="fas fa-right-from-bracket"></i>Logout</div>
                  </div>
                </div>

                <button className="menu-toggle" aria-label="Menu" onClick={toggleMobileMenu}>
                  <span></span><span></span><span></span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Admin Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="mobile-menu" id="mobile-menu">
            <div className="mobile-menu-header">
              <span style={{ fontWeight: '700', fontSize: '1rem' }}>Admin Menu</span>
              <button className="mobile-menu-close" onClick={closeMobileMenu}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="mobile-menu-body">
              <div className="mobile-menu-user">
                <div className="mobile-user-avatar"><i className="fas fa-shield-halved"></i></div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '.9rem' }}>{session.user?.firstName} {session.user?.lastName}</div>
                  <div style={{ fontSize: '.75rem', color: '#7c3aed', fontWeight: '600' }}>Administrator</div>
                </div>
              </div>
              <div className="mobile-nav-title">Admin Panel</div>
              <Link href="/admin" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-tachometer-alt icon"></i>Dashboard</span><i className="fas fa-chevron-right"></i></Link>
              <Link href="/admin/products" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-box icon"></i>Products</span><i className="fas fa-chevron-right"></i></Link>
              <Link href="/admin/orders" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-shopping-cart icon"></i>Orders</span><i className="fas fa-chevron-right"></i></Link>
              <Link href="/admin/customers" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-users icon"></i>Customers</span><i className="fas fa-chevron-right"></i></Link>
              <div className="mobile-nav-title" style={{ marginTop: '10px' }}>Quick Links</div>
              <Link href="/" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-store icon"></i>View Store</span><i className="fas fa-chevron-right"></i></Link>
              <Link href="/account" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-user icon"></i>My Profile</span><i className="fas fa-chevron-right"></i></Link>
              <div className="mobile-nav-link" onClick={() => { closeMobileMenu(); handleLogout(); }} style={{ color: 'var(--danger)' }}>
                <span><i className="fas fa-right-from-bracket icon" style={{ color: 'var(--danger)' }}></i>Logout</span>
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>
          </nav>
        )}
      </>
    );
  }

  // ─── REGULAR / STOREFRONT NAVBAR ───
  return (
    <>
      {mobileMenuOpen && (<div className="mobile-menu-overlay" id="mobile-menu-overlay" onClick={closeMobileMenu}></div>)}
      <header className="main-header" id="main-header">
        <div className="header-top">
          <div className="container">
            <Link href="/" className="header-logo">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                <i className="fas fa-shopping-bag" style={{ fontSize: '1.8rem', color: 'var(--primary)' }}></i>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '2px' }}>HILGOD</div>
                  <div style={{ fontSize: '.55rem', letterSpacing: '3px', color: 'rgba(255,255,255,.7)' }}>ONLINE STORE</div>
                </div>
              </div>
            </Link>
            <div className="header-search-wrap" style={{ position: 'relative' }}>
              <form className="header-search" id="search-form" onSubmit={(e) => { e.preventDefault(); if (searchQuery.trim()) { router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`); setIsSearching(false); } }}>
                <select className="search-category" id="search-cat" aria-label="Category">
                  <option value="">All Categories</option>
                  {categories.map((cat) => (<option key={cat.slug} value={cat.slug}>{cat.name}</option>))}
                </select>
                <input type="text" id="search-input" className="search-input" placeholder="Search for products, brands and more..." autoComplete="off" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => searchQuery.trim() && setIsSearching(true)} onBlur={() => setTimeout(() => setIsSearching(false), 200)} />
                <button type="submit" className="search-btn" aria-label="Search"><i className="fas fa-magnifying-glass"></i></button>
              </form>
              {isSearching && searchResults.length > 0 && (
                <div className="search-suggestions open" id="search-suggestions" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', zIndex: 1000, marginTop: '8px' }}>
                  {searchResults.map(p => (
                    <div key={p._id} className="suggestion-item" onClick={() => router.push(`/products/${p._id}`)} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderBottom: '1px solid var(--gray-4)' }}>
                      <i className="fas fa-search" style={{ color: 'var(--gray-2)' }}></i>
                      <span style={{ fontSize: '.9rem', fontWeight: '600' }}>{p.name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '.85rem', color: 'var(--primary)', fontWeight: '700' }}>₦{p.price?.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="suggestion-item" onClick={() => router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`)} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: 'var(--primary-xlight)' }}>
                    <i className="fas fa-search" style={{ color: 'var(--primary)' }}></i>
                    <span style={{ color: 'var(--primary)', fontWeight: '600' }}>See all results for &quot;{searchQuery}&quot;</span>
                  </div>
                </div>
              )}
            </div>
            <div className="header-actions">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {/* Currency Selector */}
                <select 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={Boolean(currencyUiReady && currencyLoading)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="USD" style={{ color: '#333' }}>USD ($)</option>
                  <option value="NGN" style={{ color: '#333' }}>NGN (₦)</option>
                  <option value="GBP" style={{ color: '#333' }}>GBP (£)</option>
                  <option value="EUR" style={{ color: '#333' }}>EUR (€)</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }} id="auth-actions">
                <div className="account-dropdown-wrap">
                  {status === 'loading' ? (
                    <div className="header-action-btn account"><i className="fas fa-user-circle"></i><span>Loading...</span></div>
                  ) : session ? (
                    <div className="header-action-btn account" onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}>
                      <i className="fas fa-user-circle"></i><span>{session.user?.firstName || 'Account'}</span>
                    </div>
                  ) : (
                    <Link href="/auth/login" className="header-action-btn account"><i className="fas fa-user-circle"></i><span>Account</span></Link>
                  )}
                  {(status !== 'loading' && session) && (
                    <div className={`account-dropdown ${accountDropdownOpen ? 'open' : ''}`} id="account-dropdown">
                      <div id="logged-in-dd">
                        <div className="dropdown-header">
                          <div className="user-name" id="dd-user-name">{session.user?.firstName} {session.user?.lastName}</div>
                          <div className="user-email" id="dd-user-email">{session.user?.email}</div>
                        </div>
                        {isAdmin && (
                          <Link href="/admin" className="dropdown-item"><i className="fas fa-shield-halved"></i>Admin Dashboard</Link>
                        )}
                        {isSeller && (
                          <Link href="/seller/dashboard" className="dropdown-item"><i className="fas fa-store"></i>Seller Dashboard</Link>
                        )}
                        <Link href="/seller-zone" className="dropdown-item"><i className="fas fa-store"></i>Seller Zone</Link>
                        <Link href="/account" className="dropdown-item"><i className="fas fa-tachometer-alt"></i>My Account</Link>
                        <Link href="/account?tab=orders" className="dropdown-item"><i className="fas fa-box"></i>My Orders</Link>
                        <Link href="/wishlist" className="dropdown-item"><i className="fas fa-heart"></i>Wishlist</Link>
                        <hr className="dropdown-divider" />
                        <div className="dropdown-item logout" onClick={handleLogout}><i className="fas fa-right-from-bracket"></i>Logout</div>
                      </div>
                    </div>
                  )}
                </div>
                <Link href="/wishlist" className="header-action-btn" style={{ position: 'relative' }} aria-label="Wishlist">
                  <i className="fas fa-heart"></i><span>Wishlist</span>
                  <span className="badge-count wishlist-badge" style={{ display: wishlist.length > 0 ? 'flex' : 'none' }}>{wishlist.length}</span>
                </Link>
                <Link href="/cart" className="header-action-btn" style={{ position: 'relative' }} aria-label="Cart">
                  <i className="fas fa-shopping-cart"></i><span>Cart</span>
                  <span className="badge-count cart-badge" style={{ display: cart.reduce((t, i) => t + i.quantity, 0) > 0 ? 'flex' : 'none' }}>{cart.reduce((t, i) => t + i.quantity, 0)}</span>
                </Link>
              </div>
              <button className="menu-toggle" id="menu-toggle" aria-label="Menu" onClick={toggleMobileMenu}><span></span><span></span><span></span></button>
            </div>
          </div>
        </div>
        <nav className="category-nav" id="category-nav">
          <div className="container">
            <div className="cat-nav-item all-cats-wrap" id="all-cats-wrap" onMouseEnter={() => setAllCatsMenuOpen(true)} onMouseLeave={() => setAllCatsMenuOpen(false)} onClick={() => { if (window.innerWidth <= 900) setAllCatsMenuOpen(!allCatsMenuOpen); }}>
              <i className="fas fa-bars"></i> All Categories
              <div className={`all-cats-menu ${allCatsMenuOpen ? 'open' : ''}`} id="all-cats-menu" style={{ display: allCatsMenuOpen ? 'grid' : 'none' }}>
                {categories.map((cat) => (<Link key={cat.slug} href={`/products?category=${cat.slug}`} className="all-cats-link" onClick={(e) => e.stopPropagation()}><i className={`fas ${cat.icon}`}></i>{cat.name}</Link>))}
                <Link href="/categories" className="all-cats-link" style={{ color: 'var(--primary)', fontWeight: '700' }} onClick={(e) => e.stopPropagation()}><i className="fas fa-th-large"></i>View All Categories</Link>
              </div>
            </div>
            <Link href="/" className="cat-nav-item"><i className="fas fa-house"></i> Home</Link>
            <Link href="/products?category=beauty" className="cat-nav-item">Beauty</Link>
            <Link href="/products?category=womenswear" className="cat-nav-item">Womenswear</Link>
            <Link href="/products?category=menswear" className="cat-nav-item">Menswear</Link>
            <Link href="/products?category=electronics" className="cat-nav-item">Electronics</Link>
            <Link href="/products?category=accessories" className="cat-nav-item">Accessories</Link>
            <Link href="/products?category=home" className="cat-nav-item">Home</Link>
            <Link href="/products?category=kitchen" className="cat-nav-item">Kitchen</Link>
            <Link href="/products?category=shoes" className="cat-nav-item">Shoes</Link>
            <Link href="#todays-deals" className="cat-nav-item" style={{ color: '#ffd700', fontWeight: '700' }}><i className="fas fa-bolt"></i> Deals</Link>
          </div>
        </nav>
      </header>
      {mobileMenuOpen && (
        <nav className="mobile-menu" id="mobile-menu">
          <div className="mobile-menu-header">
            <span style={{ fontWeight: '700', fontSize: '1rem' }}>Menu</span>
            <button className="mobile-menu-close" id="mobile-menu-close" onClick={closeMobileMenu}><i className="fas fa-xmark"></i></button>
          </div>
          <div className="mobile-menu-body">
            <div className="mobile-menu-user">
              <div className="mobile-user-avatar"><i className="fas fa-user"></i></div>
              <div>
                {status === 'loading' ? (<div style={{ fontWeight: '700', fontSize: '.9rem' }}>Loading...</div>) : session ? (
                  <>
                    <div style={{ fontWeight: '700', fontSize: '.9rem' }} id="mobile-user-name">{session.user?.firstName} {session.user?.lastName}</div>
                    <div style={{ fontSize: '.78rem', color: 'var(--gray-1)' }} id="mobile-user-sub"><Link href="/account" style={{ color: 'var(--primary)' }}>View Account</Link></div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: '700', fontSize: '.9rem' }} id="mobile-user-name">Guest</div>
                    <div style={{ fontSize: '.78rem', color: 'var(--gray-1)' }} id="mobile-user-sub"><Link href="/auth/login" style={{ color: 'var(--primary)' }}>Login</Link> or <Link href="/auth/signup" style={{ color: 'var(--primary)' }}>Register</Link></div>
                  </>
                )}
              </div>
            </div>
            <div className="mobile-nav-title">Shop by Category</div>
            {categories.slice(0, 7).map((cat) => (<Link key={cat.slug} href={`/products?category=${cat.slug}`} className="mobile-nav-link" onClick={closeMobileMenu}><span><i className={`fas ${cat.icon} icon`}></i>{cat.name}</span><i className="fas fa-chevron-right"></i></Link>))}
            <Link href="/categories" className="mobile-nav-link" style={{ color: 'var(--primary)' }} onClick={closeMobileMenu}><span><i className="fas fa-th-large icon" style={{ color: 'var(--primary)' }}></i>All Categories</span><i className="fas fa-chevron-right"></i></Link>
            <div className="mobile-nav-title" style={{ marginTop: '10px' }}>My Account</div>
            {session ? (
              <>
                {isAdmin && (<Link href="/admin" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-shield-halved icon" style={{ color: '#7c3aed' }}></i>Admin Dashboard</span><i className="fas fa-chevron-right"></i></Link>)}
                {isSeller && (<Link href="/seller/dashboard" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-store icon" style={{ color: 'var(--primary)' }}></i>Seller Dashboard</span><i className="fas fa-chevron-right"></i></Link>)}
                <Link href="/account" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-user icon"></i>My Account</span><i className="fas fa-chevron-right"></i></Link>
                <Link href="/account?tab=orders" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-box icon"></i>My Orders</span><i className="fas fa-chevron-right"></i></Link>
                <Link href="/wishlist" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-heart icon"></i>Wishlist</span><i className="fas fa-chevron-right"></i></Link>
                <div className="mobile-nav-link" onClick={() => { closeMobileMenu(); handleLogout(); }} style={{ color: 'var(--danger)' }}><span><i className="fas fa-right-from-bracket icon" style={{ color: 'var(--danger)' }}></i>Logout</span><i className="fas fa-chevron-right"></i></div>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-right-to-bracket icon"></i>Login</span><i className="fas fa-chevron-right"></i></Link>
                <Link href="/auth/signup" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-user-plus icon"></i>Register</span><i className="fas fa-chevron-right"></i></Link>
              </>
            )}
            <div className="mobile-nav-title" style={{ marginTop: '10px' }}>Partners</div>
            <Link href="/seller-zone" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-store icon"></i>Sell on Hilgod</span><i className="fas fa-chevron-right"></i></Link>
            <Link href="/delivery" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-motorcycle icon"></i>Delivery Partner</span><i className="fas fa-chevron-right"></i></Link>
          </div>
        </nav>
      )}
    </>
  );
}