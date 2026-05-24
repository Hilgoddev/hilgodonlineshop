import Link from 'next/link';
import Layout from '@/components/Layout';

export default function AboutUs() {
  const milestones = [
    { year: '2022', label: 'Founded', desc: 'Hilgod was launched with a vision to connect Nigerian shoppers to quality products at fair prices.' },
    { year: '2023', label: 'Marketplace Launch', desc: 'Opened the platform to third-party sellers, giving local businesses a digital storefront.' },
    { year: '2024', label: 'Nationwide Reach', desc: 'Expanded delivery coverage to all 36 states and achieved 10,000+ monthly orders.' },
    { year: '2026', label: 'Today', desc: 'Serving thousands of buyers and hundreds of verified sellers across Africa.' },
  ];

  const values = [
    { icon: 'fa-handshake', title: 'Trust', desc: 'Every product is reviewed before it goes live. We stand behind what we sell.' },
    { icon: 'fa-bolt', title: 'Speed', desc: 'Fast delivery and instant order tracking so you never wonder where your item is.' },
    { icon: 'fa-shield-halved', title: 'Security', desc: 'End-to-end payment protection and buyer guarantees on every purchase.' },
    { icon: 'fa-heart', title: 'Community', desc: 'We champion local sellers and give small businesses a platform to reach more customers.' },
  ];

  const team = [
    { name: 'Hilgod', role: 'Founder & CEO', initials: 'HG' },
    { name: 'Operations Team', role: 'Fulfilment & Logistics', initials: 'OT' },
    { name: 'Support Team', role: '24/7 Customer Care', initials: 'ST' },
    { name: 'Tech Team', role: 'Platform & Engineering', initials: 'TT' },
  ];

  return (
    <Layout
      title="About Us — Hilgod Online Store"
      description="Learn about Hilgod Online Store — Africa's trusted destination for Electronics, Fashion, Home Supplies and more."
    >
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <i className="fas fa-chevron-right sep"></i>
        <span className="current">About Us</span>
      </nav>

      {/* Hero — full-width */}
      <div style={{
        background: 'linear-gradient(135deg,#1e0a3c 0%,#3b0764 60%,#1e0a3c 100%)',
        padding: 'clamp(60px,10vw,100px) clamp(20px,6vw,60px)',
        marginLeft: '-1rem',
        marginRight: '-1rem',
        marginTop: '-1rem',
        width: 'calc(100% + 2rem)',
        marginBottom: 'var(--space-10)',
        textAlign: 'center',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 30%, rgba(124,58,237,.35) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <h1 style={{ fontSize: 'clamp(1.8rem,5vw,3rem)', fontWeight: 900, marginBottom: '16px', lineHeight: 1.2, position: 'relative' }}>
          Africa&apos;s Trusted Online Marketplace
        </h1>
        <p style={{ fontSize: 'clamp(.95rem,2vw,1.15rem)', color: 'rgba(255,255,255,.78)', maxWidth: '600px', margin: '0 auto 28px', lineHeight: 1.7, position: 'relative' }}>
          Hilgod connects millions of shoppers with trusted sellers across Nigeria and beyond — bringing quality products, fair prices, and fast delivery right to your door.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
          <Link href="/products" className="btn btn-primary btn-lg btn-mobile-full">
            <i className="fas fa-shopping-cart"></i> Shop Now
          </Link>
          <Link href="/seller-zone" className="btn btn-lg btn-mobile-full" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', backdropFilter: 'blur(4px)' }}>
            <i className="fas fa-store"></i> Sell on Hilgod
          </Link>
        </div>
      </div>

      {/* Mission */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 'var(--space-8)', marginBottom: 'var(--space-10)', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', display: 'block', marginBottom: '10px' }}>
            Our Mission
          </span>
          <h2 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 800, marginBottom: '16px', lineHeight: 1.3 }}>
            Making quality shopping accessible to every Nigerian
          </h2>
          <p style={{ color: 'var(--gray-1)', lineHeight: 1.8, marginBottom: '16px' }}>
            We started Hilgod because we believed Nigerians deserved a better online shopping experience — one built on trust, speed, and genuine quality. From Benin City to Lagos, Abuja to Kano, we are building the infrastructure that lets every Nigerian shop and sell confidently online.
          </p>
          <p style={{ color: 'var(--gray-1)', lineHeight: 1.8 }}>
            Whether you are a buyer looking for the best deal or a seller wanting to reach more customers, Hilgod is your platform.
          </p>
        </div>
        <div style={{ background: 'var(--gray-6)', borderRadius: 'var(--radius-md)', padding: '32px', border: '1px solid var(--gray-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {[
              { label: 'Products', value: '10,000+' },
              { label: 'Sellers', value: '500+' },
              { label: 'Orders Delivered', value: '50,000+' },
              { label: 'Cities Covered', value: '36+' },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(1.6rem,4vw,2.2rem)', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: '.82rem', color: 'var(--gray-1)', marginTop: '6px', fontWeight: 600 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Values */}
      <div style={{ marginBottom: 'var(--space-10)' }}>
        <h2 style={{ fontSize: 'clamp(1.3rem,3vw,1.8rem)', fontWeight: 800, textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          What We Stand For
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 'var(--space-5)' }}>
          {values.map(v => (
            <div key={v.title} style={{ background: 'var(--white)', border: '1px solid var(--gray-4)', borderRadius: 'var(--radius-md)', padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--primary-xlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className={`fas ${v.icon}`} style={{ fontSize: '1.4rem', color: 'var(--primary)' }}></i>
              </div>
              <h3 style={{ fontWeight: 700, marginBottom: '10px', fontSize: '1.1rem' }}>{v.title}</h3>
              <p style={{ color: 'var(--gray-1)', fontSize: '.9rem', lineHeight: 1.7, margin: 0 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ marginBottom: 'var(--space-10)' }}>
        <h2 style={{ fontSize: 'clamp(1.3rem,3vw,1.8rem)', fontWeight: 800, textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          Our Journey
        </h2>
        <div style={{ position: 'relative', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0, bottom: 0, width: '2px', background: 'var(--gray-4)' }} />
          {milestones.map((m, i) => (
            <div key={m.year} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start', paddingBottom: 'var(--space-6)', position: 'relative' }}>
              <div style={{
                width: '44%',
                background: 'var(--white)',
                border: '1px solid var(--gray-4)',
                borderRadius: 'var(--radius)',
                padding: '20px',
                position: 'relative',
              }}>
                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', marginBottom: '4px' }}>{m.year} — {m.label}</div>
                <p style={{ color: 'var(--gray-1)', fontSize: '.88rem', margin: 0, lineHeight: 1.6 }}>{m.desc}</p>
              </div>
              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '20px', width: '14px', height: '14px', borderRadius: '50%', background: 'var(--primary)', border: '3px solid #fff', boxShadow: '0 0 0 2px var(--primary)' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div style={{ marginBottom: 'var(--space-10)' }}>
        <h2 style={{ fontSize: 'clamp(1.3rem,3vw,1.8rem)', fontWeight: 800, textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          The Team Behind Hilgod
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 'var(--space-5)' }}>
          {team.map(member => (
            <div key={member.name} style={{ textAlign: 'center' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>
                {member.initials}
              </div>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>{member.name}</div>
              <div style={{ fontSize: '.82rem', color: 'var(--gray-1)' }}>{member.role}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact CTA */}
      <div style={{ background: 'var(--gray-6)', border: '1px solid var(--gray-4)', borderRadius: 'var(--radius-md)', padding: 'clamp(28px,6vw,48px)', textAlign: 'center', marginBottom: 'var(--space-10)' }}>
        <h2 style={{ fontWeight: 800, fontSize: 'clamp(1.2rem,3vw,1.7rem)', marginBottom: '12px' }}>Get in Touch</h2>
        <p style={{ color: 'var(--gray-1)', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.7 }}>
          Have questions, feedback, or want to partner with us? We&apos;d love to hear from you.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="mailto:hilgodonline@gmail.com" className="btn btn-primary btn-mobile-full">
            <i className="fas fa-envelope"></i> hilgodonline@gmail.com
          </a>
          <a href="https://wa.me/2348080535728" className="btn btn-outline btn-mobile-full" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-whatsapp"></i> WhatsApp
          </a>
        </div>
        <div style={{ marginTop: '16px', fontSize: '.88rem', color: 'var(--gray-1)' }}>
          <i className="fas fa-map-marker-alt" style={{ marginRight: '6px', color: 'var(--primary)' }}></i>
          21 Agbor Road, Oredo, Benin City, Edo State, Nigeria
        </div>
      </div>
    </Layout>
  );
}
