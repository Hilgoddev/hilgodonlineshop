import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from './Navbar';
import Footer from './Footer';
import { useSession } from '../contexts/AuthContext';

export default function Layout({ children, title = 'Hilgod Online Store', description = 'Shop fashion, electronics, beauty and everyday essentials from independent sellers on Hilgod.' }) {
  const { data: session } = useSession();
  const router = useRouter();
  const canonical = 'https://www.hilgod.com' + (router.asPath || '/').split(/[?#]/)[0];
  
  return (
    <>
      <Head>
        <title>{title}</title>
        <link rel="canonical" href={canonical} key="canonical" />
        <meta property="og:title" content={title} key="og:title" />
        <meta property="og:description" content={description} key="og:description" />
        <meta property="og:url" content={canonical} key="og:url" />
        {description && <meta name="description" content={description} />}
        {session?.user?.id && <meta name="user-id" content={session.user.id} />}
      </Head>
      <div className="wrapper">
        <Navbar />
        <aside aria-label="Hilgod customer support" style={{display:'flex',alignItems:'center',justifyContent:'center',flexWrap:'wrap',gap:'4px 16px',padding:'8px 16px',background:'#fff5f5',borderBottom:'1px solid #fee2e2',fontSize:'.85rem'}}>
          <span style={{fontWeight:600}}>Need help? +357 95 130549</span>
          <a href="tel:+35795130549" style={{display:'inline-flex',alignItems:'center',gap:6,minHeight:44,fontWeight:700,color:'#b91c1c'}}><i className="fas fa-phone" aria-hidden="true" /> Call us</a>
          <a href="https://wa.me/35795130549" target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:6,minHeight:44,fontWeight:700,color:'#15803d'}}><i className="fab fa-whatsapp" aria-hidden="true" /> WhatsApp</a>
        </aside>
        <main>{children}</main>
        <Footer />
      </div>
    </>
  );
}
