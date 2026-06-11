import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { resolveServerApiBase } from '@/lib/env';
import { fetchJsonWithTimeout } from '@/lib/catalogApi';

const CAMPAIGN_LINKS = [
  { href: '/flash-sales', label: 'Flash Sales', icon: 'fa-bolt', color: '#ef4444' },
  { href: '/black-friday', label: 'Black Friday', icon: 'fa-tag', color: '#f59e0b' },
  { href: '/easter', label: 'Easter Sale', icon: 'fa-egg', color: '#8b5cf6' },
];

export default function DealsPage({ products = [] }) {
  return (
    <Layout title="Deals & Promotions — Hilgod Online Store" description="Every active deal on Hilgod — flash sales, Black Friday, Easter, and marked-down products, all in one place.">
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">Deals</span>
      </nav>

      <div style={{ textAlign: 'center', padding: 'var(--space-6) 0 var(--space-4)' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.1rem)', fontWeight: 900, marginBottom: '8px' }}>
          <i className="fas fa-fire" style={{ color: '#ef4444', marginRight: '8px' }} />Deals &amp; Promotions
        </h1>
        <p style={{ color: 'var(--gray-1)', maxWidth: '560px', margin: '0 auto' }}>All the best prices on Hilgod right now — flash sales, seasonal campaigns, and price drops.</p>
      </div>

      {/* Quick links to themed campaign pages */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
        {CAMPAIGN_LINKS.map((c) => (
          <Link key={c.href} href={c.href} className="btn btn-outline btn-sm" style={{ borderColor: c.color, color: c.color }}>
            <i className={`fas ${c.icon}`} /> {c.label}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-10) 0', color: 'var(--gray-1)' }}>
          <i className="fas fa-tags" style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block' }} />
          <p>No active deals right now. Check back soon!</p>
          <Link href="/products" className="btn btn-primary" style={{ marginTop: '16px' }}>Browse all products</Link>
        </div>
      ) : (
        <div className="products-section" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="section-header">
            <h2 className="section-title"><span className="bar"></span>On Sale Now <span style={{ fontSize: '.8rem', color: 'var(--gray-1)', fontWeight: 400, marginLeft: '6px' }}>{products.length} item{products.length === 1 ? '' : 's'}</span></h2>
          </div>
          <div className="product-grid-5">
            {products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </div>
      )}
    </Layout>
  );
}

export async function getServerSideProps({ req, res }) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  try {
    const apiBase = resolveServerApiBase(req);
    const data = await fetchJsonWithTimeout(`${apiBase}/products?on_sale=true&limit=48`, 10000);
    return { props: { products: (data?.success && Array.isArray(data.data)) ? data.data : [] } };
  } catch {
    return { props: { products: [] } };
  }
}
