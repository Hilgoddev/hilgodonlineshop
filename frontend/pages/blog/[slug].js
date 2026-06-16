import Link from 'next/link';
import Layout from '@/components/Layout';
import { BLOG_POSTS, getPostBySlug, CAT_COLORS } from '../../lib/blogPosts';

// Convert the stored markdown-lite content to simple HTML
function renderContent(content) {
  const lines = content.split('\n');
  const html = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith('### ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h3>${esc(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h2>${esc(line.slice(3))}</h2>`);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push(`<li>${inline(line.slice(2))}</li>`);
    } else if (line.startsWith('|')) {
      if (inList) { html.push('</ul>'); inList = false; }
      // table row
      const cells = line.split('|').filter(c => c.trim() !== '' && !/^[-\s]+$/.test(c));
      if (cells.length) {
        const isHeader = html[html.length - 1]?.startsWith('<table') || !html.some(h => h.startsWith('<table'));
        if (!html.some(h => h === '<table>')) html.push('<table>');
        const tag = isHeader && !html.some(h => h.startsWith('<tr>')) ? 'th' : 'td';
        html.push(`<tr>${cells.map(c => `<${tag}>${inline(c.trim())}</${tag}>`).join('')}</tr>`);
      }
    } else if (line === '---') {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push('<hr>');
    } else if (line === '') {
      if (inList) { html.push('</ul>'); inList = false; }
    } else {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<p>${inline(line)}</p>`);
    }
  }
  if (inList) html.push('</ul>');

  // close any open table
  let out = html.join('\n');
  out = out.replace(/<table>\n((<tr>.*?<\/tr>\n?)+)/gs, (_, rows) => `<table>${rows}</table>`);
  return out;
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
      // Only allow safe protocols — block javascript:, data:, vbscript:, etc.
      const safe = /^(https?:\/\/|\/[^/])/i.test(href) ? href : '#';
      return `<a href="${safe}" rel="noopener noreferrer">${text}</a>`;
    });
}

export default function BlogPost({ post, related }) {
  if (!post) {
    return (
      <Layout title="Post Not Found — Hilgod Blog">
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <h2>Post not found</h2>
          <Link href="/blog" className="btn btn-primary" style={{ marginTop: '20px' }}>Back to Blog</Link>
        </div>
      </Layout>
    );
  }

  const catColor = CAT_COLORS[post.category] || 'var(--primary)';

  return (
    <Layout title={`${post.title} — Hilgod Blog`} description={post.excerpt}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: 'var(--space-8) 0' }}>
        {/* Breadcrumb */}
        <nav className="breadcrumb" style={{ marginBottom: 'var(--space-6)' }}>
          <Link href="/">Home</Link>
          <i className="fas fa-chevron-right sep"></i>
          <Link href="/blog">Blog</Link>
          <i className="fas fa-chevron-right sep"></i>
          <span className="current">{post.title}</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px', fontSize: '.75rem', fontWeight: 700, background: `${catColor}18`, color: catColor, marginBottom: '14px' }}>{post.category}</span>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 900, lineHeight: 1.3, marginBottom: '14px' }}>{post.title}</h1>
          <div style={{ display: 'flex', gap: '16px', fontSize: '.8rem', color: 'var(--gray-1)' }}>
            <span><i className="fas fa-calendar-alt" style={{ marginRight: 5 }}></i>{post.date}</span>
            <span><i className="fas fa-clock" style={{ marginRight: 5 }}></i>{post.readTime}</span>
          </div>
        </div>

        {/* Hero banner */}
        <div style={{ height: '220px', background: `linear-gradient(135deg, ${catColor}22, ${catColor}55)`, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-8)' }}>
          <i className="fas fa-newspaper" style={{ fontSize: '4rem', color: catColor, opacity: .3 }}></i>
        </div>

        {/* Article body */}
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
          style={{ lineHeight: '1.85', fontSize: '.97rem', color: 'var(--dark)' }}
        />

        {/* Divider */}
        <hr style={{ margin: 'var(--space-10) 0', borderColor: 'var(--gray-4)' }} />

        {/* Related posts */}
        {related.length > 0 && (
          <div>
            <h3 style={{ fontWeight: 800, marginBottom: 'var(--space-5)', fontSize: '1.05rem' }}>More from the Blog</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
              {related.map(r => (
                <Link key={r.slug} href={`/blog/${r.slug}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ padding: '16px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '.7rem', fontWeight: 700, color: CAT_COLORS[r.category] || 'var(--primary)' }}>{r.category}</span>
                    <h4 style={{ fontWeight: 700, fontSize: '.88rem', lineHeight: 1.4, margin: '6px 0 4px' }}>{r.title}</h4>
                    <span style={{ fontSize: '.75rem', color: 'var(--gray-1)' }}>{r.readTime}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 'var(--space-8)', textAlign: 'center' }}>
          <Link href="/blog" className="btn btn-outline"><i className="fas fa-arrow-left"></i> All Posts</Link>
        </div>
      </div>

      <style jsx global>{`
        .blog-content h2 { font-size: 1.35rem; font-weight: 800; margin: 2rem 0 .75rem; color: var(--dark); }
        .blog-content h3 { font-size: 1.1rem;  font-weight: 700; margin: 1.6rem 0 .6rem;  color: var(--dark); }
        .blog-content p  { margin: 0 0 1.1rem; }
        .blog-content ul { padding-left: 1.4rem; margin: 0 0 1.1rem; }
        .blog-content li { margin-bottom: .4rem; }
        .blog-content strong { font-weight: 700; }
        .blog-content em { font-style: italic; }
        .blog-content code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: .88em; font-family: monospace; }
        .blog-content a { color: var(--primary); text-decoration: underline; }
        .blog-content hr { border: none; border-top: 1px solid var(--gray-4); margin: 2rem 0; }
        .blog-content table { width: 100%; border-collapse: collapse; margin: 1rem 0 1.4rem; font-size: .9rem; }
        .blog-content th, .blog-content td { padding: 8px 12px; border: 1px solid var(--gray-4); text-align: left; }
        .blog-content th { background: var(--gray-6); font-weight: 700; }
      `}</style>
    </Layout>
  );
}

export async function getStaticPaths() {
  return {
    paths: BLOG_POSTS.map(p => ({ params: { slug: p.slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const post    = getPostBySlug(params.slug);
  const related = BLOG_POSTS.filter(p => p.slug !== params.slug).slice(0, 3);
  return { props: { post: post || null, related } };
}
