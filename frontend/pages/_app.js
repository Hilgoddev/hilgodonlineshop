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
  // Support per-page custom layouts (used by login, signup, cart, etc.)
  const getLayout = Component.getLayout ?? ((page) => page)

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