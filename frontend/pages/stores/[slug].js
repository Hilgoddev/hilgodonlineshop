import { useState, useMemo } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { resolveServerApiBase } from '@/lib/env';

const titleCase = (s) => (s || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function StorePage({ store, products }) {
  const [activeCat, setActiveCat] = useState('all');

  // Group the store's products by category, and within each by subcategory.
  const { categories, grouped } = useMemo(() => {
    const byCat = {};
    (products || []).forEach((p) => {
      const c = p.category || 'other';
      (byCat[c] = byCat[c] || []).push(p);
    });
    const cats = Object.keys(byCat).sort();
    // Within each category, split into subcategory buckets ('' = no subcategory).
    const g = {};
    cats.forEach((c) => {
      const subs = {};
      byCat[c].forEach((p) => {
        const s = p.subcategory || '';
        (subs[s] = subs[s] || []).push(p);
      });
      g[c] = subs;
    });
    return { categories: cats, grouped: g };
  }, [products]);

  if (!store) {
    return (
      <Layout title="Store not found - Hilgod">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <i className="fas fa-store-slash" style={{ fontSize: '2.5rem', color: 'var(--gray-2)', marginBottom: '16px', display: 'block' }}></i>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>Store not found</h1>
          <p style={{ color: 'var(--gray-1)', marginBottom: '20px' }}>This store may have been removed or is not yet approved.</p>
          <Link href="/products" className="btn btn-primary">Browse all products</Link>
        </div>
      </Layout>
    );
  }

  const shownCats = activeCat === 'all' ? categories : categories.filter((c) => c === activeCat);

  return (
    <Layout title={`${store.name} - Hilgod`}>
      <div style={{ padding: 'var(--space-6) 0' }}>
        {/* Store header */}
        <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '18px', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.name} style={{ width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '72px', height: '72px', borderRadius: '12px', background: 'var(--gray-5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-store" style={{ fontSize: '1.6rem', color: 'var(--primary)' }}></i>
            </div>
          )}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '4px' }}>{store.name}</h1>
            {store.description && (
              <p style={{ color: 'var(--gray-1)', fontSize: '.9rem', margin: 0 }}>{store.description}</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', color: 'var(--gray-1)', fontSize: '.8rem', marginTop: '8px' }}>
              {store.owner?.full_name && (
                <span><i className="fas fa-user" style={{ marginRight: '4px', color: 'var(--primary)' }} />{store.owner.full_name}</span>
              )}
              {store.owner?.joined && (
                <span><i className="fas fa-calendar" style={{ marginRight: '4px' }} />Since {new Date(store.owner.joined).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}</span>
              )}
              <span><i className="fas fa-box" style={{ marginRight: '4px' }} />{products.length} {products.length === 1 ? 'product' : 'products'}</span>
              {store.status === 'approved' && (
                <span style={{ color: 'var(--success)' }}><i className="fas fa-check-circle" style={{ marginRight: '4px' }} />Verified store</span>
              )}
            </div>
          </div>

          {store.owner?.phone_number && (
            <a
              href={`https://wa.me/${String(store.owner.phone_number).replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
              style={{ background: '#25D366', color: '#fff', whiteSpace: 'nowrap', alignSelf: 'flex-start' }}
            >
              <i className="fab fa-whatsapp"></i> Contact Seller
            </a>
          )}
        </div>

        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-1)' }}>
            <i className="fas fa-box-open" style={{ fontSize: '2rem', marginBottom: '12px', display: 'block' }}></i>
            <p>This store has no products listed yet.</p>
          </div>
        ) : (
          <>
            {/* Category filter */}
            {categories.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
                <button onClick={() => setActiveCat('all')} className={`btn btn-sm ${activeCat === 'all' ? 'btn-primary' : 'btn-outline'}`}>
                  All ({products.length})
                </button>
                {categories.map((c) => (
                  <button key={c} onClick={() => setActiveCat(c)} className={`btn btn-sm ${activeCat === c ? 'btn-primary' : 'btn-outline'}`}>
                    {titleCase(c)} ({(products || []).filter((p) => (p.category || 'other') === c).length})
                  </button>
                ))}
              </div>
            )}

            {/* Category sections, each split by subcategory */}
            {shownCats.map((c) => {
              const subs = grouped[c] || {};
              const subKeys = Object.keys(subs).sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)));
              return (
                <section key={c} style={{ marginBottom: 'var(--space-6)' }}>
                  <div className="section-header">
                    <h2 className="section-title"><span className="bar"></span>{titleCase(c)}</h2>
                  </div>
                  {subKeys.map((sk) => (
                    <div key={sk || 'main'} style={{ marginBottom: subKeys.length > 1 ? 'var(--space-4)' : 0 }}>
                      {sk && (
                        <h3 style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--gray-1)', margin: '4px 0 10px' }}>
                          <i className="fas fa-tag" style={{ fontSize: '.75rem', color: 'var(--primary)', marginRight: '6px' }} />{titleCase(sk)}
                        </h3>
                      )}
                      <div className="product-grid-5">
                        {subs[sk].map((p) => <ProductCard key={p._id || p.id} product={p} />)}
                      </div>
                    </div>
                  ))}
                </section>
              );
            })}
          </>
        )}
      </div>
    </Layout>
  );
}

export async function getServerSideProps({ req, params }) {
  const apiBase = resolveServerApiBase(req);
  try {
    const storeRes = await fetch(`${apiBase}/stores/${encodeURIComponent(params.slug)}`, { cache: 'no-store' });
    const storeJson = await storeRes.json();
    const store = storeJson.success ? storeJson.data : null;
    if (!store) return { props: { store: null, products: [] } };

    let products = [];
    if (store.owner_id) {
      const prodRes = await fetch(`${apiBase}/products?seller_id=${encodeURIComponent(store.owner_id)}&limit=100`, { cache: 'no-store' });
      const prodJson = await prodRes.json();
      products = prodJson.success ? (prodJson.data || []) : [];
    }
    return { props: { store, products } };
  } catch {
    return { props: { store: null, products: [] } };
  }
}
