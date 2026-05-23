import Link from 'next/link';
import Layout from '@/components/Layout';

const openings = [
  { title: 'Frontend Developer', dept: 'Engineering', type: 'Full-time', location: 'Benin City / Remote', desc: 'Build fast, beautiful Next.js pages for millions of shoppers across Africa.' },
  { title: 'Customer Support Lead', dept: 'Support', type: 'Full-time', location: 'Benin City', desc: 'Own the voice of Hilgod — help buyers and sellers resolve issues swiftly and professionally.' },
  { title: 'Logistics Coordinator', dept: 'Operations', type: 'Full-time', location: 'Lagos / Abuja', desc: 'Plan and oversee last-mile delivery across our growing nationwide network.' },
  { title: 'Growth & Marketing Manager', dept: 'Marketing', type: 'Full-time', location: 'Remote', desc: 'Drive acquisition, retention, and brand visibility across digital channels.' },
  { title: 'Delivery Partner', dept: 'Logistics', type: 'Freelance', location: 'Nationwide', desc: 'Earn money making deliveries in your city. Flexible hours, competitive pay.' },
];

export default function Careers() {
  return (
    <Layout title="Careers — Hilgod Online Store" description="Join the Hilgod team. Open roles in engineering, support, operations and more.">
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">Careers</span>
      </nav>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#1e0a3c,#3b0764)', borderRadius: 'var(--radius-md)', padding: 'clamp(40px,8vw,72px) clamp(24px,6vw,60px)', marginBottom: 'var(--space-10)', color: '#fff', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 30%,rgba(124,58,237,.3),transparent 60%)', pointerEvents: 'none' }} />
        <h1 style={{ fontSize: 'clamp(1.8rem,5vw,3rem)', fontWeight: 900, marginBottom: '16px' }}>Build Africa's Best Marketplace</h1>
        <p style={{ fontSize: 'clamp(.9rem,2vw,1.1rem)', color: 'rgba(255,255,255,.75)', maxWidth: '560px', margin: '0 auto 28px', lineHeight: 1.8 }}>
          We are a small, ambitious team on a mission to make online commerce accessible to every Nigerian. Join us and help shape what comes next.
        </p>
        <a href="mailto:hilgodonline@gmail.com?subject=Career Application" className="btn btn-primary btn-lg">
          <i className="fas fa-envelope"></i> Send Your CV
        </a>
      </div>

      {/* Values */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-10)' }}>
        {[
          { icon: 'fa-rocket', title: 'Move Fast', desc: 'We ship features weekly and learn from real users.' },
          { icon: 'fa-earth-africa', title: 'Africa First', desc: 'Every decision is made with the African market in mind.' },
          { icon: 'fa-people-group', title: 'Team Driven', desc: 'Ideas from everyone — title doesn\'t matter, impact does.' },
          { icon: 'fa-chart-line', title: 'Grow Together', desc: 'Your career grows as Hilgod grows. We invest in people.' },
        ].map(v => (
          <div key={v.title} style={{ background: 'var(--white)', border: '1px solid var(--gray-4)', borderRadius: 'var(--radius-md)', padding: '24px', textAlign: 'center' }}>
            <i className={`fas ${v.icon}`} style={{ fontSize: '1.6rem', color: 'var(--primary)', display: 'block', marginBottom: '12px' }}></i>
            <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>{v.title}</h3>
            <p style={{ fontSize: '.85rem', color: 'var(--gray-1)', lineHeight: 1.6 }}>{v.desc}</p>
          </div>
        ))}
      </div>

      {/* Open Roles */}
      <div style={{ marginBottom: 'var(--space-10)' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 'var(--space-6)' }}>Open Roles</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {openings.map(role => (
            <div key={role.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '20px 24px', background: 'var(--white)', border: '1px solid var(--gray-4)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: '4px', fontSize: '1rem' }}>{role.title}</h3>
                <p style={{ fontSize: '.82rem', color: 'var(--gray-1)', marginBottom: '8px' }}>{role.desc}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[role.dept, role.type, role.location].map(tag => (
                    <span key={tag} style={{ fontSize: '.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: 'var(--gray-5)', color: 'var(--gray-1)' }}>{tag}</span>
                  ))}
                </div>
              </div>
              <a href={`mailto:hilgodonline@gmail.com?subject=Application for ${role.title}`} className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>Apply Now</a>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--gray-6)', border: '1px solid var(--gray-4)', borderRadius: 'var(--radius-md)', padding: '32px', textAlign: 'center' }}>
        <h3 style={{ fontWeight: 800, marginBottom: '8px' }}>Don't see your role?</h3>
        <p style={{ color: 'var(--gray-1)', marginBottom: '20px', fontSize: '.9rem' }}>We're always looking for talented people. Send us your CV and tell us how you'd contribute.</p>
        <a href="mailto:hilgodonline@gmail.com?subject=General Application" className="btn btn-primary"><i className="fas fa-envelope"></i> hilgodonline@gmail.com</a>
      </div>
    </Layout>
  );
}
