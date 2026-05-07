import Link from 'next/link';
import Layout from '@/components/Layout';

export default function Terms() {
  return (
    <Layout
      title="Terms of Service — Hilgod Online Store"
      description="Read the Terms of Service for Hilgod Online Store."
    >
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-10) var(--space-4)' }}>
        <nav className="breadcrumb" style={{ marginBottom: 'var(--space-6)' }}>
          <Link href="/">Home</Link>
          <i className="fas fa-chevron-right sep"></i>
          <span className="current">Terms of Service</span>
        </nav>

        <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: 'var(--space-2)' }}>Terms of Service</h1>
        <p style={{ color: 'var(--gray-1)', marginBottom: 'var(--space-8)', fontSize: '.9rem' }}>Last updated: May 2026</p>

        {[
          {
            title: '1. Acceptance of Terms',
            body: 'By accessing or using Hilgod Online Store ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.',
          },
          {
            title: '2. Use of the Platform',
            body: 'You must be at least 18 years old to use this Platform. You agree to use it only for lawful purposes and in a manner that does not infringe the rights of others or restrict their use of the Platform.',
          },
          {
            title: '3. Account Registration',
            body: 'To access certain features you must register for an account. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.',
          },
          {
            title: '4. Products and Listings',
            body: 'Hilgod acts as a marketplace connecting buyers and sellers. We do not own, warehouse, or control the products listed. Sellers are solely responsible for the accuracy of their listings and fulfilment of orders.',
          },
          {
            title: '5. Orders and Payments',
            body: 'When you place an order, you enter a contract with the seller. Hilgod facilitates payment through Paystack. Prices are in Nigerian Naira (NGN) unless otherwise stated. All sales are subject to stock availability.',
          },
          {
            title: '6. Delivery',
            body: 'Delivery times are estimates only. Hilgod is not liable for delays caused by couriers or events outside our control. Risk of loss passes to you upon delivery.',
          },
          {
            title: '7. Returns and Refunds',
            body: 'Refund and return requests must be submitted within 7 days of delivery. Items must be unused and in original condition. Perishable goods and digital products are non-refundable. Contact support@hilgod.com for assistance.',
          },
          {
            title: '8. Seller Terms',
            body: 'Sellers must provide accurate product information and maintain sufficient stock. Hilgod reserves the right to remove listings or suspend accounts that violate platform policies, including counterfeit goods, prohibited items, or fraudulent activity.',
          },
          {
            title: '9. Intellectual Property',
            body: 'All content on this Platform — including logos, text, graphics, and software — is the property of Hilgod or its licensors. You may not reproduce or distribute any content without prior written permission.',
          },
          {
            title: '10. Limitation of Liability',
            body: 'To the maximum extent permitted by law, Hilgod shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform.',
          },
          {
            title: '11. Changes to Terms',
            body: 'We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the new Terms.',
          },
          {
            title: '12. Governing Law',
            body: 'These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be subject to the exclusive jurisdiction of courts in Lagos State.',
          },
          {
            title: '13. Contact',
            body: 'For questions about these Terms, contact us at legal@hilgod.com.',
          },
        ].map(({ title, body }) => (
          <div key={title} style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>{title}</h2>
            <p style={{ color: 'var(--gray-1)', lineHeight: '1.7', fontSize: '.95rem' }}>{body}</p>
          </div>
        ))}

        <div style={{ marginTop: 'var(--space-10)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--gray-4)', display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <Link href="/privacy" style={{ color: 'var(--primary)', fontWeight: 600 }}>Privacy Policy</Link>
          <Link href="/" style={{ color: 'var(--gray-1)' }}>← Back to Home</Link>
        </div>
      </div>
    </Layout>
  );
}
