import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { resolveServerApiBase } from '@/lib/env';

export default function StorePage({ store, products }) {
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

  return (
    <Layout title={`${store.name} - Hilgod`}>
      <div style={{ padding: 'var(--space-6) 0' }}>
        {/* Store header */}
        <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '18px', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
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
            {/* Seller details */}
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

          {/* Contact button (WhatsApp) */}
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

        {/* Products */}
        {products.length ? (
          <div className="product-grid-5">
            {products.map((p) => (
              <ProductCard key={p._id || p.id} product={p} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-1)' }}>
            <i className="fas fa-box-open" style={{ fontSize: '2rem', marginBottom: '12px', display: 'block' }}></i>
            <p>This store has no products listed yet.</p>
          </div>
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
      const prodRes = await fetch(`${apiBase}/products?seller_id=${encodeURIComponent(store.owner_id)}&limit=60`, { cache: 'no-store' });
      const prodJson = await prodRes.json();
      products = prodJson.success ? (prodJson.data || []) : [];
    }
    return { props: { store, products } };
  } catch {
    return { props: { store: null, products: [] } };
  }
}
