import Link from 'next/link';
import Layout from '@/components/Layout';
import { BLOG_POSTS, CAT_COLORS } from '../lib/blogPosts';

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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
          {BLOG_POSTS.map(post => {
            const catColor = CAT_COLORS[post.category] || 'var(--primary)';
            return (
              <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ height: '100%', overflow: 'hidden', transition: 'transform .2s, box-shadow .2s', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                >
                  <div style={{ height: '160px', background: `linear-gradient(135deg, ${catColor}22, ${catColor}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <i className="fas fa-newspaper" style={{ fontSize: '3rem', color: catColor, opacity: .35 }}></i>
                    <span style={{ position: 'absolute', top: '12px', left: '12px', fontSize: '.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}33` }}>
                      {post.category}
                    </span>
                  </div>
                  <div style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '.72rem', color: 'var(--gray-2)' }}>{post.date}</span>
                      <span style={{ fontSize: '.72rem', color: 'var(--gray-2)' }}><i className="fas fa-clock" style={{ marginRight: 4 }}></i>{post.readTime}</span>
                    </div>
                    <h2 style={{ fontWeight: 800, fontSize: '.95rem', lineHeight: 1.4, marginBottom: '8px', color: 'var(--dark)' }}>{post.title}</h2>
                    <p style={{ fontSize: '.82rem', color: 'var(--gray-1)', lineHeight: 1.6, marginBottom: '14px' }}>{post.excerpt}</p>
                    <span style={{ fontSize: '.8rem', fontWeight: 700, color: catColor }}>Read article <i className="fas fa-arrow-right" style={{ fontSize: '.7rem' }}></i></span>
                  </div>
                </div>
              </Link>
            );
          })}
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
