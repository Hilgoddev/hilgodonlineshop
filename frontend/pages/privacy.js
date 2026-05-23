import Link from 'next/link';
import Layout from '@/components/Layout';

export default function Privacy() {
  return (
    <Layout
      title="Privacy Policy — Hilgod Online Store"
      description="Read the Privacy Policy for Hilgod Online Store."
    >
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-10) var(--space-4)' }}>
        <nav className="breadcrumb" style={{ marginBottom: 'var(--space-6)' }}>
          <Link href="/">Home</Link>
          <i className="fas fa-chevron-right sep"></i>
          <span className="current">Privacy Policy</span>
        </nav>

        <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: 'var(--space-2)' }}>Privacy Policy</h1>
        <p style={{ color: 'var(--gray-1)', marginBottom: 'var(--space-8)', fontSize: '.9rem' }}>Last updated: May 2026</p>

        {[
          {
            title: '1. Information We Collect',
            body: 'We collect information you provide directly — such as your name, email address, phone number, and delivery address when you register or place an order. We also collect usage data automatically, including IP address, browser type, pages visited, and device information.',
          },
          {
            title: '2. How We Use Your Information',
            body: 'We use your information to: process and fulfil orders; communicate with you about your account and orders; personalise your shopping experience; improve our Platform; send promotional offers (with your consent); and comply with legal obligations.',
          },
          {
            title: '3. Sharing Your Information',
            body: 'We share your information with: sellers (to fulfil your orders); delivery partners (to complete delivery); payment processors (Paystack) for secure payment handling; and service providers who help us operate the Platform. We do not sell your personal data to third parties.',
          },
          {
            title: '4. Payment Security',
            body: 'All payment transactions are processed by Paystack, a PCI-DSS compliant payment gateway. We do not store your card details on our servers.',
          },
          {
            title: '5. Cookies',
            body: 'We use cookies and similar technologies to keep you signed in, remember your preferences, and analyse Platform usage. You can disable cookies in your browser settings, but some features may not work correctly.',
          },
          {
            title: '6. Data Retention',
            body: 'We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion of your account and data at any time by contacting privacy@hilgod.com.',
          },
          {
            title: '7. Your Rights',
            body: 'Under applicable Nigerian data protection laws (NDPR), you have the right to: access the personal data we hold about you; request correction of inaccurate data; request deletion of your data; object to or restrict processing; and withdraw consent at any time.',
          },
          {
            title: '8. Children\'s Privacy',
            body: 'Our Platform is not intended for children under 18. We do not knowingly collect personal data from minors. If we become aware that we have, we will delete it promptly.',
          },
          {
            title: '9. Third-Party Links',
            body: 'Our Platform may contain links to third-party websites. We are not responsible for their privacy practices and encourage you to review their privacy policies.',
          },
          {
            title: '10. Changes to This Policy',
            body: 'We may update this Privacy Policy periodically. We will notify you of significant changes via email or a notice on the Platform. Continued use after changes means you accept the updated policy.',
          },
          {
            title: '11. Contact Us',
            body: 'For privacy-related questions or to exercise your rights, contact our Data Protection Officer at privacy@hilgod.com.',
          },
        ].map(({ title, body }) => (
          <div key={title} style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>{title}</h2>
            <p style={{ color: 'var(--gray-1)', lineHeight: '1.7', fontSize: '.95rem' }}>{body}</p>
          </div>
        ))}

        <div style={{ marginTop: 'var(--space-10)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--gray-4)', display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <Link href="/terms" style={{ color: 'var(--primary)', fontWeight: 600 }}>Terms of Service</Link>
          <Link href="/" style={{ color: 'var(--gray-1)' }}>← Back to Home</Link>
        </div>
      </div>
    </Layout>
  );
}
