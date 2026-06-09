import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { withNormalizedPricing, normalizePricing } from '@/lib/pricing';

function CountdownBadge({ expiresAt, gradient }) {
  const [cd, setCd] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const target = new Date(expiresAt);
    const update = () => {
      const diff = Math.max(0, target - Date.now());
      setCd({ h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <div style={{ background: gradient, color: '#fff', borderRadius: '0 0 8px 8px', padding: '5px 10px', textAlign: 'center', fontSize: '0.76rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
      <i className="fas fa-clock" />
      {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}
    </div>
  );
}

/**
 * Reusable storefront view for any timed-discount campaign
 * (flash sale, Black Friday, Easter, …). Driven by a `theme` config.
 */
export default function CampaignView({ campaigns = [], theme }) {
  const { label, title, icon, accent, gradient, banner, blurb, emptyBlurb } = theme;
  const [globalCd, setGlobalCd] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (campaigns.length === 0) return;
    const target = new Date(campaigns[0].expires_at);
    const update = () => {
      const diff = Math.max(0, target - Date.now());
      setGlobalCd({ h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [campaigns]);

  const pad = (n) => String(n).padStart(2, '0');

  if (campaigns.length === 0) {
    return (
      <Layout title={`${title} — Hilgod Online Store`} description={blurb}>
        <nav className="breadcrumb">
          <Link href="/">Home</Link>
          <i className="fas fa-chevron-right sep"></i>
          <span className="current">{label}</span>
        </nav>
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto', padding: 'var(--space-10) 0' }}>
          <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-5)' }}>
            <i className={`fas ${icon}`} style={{ fontSize: '2.5rem', color: accent }}></i>
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.2rem)', fontWeight: 900, marginBottom: '12px' }}>{title}</h1>
          <p style={{ color: 'var(--gray-1)', fontSize: '.95rem', lineHeight: 1.8, maxWidth: '480px', margin: '0 auto var(--space-6)' }}>{emptyBlurb}</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/products" className="btn btn-primary btn-lg"><i className="fas fa-shopping-bag"></i> Shop All Products</Link>
            <Link href="/" className="btn btn-outline btn-lg"><i className="fas fa-home"></i> Back to Home</Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`${title} — Hilgod Online Store`} description={blurb}>
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">{label}</span>
      </nav>

      <div style={{ background: banner, borderRadius: 'var(--radius-md)', padding: 'clamp(20px,4vw,36px) clamp(20px,5vw,40px)', color: '#fff', marginBottom: 'var(--space-6)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <i className={`fas ${icon}`} style={{ color: accent, fontSize: '1.5rem' }} />
            <h1 style={{ fontSize: 'clamp(1.4rem,4vw,2rem)', fontWeight: 900, margin: 0 }}>{title}</h1>
            <span style={{ background: accent, color: '#fff', padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700 }}>LIVE</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: '.9rem', margin: 0 }}>{blurb}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ends in</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {[{ val: pad(globalCd.h), label: 'HRS' }, { val: pad(globalCd.m), label: 'MIN' }, { val: pad(globalCd.s), label: 'SEC' }].map(({ val, label: l }, i) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {i > 0 && <span style={{ color: accent, fontWeight: 700, fontSize: '1.3rem' }}>:</span>}
                <span style={{ background: 'rgba(255,255,255,.12)', borderRadius: '8px', padding: '8px 12px', minWidth: '52px', textAlign: 'center', display: 'inline-block' }}>
                  <span style={{ display: 'block', fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{val}</span>
                  <span style={{ display: 'block', fontSize: '0.56rem', color: 'rgba(255,255,255,.5)', marginTop: '3px' }}>{l}</span>
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="product-grid-5">
        {campaigns.map((sale) => {
          const prod = sale.products || {};
          const productForCard = withNormalizedPricing({
            ...prod,
            _id: prod.id || sale.product_id,
            id: prod.id || sale.product_id,
            price: sale.sale_price,
            originalPrice: sale.original_price || prod.price,
            badge: 'sale',
          });
          const discountPct = normalizePricing(productForCard).discountPercent;
          return (
            <div key={sale.id}>
              <ProductCard product={productForCard} />
              <CountdownBadge expiresAt={sale.expires_at} gradient={`linear-gradient(90deg, ${accent}, ${accent}cc)`} />
              {discountPct > 0 && (
                <div style={{ textAlign: 'center', fontSize: '0.74rem', fontWeight: 700, color: accent, padding: '3px 0 0' }}>Save {discountPct}%</div>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
