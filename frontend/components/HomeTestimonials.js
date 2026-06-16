import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// Homepage testimonials — single-row sliding carousel, 3 cards visible on desktop.
// Fetches up to 12 recent reviews; auto-slides every 4.5 s when more than one page exists.
const GAP = 16;
const INTERVAL = 4500;

export default function HomeTestimonials() {
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(0);
  const [cpv, setCpv] = useState(3);   // cards per view, computed from container width
  const [cardPx, setCardPx] = useState(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/reviews/recent?limit=12')
      .then((r) => r.json())
      .then((j) => { if (!cancelled && j?.success && Array.isArray(j.data)) setReviews(j.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Measure container once reviews arrive (container is not in the DOM until then).
  useEffect(() => {
    if (!wrapRef.current) return;
    const measure = () => {
      const w = wrapRef.current?.offsetWidth ?? 0;
      if (!w) return;
      const c = w >= 860 ? 3 : w >= 580 ? 2 : 1;
      setCpv(c);
      setCardPx((w - (c - 1) * GAP) / c);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [reviews.length]);

  const numPages = Math.ceil(reviews.length / Math.max(cpv, 1));

  // Auto-advance by one page on a fixed interval.
  useEffect(() => {
    if (numPages <= 1) return;
    const t = setInterval(() => setPage((p) => (p + 1) % numPages), INTERVAL);
    return () => clearInterval(t);
  }, [numPages]);

  if (reviews.length === 0) return null;

  // Clamp offset so the last page never reveals blank space past the final card.
  const maxOffset = Math.max(0, reviews.length - cpv);
  const offset = Math.min(page * cpv, maxOffset);
  const translateX = cardPx > 0 ? -(offset * (cardPx + GAP)) : 0;

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

      {/* Carousel track */}
      <div ref={wrapRef} style={{ overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            gap: `${GAP}px`,
            transform: `translateX(${translateX}px)`,
            transition: cardPx > 0 ? 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
            willChange: 'transform',
          }}
        >
          {reviews.map((r) => {
            const initials = (r.user_name || 'C').trim().charAt(0).toUpperCase();
            return (
              <div
                key={r.id}
                style={{ flex: `0 0 ${cardPx > 0 ? cardPx : 260}px`, minWidth: 0 }}
              >
                <div
                  className="card"
                  style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', boxSizing: 'border-box' }}
                >
                  <span style={{ color: '#f59e0b', letterSpacing: '1px' }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <i key={i} className={`fa${i <= Math.round(r.rating || 0) ? 's' : 'r'} fa-star`} style={{ fontSize: '.8rem' }} />
                    ))}
                  </span>
                  {r.title && (
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.title}</div>
                  )}
                  <p style={{ color: '#475569', fontSize: '.88rem', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {r.message}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '.8rem', flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '.82rem', color: '#0f172a' }}>{r.user_name || 'Customer'}</div>
                      {r.product_id && (
                        <Link href={`/products/${r.product_id}`} style={{ fontSize: '.72rem', color: 'var(--gray-1)' }}>
                          {r.product_name || 'View product'}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination dots — one per page */}
      {numPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '18px' }}>
          {Array.from({ length: numPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              aria-label={`Go to page ${i + 1}`}
              style={{
                width: i === page ? '22px' : '8px',
                height: '8px',
                borderRadius: '999px',
                background: i === page ? 'var(--primary)' : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
