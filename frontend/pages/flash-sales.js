import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { withNormalizedPricing, normalizePricing } from '@/lib/pricing';
import { resolveServerApiBase } from '@/lib/env';
import styles from '@/css/fix.module.css';

function CountdownBadge({ expiresAt }) {
  const [cd, setCd] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const target = new Date(expiresAt);
    const update = () => {
      const diff = Math.max(0, target - Date.now());
      setCd({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const pad = n => String(n).padStart(2, '0');

  return (
    <div style={{
      background: 'linear-gradient(90deg, #dc2626, #ef4444)',
      color: '#fff',
      borderRadius: '0 0 8px 8px',
      padding: '5px 10px',
      textAlign: 'center',
      fontSize: '0.76rem',
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '5px',
    }}>
      <i className="fas fa-clock" />
      {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}
    </div>
  );
}

export default function FlashSales({ flashSales = [] }) {
  const [globalCd, setGlobalCd] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (flashSales.length === 0) return;
    const target = new Date(flashSales[0].expires_at);
    const update = () => {
      const diff = Math.max(0, target - Date.now());
      setGlobalCd({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  const pad = n => String(n).padStart(2, '0');

  if (flashSales.length === 0) {
    return (
      <Layout title="Flash Sales — Hilgod Online Store" description="Exclusive limited-time deals and flash sales on Hilgod.">
        <nav className="breadcrumb">
          <Link href="/">Home</Link>
          <i className="fas fa-chevron-right sep"></i>
          <span className="current">Flash Sales</span>
        </nav>

        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto', padding: 'var(--space-10) 0' }}>
          <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'var(--primary-xlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-5)' }}>
            <i className="fas fa-bolt" style={{ fontSize: '2.5rem', color: 'var(--primary)' }}></i>
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.2rem)', fontWeight: 900, marginBottom: '12px' }}>Flash Sales</h1>
          <p style={{ color: 'var(--gray-1)', fontSize: '.95rem', lineHeight: 1.8, maxWidth: '480px', margin: '0 auto var(--space-6)' }}>
            Our next flash sale is coming soon. Subscribe to our newsletter to be the first to know about exclusive limited-time deals — up to 70% off on top products.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-8)' }}>
            <Link href="/products" className={`btn btn-primary btn-lg ${styles.btnPrimary}`}>
              <i className="fas fa-shopping-bag"></i> Shop All Products
            </Link>
            <Link href="/" className={`btn btn-outline btn-lg ${styles.btn__outline}`}>
              <i className="fas fa-home"></i> Back to Home
            </Link>
          </div>
          <div style={{display:'flex',flexDirection: 'column',alignItems: 'center', padding: '20px 28px', background: 'linear-gradient(135deg,#1e0a3c,#3b0764)', borderRadius: 'var(--radius-md)', color: '#fff', textAlign: 'left' }}>
            <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '.9rem' }}>
              <i className="fas fa-bell" style={{ marginRight: '8px' }}></i>Be the first to know
            </div>
            <p style={{textAlign:'center', fontSize: '.82rem', color: 'rgba(255,255,255,.75)', marginBottom: '12px' }}>
              Flash sales are announced first via newsletter and WhatsApp.
            </p>
            <a href="https://wa.me/2348080535728" className="btn" style={{ background: '#25d366', color: '#fff', border: 'none', fontSize: '.85rem' }} target="_blank" rel="noopener noreferrer">
              <i className="fab fa-whatsapp"></i> Join WhatsApp Channel
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Flash Sales — Hilgod Online Store" description="Exclusive limited-time deals and flash sales on Hilgod.">
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">Flash Sales</span>
      </nav>

      {/* Banner with global countdown */}
      <div style={{
        background: 'linear-gradient(135deg,#1a1a1a 0%,#2d1a1a 50%,#3d0000 100%)',
        borderRadius: 'var(--radius-md)',
        padding: 'clamp(20px,4vw,36px) clamp(20px,5vw,40px)',
        color: '#fff',
        marginBottom: 'var(--space-6)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <i className="fas fa-bolt" style={{ color: '#ef4444', fontSize: '1.5rem' }} />
            <h1 style={{ fontSize: 'clamp(1.4rem,4vw,2rem)', fontWeight: 900, margin: 0 }}>Flash Sales</h1>
            <span style={{ background: '#ef4444', color: '#fff', padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700 }}>LIVE</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: '.9rem', margin: 0 }}>
            Grab these limited-time deals before they expire!
          </p>
        </div>

        {/* Countdown blocks */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ends in</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {[
              { val: pad(globalCd.h), label: 'HRS' },
              { val: pad(globalCd.m), label: 'MIN' },
              { val: pad(globalCd.s), label: 'SEC' },
            ].map(({ val, label }, i) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {i > 0 && <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '1.3rem' }}>:</span>}
                <span style={{ background: 'rgba(255,255,255,.12)', borderRadius: '8px', padding: '8px 12px', minWidth: '52px', textAlign: 'center', display: 'inline-block' }}>
                  <span style={{ display: 'block', fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{val}</span>
                  <span style={{ display: 'block', fontSize: '0.56rem', color: 'rgba(255,255,255,.5)', marginTop: '3px' }}>{label}</span>
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="product-grid-5">
        {flashSales.map(sale => {
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
              <CountdownBadge expiresAt={sale.expires_at} />
              {discountPct > 0 && (
                <div style={{ textAlign: 'center', fontSize: '0.74rem', fontWeight: 700, color: '#ef4444', padding: '3px 0 0' }}>
                  Save {discountPct}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}

export async function getServerSideProps({ req }) {
  try {
    const apiBase = resolveServerApiBase(req);
    const res = await fetch(`${apiBase}/flash-sales`, { cache: 'no-store' });
    const data = await res.json();
    return {
      props: { flashSales: data.success ? (data.data || []) : [] },
    };
  } catch {
    return { props: { flashSales: [] } };
  }
}
