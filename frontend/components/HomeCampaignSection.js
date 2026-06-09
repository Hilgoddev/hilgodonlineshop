import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { withNormalizedPricing } from '@/lib/pricing';

/**
 * Landing-page section for a single campaign type (flash / black_friday / easter).
 * Renders a titled header with a live countdown and a 5-up product grid, themed by
 * `theme.accent`. Returns null when there are no active campaigns of this type.
 */
export default function HomeCampaignSection({ campaigns = [], theme }) {
  const { title, icon, accent, href } = theme;
  const [cd, setCd] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!campaigns.length) return;
    const target = new Date(campaigns[0].expires_at);
    const update = () => {
      const diff = Math.max(0, target - Date.now());
      setCd({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [campaigns]);

  if (!campaigns.length) return null;

  const fmt = (n) => String(n).padStart(2, '0');
  const cards = campaigns.map((sale) => {
    const prod = sale.products || {};
    return withNormalizedPricing({
      ...prod,
      _id: prod.id || sale.product_id,
      id: prod.id || sale.product_id,
      price: sale.sale_price,
      originalPrice: sale.original_price || prod.price,
      badge: 'sale',
    });
  });

  const units = [['HRS', cd.hours], ['MIN', cd.minutes], ['SEC', cd.seconds]];

  return (
    <div className="products-section">
      <style jsx>{`
        .flash-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .flash-meta { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; justify-content: flex-end; flex-direction: column; }
        .flash-timer { display: flex; align-items: center; gap: 2px; flex-wrap: nowrap; white-space: nowrap; }
        .flash-timer-label { font-weight: 700; font-size: 0.72rem; white-space: nowrap; margin-right: 2px; }
        .flash-timer-box { display: inline-block; min-width: 44px; background: transparent; font-weight: 900; font-size: 1.22rem; border-radius: 6px; text-align: center; padding: 2px 4px; line-height: 1; }
        .flash-timer-unit { font-size: 0.5rem; font-weight: 700; margin-top: 1px; letter-spacing: 0.06em; }
        .flash-timer-sep { font-weight: 900; font-size: 1.1rem; }
        @media (max-width: 640px) {
          .flash-header { align-items: flex-start; }
          .flash-meta { width: 100%; justify-content: flex-start; align-items: flex-end; gap: 6px; }
          .flash-timer { gap: 1px; }
          .flash-timer-label { font-size: 0.56rem; margin-right: 1px; }
          .flash-timer-box { min-width: 30px; font-size: 0.86rem; padding: 1px 3px; border-radius: 4px; }
          .flash-timer-unit { font-size: 0.42rem; }
          .flash-timer-sep { font-size: 0.8rem; }
        }
        @media (max-width: 420px) {
          .flash-header { gap: 8px; }
          .flash-meta { gap: 4px; }
          .flash-timer-label { display: none; }
          .flash-timer-box { min-width: 27px; font-size: 0.78rem; padding: 1px 2px; }
          .flash-timer-unit { font-size: 0.38rem; letter-spacing: 0.04em; }
          .flash-timer-sep { font-size: 0.72rem; }
        }
      `}</style>
      <div className="section-header flash-header" style={{ background: 'transparent', boxShadow: 'none' }}>
        <h2 className="section-title">
          <span className="bar"></span>
          <i className={`fas ${icon}`} style={{ color: accent, marginRight: '6px' }} />
          {title}
        </h2>
        <div className="flash-meta">
          <div className="flash-timer">
            <span className="flash-timer-label" style={{ color: '#64748b' }}>
              <i className="fas fa-clock" style={{ marginRight: '3px' }} />Ends in:
            </span>
            {units.map(([u, v], i) => (
              <span key={u} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && <span className="flash-timer-sep" style={{ color: accent }}>:</span>}
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span className="flash-timer-box" style={{ color: accent }}>{fmt(v)}</span>
                  <span className="flash-timer-unit" style={{ color: accent }}>{u}</span>
                </span>
              </span>
            ))}
          </div>
          <Link href={href} className="section-link">View All Deals <i className="fas fa-arrow-right"></i></Link>
        </div>
      </div>
      <div className="product-grid-5">
        {cards.slice(0, 5).map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
}
