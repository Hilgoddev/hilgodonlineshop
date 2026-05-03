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
        <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </Head>
      <div className="wrapper">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </div>
    </>
  );
}
