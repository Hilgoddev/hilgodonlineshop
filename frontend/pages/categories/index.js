import Link from 'next/link';
import Layout from '@/components/Layout';

import taxonomy from '@/lib/taxonomy.json';
export const categoriesData = taxonomy;

export default function Categories() {
  return (
    <Layout
      title="All Categories — Hilgod Online Store"
      description="Browse all product categories at Hilgod Online Store. Free Shipping and Amazing Deals."
    >
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">All Categories</span>
      </nav>

      <div style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: 'var(--space-2)' }}>
          Shop All Categories
        </h1>
        <p style={{ color: 'var(--gray-1)' }}>
          Explore everything we have to offer across all departments
        </p>
      </div>

      <div className="sitemap-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
        gap: 'var(--space-8) var(--space-6)',
        paddingBottom: 'var(--space-16)'
      }}>
        {categoriesData.map(category => (
          <div key={category.id} className="sitemap-category">
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              marginBottom: 'var(--space-3)',
              color: 'var(--dark)'
            }}>
              <Link href={`/products?category=${category.id}`}>{category.name}</Link>
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {category.subs.map((sub, index) => (
                <li key={index} style={{ marginBottom: '10px' }}>
                  <Link
                    href={`/products?category=${category.id}&subcategory=${encodeURIComponent(sub)}`}
                    style={{
                      display: 'inline-flex', minHeight: '44px', alignItems: 'center',
                      color: 'var(--gray-1)',
                      fontSize: '.9rem',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
                    onMouseLeave={(e) => e.target.style.color = 'var(--gray-1)'}
                  >
                    {sub}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Layout>
  );
}
