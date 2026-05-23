import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { CurrencyProvider } from '../contexts/CurrencyContext'
import { SessionProvider } from '../contexts/AuthContext'
import ShopProvider from '../components/ShopProvider'
import '../css/main.css'
import '../css/header.css'
import '../css/footer.css'
import '../css/home.css'
import '../css/pages.css'
import '../css/products.css'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const getLayout = Component.getLayout ?? ((page) => page)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (apiUrl) fetch(`${apiUrl}/health`).catch(() => {})
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    const handleRouteChange = () => window.scrollTo(0, 0)
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => router.events.off('routeChangeComplete', handleRouteChange)
  }, [router.events])

  return (
    <SessionProvider>
      <CurrencyProvider>
        <ShopProvider>
          {getLayout(<Component {...pageProps} />)}
          <Analytics />
          <SpeedInsights />
        </ShopProvider>
      </CurrencyProvider>
    </SessionProvider>
  )
}