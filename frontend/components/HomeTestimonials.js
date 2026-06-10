import { useState, useEffect } from 'react';
import Link from 'next/link';

// Homepage "What customers say" section — recent reviews from across all products.
// Renders nothing until there is at least one review.
export default function HomeTestimonials() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/reviews/recent?limit=8')
      .then((r) => r.json())
      .then((j) => { if (!cancelled && j?.success && Array.isArray(j.data)) setReviews(j.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (reviews.length === 0) return null;

  return (
    <div className="products-section">
      <div className="section-header">
        <h2 className="section-title">
          <span className="bar"></span>
          <i className="fas fa-quote-left" style={{ color: '#f59e0b', marginRight: '6px' }} />
          What Our Customers Say
        </h2>
        {/* FUTURE UPGRADE: link to the site-wide /reviews page — disabled for now.
        <Link href="/reviews" className="section-link">Read All Reviews <i className="fas fa-arrow-right"></i></Link>
        */}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {reviews.map((r) => {
          const initials = (r.user_name || 'C').trim().charAt(0).toUpperCase();
          return (
            <div key={r.id} className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ color: '#f59e0b', letterSpacing: '1px' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <i key={i} className={`fa${i <= Math.round(r.rating || 0) ? 's' : 'r'} fa-star`} style={{ fontSize: '.8rem' }} />
                ))}
              </span>
              {r.title && <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.title}</div>}
              <p style={{ color: '#475569', fontSize: '.88rem', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.message}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '.8rem' }}>{initials}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.82rem', color: '#0f172a' }}>{r.user_name || 'Customer'}</div>
                  {r.product_id && (
                    <Link href={`/products/${r.product_id}`} style={{ fontSize: '.72rem', color: 'var(--gray-1)' }}>
                      {(r.product_name || 'View product')}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
