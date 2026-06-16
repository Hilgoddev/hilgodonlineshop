import Link from 'next/link';
import Layout from '@/components/Layout';

export default function Custom500() {
  return (
    <Layout title="Something Went Wrong — Hilgod Online Store">
      <div style={{ textAlign: 'center', padding: '80px 20px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ fontSize: '6rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>500</div>
        <h1 style={{ fontWeight: 800, marginTop: '16px', marginBottom: '12px', fontSize: 'clamp(1.4rem,3vw,2rem)' }}>
          Server Error
        </h1>
        <p style={{ color: 'var(--gray-1)', lineHeight: 1.7, marginBottom: '32px' }}>
          Something went wrong on our end. We&apos;ve been notified and are working on a fix.
          Please try again in a moment — or reach out if the issue persists.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-primary">
            <i className="fas fa-home"></i> Go Home
          </Link>
          <a href="mailto:hilgodonline@gmail.com" className="btn btn-outline">
            <i className="fas fa-envelope"></i> Contact Support
          </a>
        </div>
      </div>
    </Layout>
  );
}
