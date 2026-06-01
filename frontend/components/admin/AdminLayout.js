import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { signOut, useSession } from '../../contexts/AuthContext';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: 'fa-gauge-high' },
  { href: '/admin/analytics', label: 'Analytics', icon: 'fa-chart-line' },
  { href: '/admin/approvals', label: 'Approvals', icon: 'fa-clipboard-check' },
  { href: '/admin/products', label: 'Products', icon: 'fa-box' },
  { href: '/admin/orders', label: 'Orders', icon: 'fa-shopping-cart' },
  { href: '/admin/customers', label: 'Users', icon: 'fa-users' },
  { href: '/admin/sellers', label: 'Sellers', icon: 'fa-shop' },
  { href: '/admin/categories', label: 'Categories', icon: 'fa-tags' },
  { href: '/admin/stores', label: 'Stores', icon: 'fa-store' },
  { href: '/admin/riders', label: 'Riders', icon: 'fa-motorcycle' },
  { href: '/admin/flash-sales', label: 'Flash Sales', icon: 'fa-bolt' },
];

export default function AdminLayout({ children, title, description }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.replace('/auth/login');
  };

  const pageTitle = title ? `${title} — Admin` : 'Admin — Hilgod';

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        {description ? <meta name="description" content={description} /> : null}
      </Head>
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#f1f5f9',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {mobileOpen ? (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.45)',
              zIndex: 40,
              border: 'none',
            }}
          />
        ) : null}

        <aside
          style={{
            width: mobileOpen ? 'min(280px, 88vw)' : 0,
            maxWidth: mobileOpen ? '280px' : 0,
            flexShrink: 0,
            background: '#0f172a',
            color: '#e2e8f0',
            display: mobileOpen ? 'flex' : 'none',
            flexDirection: 'column',
            position: 'fixed',
            zIndex: 50,
            top: 0,
            left: 0,
            bottom: 0,
            overflow: 'auto',
            transition: 'transform 0.2s ease',
          }}
          className="admin-sidebar-mobile"
        >
          <div style={{ padding: '20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <Link href="/admin" style={{ textDecoration: 'none', color: '#fff' }} onClick={() => setMobileOpen(false)}>
              <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '0.04em' }}>
                <i className="fas fa-shield-halved" style={{ color: '#38bdf8', marginRight: '8px' }} />
                HILGOD
              </div>
              <div style={{ fontSize: '0.65rem', opacity: 0.65, marginTop: '4px', letterSpacing: '0.12em' }}>ADMIN</div>
            </Link>
          </div>
          <nav style={{ padding: '12px 10px', flex: 1 }}>
            {NAV.map((item) => {
              const active = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    marginBottom: '4px',
                    textDecoration: 'none',
                    color: active ? '#0f172a' : '#cbd5e1',
                    background: active ? '#38bdf8' : 'transparent',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.9rem',
                  }}
                >
                  <i className={`fas ${item.icon}`} style={{ width: '1.1rem', textAlign: 'center' }} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div style={{ padding: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'block',
                color: '#94a3b8',
                fontSize: '0.85rem',
                textDecoration: 'none',
                padding: '8px 10px',
              }}
            >
              <i className="fas fa-arrow-left" style={{ marginRight: '8px' }} />
              Storefront
            </Link>
          </div>
        </aside>

        <aside
          style={{
            width: '248px',
            flexShrink: 0,
            background: '#0f172a',
            color: '#e2e8f0',
            display: 'none',
            flexDirection: 'column',
            position: 'sticky',
            top: 0,
            alignSelf: 'flex-start',
            minHeight: '100vh',
          }}
          className="admin-sidebar-desktop"
        >
          <div style={{ padding: '22px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <Link href="/admin" style={{ textDecoration: 'none', color: '#fff' }}>
              <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.04em' }}>
                <i className="fas fa-shield-halved" style={{ color: '#38bdf8', marginRight: '8px' }} />
                HILGOD
              </div>
              <div style={{ fontSize: '0.65rem', opacity: 0.65, marginTop: '4px', letterSpacing: '0.12em' }}>ADMIN CONSOLE</div>
            </Link>
          </div>
          <nav style={{ padding: '14px 12px', flex: 1 }}>
            {NAV.map((item) => {
              const active = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    marginBottom: '4px',
                    textDecoration: 'none',
                    color: active ? '#0f172a' : '#cbd5e1',
                    background: active ? '#38bdf8' : 'transparent',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.9rem',
                  }}
                >
                  <i className={`fas ${item.icon}`} style={{ width: '1.1rem', textAlign: 'center' }} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Link href="/" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none' }}>
              <i className="fas fa-store" style={{ marginRight: '8px' }} />
              View storefront
            </Link>
          </div>
        </aside>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <header
            style={{
              background: '#fff',
              borderBottom: '1px solid #e2e8f0',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              position: 'sticky',
              top: 0,
              zIndex: 30,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <button
                type="button"
                className="admin-menu-btn"
                onClick={() => setMobileOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  cursor: 'pointer',
                }}
                aria-label="Open menu"
              >
                <i className="fas fa-bars" />
              </button>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                  {title || 'Dashboard'}
                </h1>
                <p className="admin-header-email" style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Signed in as {session?.user?.email}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <Link href="/account" className="btn btn-outline btn-sm admin-header-profile" style={{ fontSize: '0.82rem' }}>
                Profile
              </Link>
              <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: '0.82rem' }} onClick={handleLogout}>
                <i className="fas fa-right-from-bracket" /> <span className="admin-logout-label">Log out</span>
              </button>
            </div>
          </header>

          <main className="admin-main" style={{ flex: 1, padding: '22px 20px 40px', maxWidth: '1440px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
            {children}
          </main>
        </div>
      </div>
      <style jsx global>{`
        @media (min-width: 900px) {
          .admin-sidebar-mobile { display: none !important; }
          .admin-sidebar-desktop { display: flex !important; }
          .admin-menu-btn { display: none !important; }
        }
        @media (max-width: 960px) {
        }
        @media (max-width: 600px) {
          .admin-main { padding: 16px 12px 32px !important; }
          .admin-header-email { display: none !important; }
          .admin-header-profile { display: none !important; }
          .admin-logout-label { display: none !important; }
        }
      `}</style>

      {/* Grid template column for dashboard metrics */}
      {/* Taken out of @media (max-width: 600px) */}
      {/* .admin-stat-grid { grid-template-columns: repeat(2, 1fr) !important; } */}
      {/* Taken out of @media (max-width: 960px)) */}
      {/* .xxxadmin-dash-grid { grid-template-columns: 1fr; } */}
    </>
  );
}
