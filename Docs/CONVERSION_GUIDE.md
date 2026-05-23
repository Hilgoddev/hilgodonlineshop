# 🔄 HTML to Next.js Conversion Guide - Hilgod Online Shop

## ✅ What's Been Created So Far

### Components Created:
1. ✅ `components/AuthGuard.js` - Protects pages requiring login
2. ✅ `components/AdminGuard.js` - Protects admin-only pages

---

## 📋 Complete Conversion Checklist

### Phase 1: Core Components (Create These First)

#### 1. components/Layout.js
```javascript
import Head from 'next/head';
import Navbar from './Navbar';
import Footer from './Footer';
import '../css/main.css';
import '../css/header.css';
import '../css/footer.css';

export default function Layout({ children, title = 'Hilgod Online Store' }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Shop the best deals at Hilgod Online Store" />
        <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
      </Head>
      <Navbar />
      <main className="page-wrapper">
        {children}
      </main>
      <Footer />
    </>
  );
}
```

#### 2. components/Navbar.js
- Convert header HTML from index.html
- Use `useSession()` for auth state
- Replace `<a>` tags with `<Link>` from next/link
- Add cart count from localStorage
- Implement search functionality

#### 3. components/Footer.js  
- Copy footer HTML from index.html (lines 438-568)
- Replace all links with Next.js Link components

#### 4. components/ProductCard.js
```javascript
import Link from 'next/link';
import Image from 'next/image';

export default function ProductCard({ product }) {
  const addToCart = () => {
    // Cart logic here
  };

  return (
    <div className="product-card">
      <Link href={`/products/${product._id}`}>
        <img src={product.images?.[0] || '/placeholder.jpg'} alt={product.name} />
      </Link>
      <h3>{product.name}</h3>
      <p className="price">₦{product.price.toLocaleString()}</p>
      <button onClick={addToCart}>Add to Cart</button>
    </div>
  );
}
```

---

## 🎯 Page Conversion Strategy

### For EACH HTML file, follow these steps:

1. **Read the entire HTML file**
2. **Extract the main content** (inside `<main>` or page-specific divs)
3. **Create React component** with:
   - Import statements
   - Component function
   - State management (useState, useEffect)
   - API calls (fetch)
   - Return JSX
4. **Replace HTML elements**:
   - `<a href="...">` → `<Link href="...">`
   - `<img src="...">` → Keep as is or use `next/image`
   - `onclick="..."` → `onClick={() => ...}`
   - Inline scripts → React hooks
5. **Add CSS imports** at top of file
6. **Wrap with Layout component**

---

## 📝 Template for Converting Any Page

```javascript
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard'; // If protected

export default function PageName() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/endpoint');
      const result = await res.json();
      setData(result.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Layout title="Page Title">
      {/* Paste converted HTML content here */}
    </Layout>
  );
}
```

---

## 🔑 Key Conversions Needed

### 1. Authentication Pages

#### pages/auth/login.js
- Convert login.html form
- Use `signIn('credentials')` from next-auth/react
- Add Google button: `signIn('google')`
- Redirect on success: `router.push('/')`

#### pages/auth/signup.js  
- Convert signup.html form
- POST to `/api/signup`
- Redirect to login on success

### 2. Product Pages

#### pages/products/index.js
- Fetch from `/api/products`
- Add filters (category, price, etc.)
- Pagination support

#### pages/products/[id].js
- Use `useRouter().query.id`
- Fetch single product from `/api/products/[id]`
- Add to cart functionality

### 3. Shopping Pages

#### pages/cart.js
- Read cart from localStorage
- Display items
- Calculate totals
- Sync with backend

#### pages/checkout.js
- Wrap with `<AuthGuard>`
- Show cart summary
- Address form
- Call `/api/payment/initiate`

### 4. Account Pages

#### pages/account/index.js
- Wrap with `<AuthGuard>`
- Fetch user orders from `/api/orders`
- Display order history

---

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies (if not done)
npm install

# 2. Create components directory
mkdir components

# 3. Start dev server
npm run dev

# 4. Visit http://localhost:3000
```

---

## ⚠️ Important Notes

1. **DO NOT modify**: 
   - `.env.local`
   - `.gitignore`
   - `next.config.js`
   - Any files in `pages/api/`
   - Any files in `models/`
   - Any files in `lib/`

2. **PRESERVE**:
   - All CSS files in `css/`
   - All assets in `assets/`
   - All images

3. **USE pages/ router** (NOT app/)

4. **All pages must import Layout**

---

## 📊 Priority Order

1. **Components** (Layout, Navbar, Footer, ProductCard)
2. **Auth pages** (login, signup)
3. **Home page** (index.js)
4. **Product pages** (products listing, detail)
5. **Shopping pages** (cart, checkout, wishlist)
6. **Account pages** (account, track-order)
7. **Admin pages** (admin dashboard)

---

## 🧪 Testing Checklist

After converting each page:
- [ ] Page loads without errors
- [ ] CSS styles are applied correctly
- [ ] Links navigate properly
- [ ] Forms submit correctly
- [ ] API calls work
- [ ] Auth protection works (if applicable)
- [ ] Mobile responsive

---

**Would you like me to continue creating specific component files? Due to the large scope, I recommend we tackle this in phases. Which would you like me to create next?**

1. Layout + Navbar + Footer components
2. Auth pages (login/signup)
3. Home page (index.js)
4. Product pages
5. All remaining pages at once (will be very long)

Let me know your preference!
