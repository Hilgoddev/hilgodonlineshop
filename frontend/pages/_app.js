import { useEffect } from 'react'
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
  const getLayout = Component.getLayout ?? ((page) => page)

  useEffect(() => {
    // Wake up the Render backend immediately on first load so cold-start delay
    // is absorbed in the background rather than blocking the first real request.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (apiUrl) fetch(`${apiUrl}/health`).catch(() => {})
  }, [])

  return (
    <SessionProvider>
      <CurrencyProvider>
        <ShopProvider>
          {getLayout(<Component {...pageProps} />)}
        </ShopProvider>
      </CurrencyProvider>
    </SessionProvider>
  )
}