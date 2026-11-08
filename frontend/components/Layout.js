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
        <main>{children}</main>
        <Footer />
      </div>
    </>
  );
}
