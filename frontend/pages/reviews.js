import Link from 'next/link';
import Layout from '@/components/Layout';
import { resolveServerApiBase } from '@/lib/env';
import { fetchJsonWithTimeout } from '@/lib/catalogApi';

function Stars({ rating, size = '.85rem' }) {
  return (
    <span style={{ color: '#f59e0b', letterSpacing: '1px' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={`fa${i <= Math.round(rating || 0) ? 's' : 'r'} fa-star`} style={{ fontSize: size }} />
      ))}
    </span>
  );
}

function ReviewCard({ r }) {
  const initials = (r.user_name || 'C').trim().charAt(0).toUpperCase();
  return (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{initials}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.user_name || 'Customer'}</div>
          <Stars rating={r.rating} />
        </div>
      </div>
      {r.title && <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.title}</div>}
      <p style={{ color: '#475569', fontSize: '.9rem', lineHeight: 1.6, margin: 0 }}>{r.message}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '.76rem', color: 'var(--gray-1)' }}>
        {r.product_id ? (
          <Link href={`/products/${r.product_id}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
            {r.product_name || 'View product'} <i className="fas fa-arrow-right" style={{ fontSize: '.7rem' }} />
          </Link>
        ) : <span>{r.product_name || ''}</span>}
        <span>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
      </div>
    </div>
  );
}

export default function ReviewsPage({ reviews = [] }) {
  return (
    <Layout title="Customer Reviews — Hilgod Online Store" description="Read what customers are saying about products across Hilgod Online Store.">
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">Reviews</span>
      </nav>

      <div style={{ textAlign: 'center', padding: 'var(--space-6) 0 var(--space-4)' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.1rem)', fontWeight: 900, marginBottom: '8px' }}>What Our Customers Say</h1>
        <p style={{ color: 'var(--gray-1)', maxWidth: '560px', margin: '0 auto' }}>Real reviews from shoppers across Hilgod Online Store.</p>
      </div>

      {reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-10) 0', color: 'var(--gray-1)' }}>
          <i className="far fa-comment-dots" style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block' }} />
          <p>No reviews yet. Be the first to review a product you bought!</p>
          <Link href="/products" className="btn btn-primary" style={{ marginTop: '16px' }}>Browse Products</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', paddingBottom: 'var(--space-8)' }}>
          {reviews.map((r) => <ReviewCard key={r.id} r={r} />)}
        </div>
      )}
    </Layout>
  );
}

export async function getServerSideProps({ req }) {
  try {
    const apiBase = resolveServerApiBase(req);
    const data = await fetchJsonWithTimeout(`${apiBase}/reviews/recent?limit=60`, 8000);
    return { props: { reviews: data?.success ? (data.data || []) : [] } };
  } catch {
    return { props: { reviews: [] } };
  }
}
