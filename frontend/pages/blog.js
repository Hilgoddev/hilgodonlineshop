import Link from 'next/link';
import Layout from '@/components/Layout';

const posts = [
  { slug: null, category: 'Shopping Tips', title: 'How to Get the Best Deals on Hilgod', date: 'May 10, 2026', readTime: '3 min read', excerpt: 'Learn how to use filters, wishlist, and price alerts to never miss a great deal on Hilgod Online Store.' },
  { slug: null, category: 'Sellers', title: 'Top 5 Tips to Grow Your Online Store on Hilgod', date: 'April 28, 2026', readTime: '5 min read', excerpt: 'Verified sellers share their secrets for driving more traffic, increasing conversion rates, and building loyal customers.' },
  { slug: null, category: 'Delivery', title: 'Understanding Our Nationwide Delivery Network', date: 'April 15, 2026', readTime: '4 min read', excerpt: 'A behind-the-scenes look at how Hilgod delivers to all 36 states in Nigeria and beyond.' },
  { slug: null, category: 'Security', title: 'How Hilgod Protects Your Payments', date: 'April 3, 2026', readTime: '3 min read', excerpt: 'Everything you need to know about our multi-layer payment security and buyer protection guarantees.' },
  { slug: null, category: 'Products', title: 'The Best Electronics Launches of 2026 Available on Hilgod', date: 'March 22, 2026', readTime: '6 min read', excerpt: 'From foldable phones to AI-powered gadgets — the year\'s biggest tech releases are now on Hilgod.' },
  { slug: null, category: 'Lifestyle', title: 'African Fashion Trends You Need to Know This Season', date: 'March 10, 2026', readTime: '4 min read', excerpt: 'Explore the boldest Afrocentric styles and where to find them on our platform.' },
];

const catColors = { 'Shopping Tips': 'var(--primary)', Sellers: 'var(--success)', Delivery: 'var(--info)', Security: 'var(--warning)', Products: '#8b5cf6', Lifestyle: '#ec4899' };

export default function Blog() {
  return (
    <Layout title="Blog — Hilgod Online Store" description="Shopping guides, seller tips, delivery updates, and more from Hilgod.">
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">Blog</span>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.2rem)', fontWeight: 900, marginBottom: '8px' }}>Hilgod Blog</h1>
          <p style={{ color: 'var(--gray-1)', fontSize: '.95rem' }}>Shopping tips, seller guides, delivery news, and more.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 'var(--space-6)' }}>
          {posts.map(post => (
            <div key={post.title} title="Coming soon" style={{ textDecoration: 'none', cursor: 'default', opacity: 0.85 }}>
              <div className="card" style={{ height: '100%', overflow: 'visible', position: 'relative' }}>
                <div style={{ height: '180px', background: 'linear-gradient(135deg,#1e0a3c,#3b0764)', borderRadius: 'var(--radius-md) var(--radius-md) 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-newspaper" style={{ fontSize: '3rem', color: 'rgba(255,255,255,.2)' }}></i>
                </div>
                <span style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>Coming Soon</span>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: `${catColors[post.category]}20`, color: catColors[post.category] }}>{post.category}</span>
                    <span style={{ fontSize: '.72rem', color: 'var(--gray-2)' }}>{post.readTime}</span>
                  </div>
                  <h2 style={{ fontWeight: 800, fontSize: '.95rem', lineHeight: 1.4, marginBottom: '8px', color: 'var(--dark)' }}>{post.title}</h2>
                  <p style={{ fontSize: '.82rem', color: 'var(--gray-1)', lineHeight: 1.6, marginBottom: '14px' }}>{post.excerpt}</p>
                  <div style={{ fontSize: '.75rem', color: 'var(--gray-2)' }}><i className="fas fa-calendar-alt" style={{ marginRight: '5px' }}></i>{post.date}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-10)', padding: '40px 32px', background: 'var(--gray-6)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-4)' }}>
          <h3 style={{ fontWeight: 800, marginBottom: '8px' }}>More articles coming soon</h3>
          <p style={{ color: 'var(--gray-1)', marginBottom: '20px', fontSize: '.9rem' }}>Subscribe to our newsletter to get the latest posts delivered to your inbox.</p>
          <a href="mailto:hilgodonline@gmail.com" className="btn btn-primary"><i className="fas fa-envelope"></i> Contact the Team</a>
        </div>
      </div>
    </Layout>
  );
}
