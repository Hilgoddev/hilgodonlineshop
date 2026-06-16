import Link from 'next/link';
import Layout from '@/components/Layout';

export default function Custom404() {
  return (
    <Layout title="Page Not Found — Hilgod Online Store">
      <div style={{ textAlign: 'center', padding: '80px 20px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ fontSize: '6rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>404</div>
        <h1 style={{ fontWeight: 800, marginTop: '16px', marginBottom: '12px', fontSize: 'clamp(1.4rem,3vw,2rem)' }}>
          Page Not Found
        </h1>
        <p style={{ color: 'var(--gray-1)', lineHeight: 1.7, marginBottom: '32px' }}>
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          Try browsing our catalogue or head back to the homepage.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-primary">
            <i className="fas fa-home"></i> Go Home
          </Link>
          <Link href="/products" className="btn btn-outline">
            <i className="fas fa-bag-shopping"></i> Browse Products
          </Link>
        </div>
      </div>
    </Layout>
  );
}
