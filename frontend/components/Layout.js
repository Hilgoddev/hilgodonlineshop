import Head from 'next/head';
import Navbar from './Navbar';
import Footer from './Footer';
import { useSession } from '../contexts/AuthContext';

export default function Layout({ children, title = 'Hilgod Online Store', description }) {
  const { data: session } = useSession();
  
  return (
    <>
      <Head>
        <title>{title}</title>
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
