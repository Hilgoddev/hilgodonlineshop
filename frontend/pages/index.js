import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { HILGOD_PRODUCTS } from '@/lib/products-data';

export default function Home({ products, categories = [] }) {
  const [flashProducts, setFlashProducts] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [electronics, setElectronics] = useState([]);
  const [menswear, setMenswear] = useState([]);
  const [womenswear, setWomenswear] = useState([]);
  const [beauty, setBeauty] = useState([]);
  const [homeKitchen, setHomeKitchen] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [countdown, setCountdown] = useState({ hours: 8, minutes: 0, seconds: 0 });
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroSlides = [
    {
      id: 1,
      bg: 'linear-gradient(135deg,#2e1a3f 0%,#4a1a5e 50%,#1a0a2e 100%)',
      tag: { text: 'New Arrivals', icon: 'fas fa-star', color: '#ec4899' },
      title: 'Elegant Dresses<br /><span>Style for All</span>',
      sub: 'Discover the latest evening and casual dresses.',
      btnLink: '/products?category=womenswear',
      btnText: 'Shop Fashion',
      img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&q=80'
    },
    {
      id: 2,
      bg: 'linear-gradient(135deg,#1a1a1a 0%,#2d1a1a 50%,#3d0000 100%)',
      tag: { text: 'Flash Sale', icon: 'fas fa-bolt', color: '#ef4444' },
      title: 'iPhone 15 Pro Max<br /><span>Up to 20% Off</span>',
      sub: 'Experience the power of A17 Pro chip. Limited time offer.',
      btnLink: '/products?category=electronics',
      btnText: 'Shop Now',
      img: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&q=80'
    },
    {
      id: 3,
      bg: 'linear-gradient(135deg,#3d1a2d 0%,#5e1a3b 50%,#2e0a1a 100%)',
      tag: { text: 'Trending Now', icon: 'fas fa-sparkles', color: '#f43f5e' },
      title: 'Beauty Essentials<br /><span>Glow Everyday</span>',
      sub: 'Top skincare and makeup from premium brands.',
      btnLink: '/products?category=beauty',
      btnText: 'Shop Beauty',
      img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80'
    },
    {
      id: 4,
      bg: 'linear-gradient(135deg,#0a1628 0%,#1a2d4d 50%,#0d3b6e 100%)',
      tag: { text: 'Hot Deal', icon: 'fas fa-laptop', color: '#f59e0b' },
      title: 'Premium Laptops<br /><span>From ₦280,000</span>',
      sub: 'MacBook Air, HP Pavilion, Dell XPS and more.',
      btnLink: '/products?category=electronics',
      btnText: 'Shop Laptops',
      img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&q=80'
    },
    {
      id: 5,
      bg: 'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)',
      tag: { text: 'Home Upgrade', icon: 'fas fa-tv', color: '#7c3aed' },
      title: 'Smart TVs<br /><span>4K & OLED</span>',
      sub: 'Transform your living room with stunning picture quality.',
      btnLink: '/products?category=electronics',
      btnText: 'Shop TVs',
      img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80'
    }
  ];

  // Auto-rotate slides
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 2000); // 2 seconds

    return () => clearInterval(slideTimer);
  }, [heroSlides.length]);

  // Initialize products by category
  useEffect(() => {
    if (products && products.length > 0) {
      // Flash sale products - first 4 products with high ratings
      const flash = products
        .filter(p => p.ratings?.average >= 4)
        .slice(0, 4);
      setFlashProducts(flash);

      // Bestsellers - products with highest rating count
      const best = [...products]
        .sort((a, b) => (b.ratings?.count || 0) - (a.ratings?.count || 0))
        .slice(0, 5);
      setBestsellers(best);

      // Category-specific products
      setElectronics(products.filter(p => p.category === 'electronics' || p.category === 'accessories').slice(0, 5));
      setMenswear(products.filter(p => p.category === 'menswear' || p.category === 'shoes').slice(0, 5));
      setWomenswear(products.filter(p => p.category === 'womenswear').slice(0, 5));
      setBeauty(products.filter(p => p.category === 'beauty').slice(0, 5));
      setHomeKitchen(products.filter(p => p.category === 'home' || p.category === 'kitchen').slice(0, 5));

      // New arrivals - most recent products
      const newProducts = [...products]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      setNewArrivals(newProducts);
    }
  }, [products]);

  // Countdown timer for flash sale
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 23, minutes: 59, seconds: 59 };
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time for display
  const formatTime = (num) => num.toString().padStart(2, '0');

  return (
    <Layout 
      title="Hilgod Online Store — Shop Electronics, Phones, Appliances, Fashion & More"
      description="Shop the best deals on Electronics, Phones, Appliances, Fashion, Gadgets and more at Hilgod Online Store. Fast delivery across Nigeria. Secure payments."
    >
      {/* Hero Slider */}
      <div className="hero-slider" id="hero-slider" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 'var(--space-4)', position: 'relative' }}>
        {heroSlides.map((slide, index) => (
          <div key={slide.id} className={`hero-slide ${index === currentSlide ? 'active' : ''}`} style={{ opacity: index === currentSlide ? 1 : 0, transition: 'opacity 0.5s ease-in-out', position: index === currentSlide ? 'relative' : 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: index === currentSlide ? 1 : 0 }}>
            <div className="hero-bg" style={{ background: slide.bg }}></div>
            <div className="hero-overlay"></div>
            <div className="hero-content">
              <span className="hero-tag" style={{ background: slide.tag.color || 'var(--primary)' }}>
                <i className={slide.tag.icon}></i> {slide.tag.text}
              </span>
              <h1 className="hero-title" dangerouslySetInnerHTML={{ __html: slide.title }}></h1>
              <p className="hero-sub">{slide.sub}</p>
              <div className="hero-actions">
                <a href={slide.btnLink} className="btn btn-primary btn-lg">
                  <i className="fas fa-shopping-cart"></i> {slide.btnText}
                </a>
                {index === 1 && (
                  <a href="/products" className="btn" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                    View All Deals
                  </a>
                )}
              </div>
            </div>
            <div className="hero-product-img">
              <img 
                src={slide.img} 
                alt="Product Promotion" 
                loading="lazy"
              />
            </div>
          </div>
        ))}

        {/* Controls */}
        <button 
          className="slider-arrow slider-prev" 
          aria-label="Previous"
          onClick={() => setCurrentSlide(prev => (prev - 1 + heroSlides.length) % heroSlides.length)}
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        <button 
          className="slider-arrow slider-next" 
          aria-label="Next"
          onClick={() => setCurrentSlide(prev => (prev + 1) % heroSlides.length)}
        >
          <i className="fas fa-chevron-right"></i>
        </button>
        <div className="slider-dots">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              className={`slider-dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            ></button>
          ))}
        </div>
      </div>

      {/* Trust Bar */}
      <div className="trust-bar" style={{ borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
        <div className="container">
          <div className="trust-item"><i className="fas fa-truck-fast"></i><span>Fast Delivery</span></div>
          <div className="trust-item"><i className="fas fa-shield-halved"></i><span>Secure Payments</span></div>
          <div className="trust-item"><i className="fas fa-rotate-left"></i><span>7-Day Returns</span></div>
          <div className="trust-item"><i className="fas fa-headset"></i><span>24/7 Support</span></div>
          <div className="trust-item"><i className="fas fa-award"></i><span>Genuine Products</span></div>
          <div className="trust-item"><i className="fas fa-percent"></i><span>Best Prices</span></div>
        </div>
      </div>

      {/* TikTok Style Categories List */}
      <div className="categories-section" style={{ marginBottom: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
        <div className="section-header" style={{ padding: '0 var(--space-3)' }}>
          <h2 className="section-title" style={{ fontSize: '1.4rem' }}>Shop by Category</h2>
          <a href="/categories" className="section-link">All Categories <i className="fas fa-arrow-right"></i></a>
        </div>
        
        <div style={{ position: 'relative' }}>
          <div className="categories-scroll" id="categories-scroll" style={{ 
            display: 'flex', 
            overflowX: 'auto', 
            padding: '10px var(--space-3) 20px', 
            gap: '15px',
            justifyContent: 'flex-start',
            scrollbarWidth: 'none', /* Firefox */
            msOverflowStyle: 'none' /* IE/Edge */
          }}>
            {/* Hide scrollbar for Webkit */}
            <style dangerouslySetInnerHTML={{__html: `
              .categories-scroll::-webkit-scrollbar { display: none; }
              .scroll-btn {
                position: absolute;
                right: 10px;
                top: 40%;
                transform: translateY(-50%);
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border: 1px solid var(--gray-4);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 10;
                transition: transform 0.2s, color 0.2s;
                color: var(--dark);
              }
              .scroll-btn:hover {
                transform: translateY(-50%) scale(1.1);
                color: var(--primary);
              }
              @media (max-width: 768px) {
                .scroll-btn { display: none; }
              }
            `}} />

            {categories.slice(0, 12).map(category => (
            <Link 
              key={category.id || category.slug}
              href={`/products?category=${category.slug}`}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                width: '85px', 
                flexShrink: 0,
                textDecoration: 'none'
              }}
            >
              <div style={{ 
                width: '75px', 
                height: '75px', 
                borderRadius: '50%', 
                background: 'var(--gray-6)',
                padding: '4px',
                marginBottom: '8px',
                border: '1px solid var(--gray-4)',
                transition: 'border-color 0.2s, transform 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--gray-4)'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <img 
                  src={category.image || category.image_url || 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150&q=80'} 
                  alt={category.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              </div>
              <span style={{ 
                fontSize: '.75rem', 
                fontWeight: '600', 
                textAlign: 'center', 
                lineHeight: '1.2',
                color: 'var(--dark)'
              }}>
                {category.name}
              </span>
            </Link>
          ))}
          </div>
          <button 
            className="scroll-btn" 
            onClick={() => {
              const scrollContainer = document.getElementById('categories-scroll');
              if (scrollContainer) {
                scrollContainer.scrollBy({ left: 300, behavior: 'smooth' });
              }
            }}
            aria-label="Scroll right"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>

      {/* Flash Sale */}
      <div className="flash-sale-section" id="todays-deals">
        <div className="flash-header">
          <div className="flash-title">
            <div className="flash-lightning"><i className="fas fa-bolt" style={{ color: '#fff' }}></i></div>
            <span>Flash Sale — Today's Deals</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="countdown">
              <div className="countdown-block">
                <div className="countdown-num" id="cd-hours">{formatTime(countdown.hours)}</div>
                <div className="countdown-label">Hours</div>
              </div>
              <span className="countdown-sep">:</span>
              <div className="countdown-block">
                <div className="countdown-num" id="cd-mins">{formatTime(countdown.minutes)}</div>
                <div className="countdown-label">Mins</div>
              </div>
              <span className="countdown-sep">:</span>
              <div className="countdown-block">
                <div className="countdown-num" id="cd-secs">{formatTime(countdown.seconds)}</div>
                <div className="countdown-label">Secs</div>
              </div>
            </div>
            <a href="/products" style={{ color: '#fff', fontWeight: '700', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              See All <i className="fas fa-arrow-right"></i>
            </a>
          </div>
        </div>
        <div className="flash-products" id="flash-products">
          {flashProducts.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </div>

      {/* 2-Column Banner */}
      <div className="banner-2col">
        <div className="banner-card" onClick={() => window.location.href='/products?category=gaming'}>
          <div className="banner-card__bg" style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)' }}></div>
          <div className="banner-card__overlay"></div>
          <div className="banner-card__content">
            <div className="banner-card__tag"><i className="fas fa-gamepad"></i> Gaming</div>
            <div className="banner-card__title">PlayStation 5 & Xbox</div>
            <div className="banner-card__sub">Next-gen gaming is here</div>
            <div className="btn btn-sm" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', width: 'fit-content', backdropFilter: 'blur(4px)' }}>
              Shop Now <i className="fas fa-arrow-right"></i>
            </div>
          </div>
        </div>
        <div className="banner-card" onClick={() => window.location.href='/products?category=appliances'}>
          <div className="banner-card__bg" style={{ background: 'linear-gradient(135deg,#1a0a2e,#2e1a3f,#4a1a5e)' }}></div>
          <div className="banner-card__overlay"></div>
          <div className="banner-card__content">
            <div className="banner-card__tag" style={{ color: '#c084fc' }}><i className="fas fa-blender"></i> Appliances</div>
            <div className="banner-card__title">Home Appliances</div>
            <div className="banner-card__sub">Upgrade your home experience</div>
            <div className="btn btn-sm" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', width: 'fit-content', backdropFilter: 'blur(4px)' }}>
              Shop Now <i className="fas fa-arrow-right"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Best Sellers */}
      <div className="products-section">
        <div className="section-header">
          <h2 className="section-title"><span className="bar"></span>Best Sellers</h2>
          <a href="/products" className="section-link">View All <i className="fas fa-arrow-right"></i></a>
        </div>
        <div className="product-grid-5" id="bestsellers-grid">
          {bestsellers.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </div>

      {/* 4-Mini Banners */}
      <div className="banner-4col">
        <div className="mini-banner" onClick={() => window.location.href='/products?category=phones'} style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}>
          <div className="mini-banner__text"><h4><i className="fas fa-mobile-screen-button"></i> Phones</h4><p>Latest Arrivals</p></div>
        </div>
        <div className="mini-banner" onClick={() => window.location.href='/products?category=laptops'} style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e3a8a)' }}>
          <div className="mini-banner__text"><h4><i className="fas fa-laptop"></i> Laptops</h4><p>Work Smarter</p></div>
        </div>
        <div className="mini-banner" onClick={() => window.location.href='/products?category=fashion'} style={{ background: 'linear-gradient(135deg,#7c3aed,#4c1d95)' }}>
          <div className="mini-banner__text"><h4><i className="fas fa-shirt"></i> Fashion</h4><p>New Styles Daily</p></div>
        </div>
        <div className="mini-banner" onClick={() => window.location.href='/products?category=gadgets'} style={{ background: 'linear-gradient(135deg,#047857,#065f46)' }}>
          <div className="mini-banner__text"><h4><i className="fas fa-headphones"></i> Gadgets</h4><p>Tech Accessories</p></div>
        </div>
      </div>

      {/* Electronics Section */}
      <div className="products-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="bar"></span>Tech & Electronics{' '}
            <span style={{ fontSize: '.8rem', color: 'var(--gray-1)', fontWeight: '400', marginLeft: '6px' }}>Top brands, best prices</span>
          </h2>
          <a href="/products?category=electronics" className="section-link">See All <i className="fas fa-arrow-right"></i></a>
        </div>
        <div className="product-grid-5" id="electronics-grid">
          {electronics.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </div>

      {/* Beauty Section */}
      <div className="products-section">
        <div className="section-header">
          <h2 className="section-title"><span className="bar"></span>Beauty & Personal Care</h2>
          <a href="/products?category=beauty" className="section-link">See All <i className="fas fa-arrow-right"></i></a>
        </div>
        <div className="product-grid-5" id="beauty-grid">
          {beauty.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </div>

      {/* New Arrivals */}
      <div className="products-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="bar"></span>New Arrivals{' '}
            <span className="badge badge-primary" style={{ fontSize: '.65rem', marginLeft: '6px' }}>NEW</span>
          </h2>
          <a href="/products" className="section-link">View All <i className="fas fa-arrow-right"></i></a>
        </div>
        <div className="product-grid-5" id="new-arrivals-grid">
          {newArrivals.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </div>

      {/* Menswear & Shoes Section */}
      <div className="products-section">
        <div className="section-header">
          <h2 className="section-title"><span className="bar"></span>Menswear & Shoes</h2>
          <a href="/products?category=menswear" className="section-link">See All <i className="fas fa-arrow-right"></i></a>
        </div>
        <div className="product-grid-5" id="menswear-grid">
          {menswear.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </div>

      {/* Womenswear Section */}
      <div className="products-section">
        <div className="section-header">
          <h2 className="section-title"><span className="bar"></span>Womenswear & Fashion</h2>
          <a href="/products?category=womenswear" className="section-link">See All <i className="fas fa-arrow-right"></i></a>
        </div>
        <div className="product-grid-5" id="womenswear-grid">
          {womenswear.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </div>

      {/* Home & Kitchen Section */}
      <div className="products-section">
        <div className="section-header">
          <h2 className="section-title"><span className="bar"></span>Home & Kitchen</h2>
          <a href="/products?category=home" className="section-link">See All <i className="fas fa-arrow-right"></i></a>
        </div>
        <div className="product-grid-5" id="home-grid">
          {homeKitchen.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </div>

      {/* Sell Banner */}
      <div className="banner-card" style={{ marginBottom: 'var(--space-6)', height: 'auto' }} onClick={() => window.location.href='/seller-zone'}>
        <div style={{ 
          background: 'linear-gradient(135deg,var(--dark),#2d2d2d)', 
          padding: 'var(--space-8) var(--space-12)', 
          borderRadius: 'var(--radius-md)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: '20px', 
          flexWrap: 'wrap' 
        }}>
          <div>
            <div style={{ 
              fontSize: '.78rem', 
              color: 'var(--primary-light)', 
              fontWeight: '700', 
              textTransform: 'uppercase', 
              letterSpacing: '.5px', 
              marginBottom: '6px' 
            }}>
              <i className="fas fa-store"></i> SELLER ZONE
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>
              Start Selling on Hilgod
            </h2>
            <p style={{ color: 'rgba(255,255,255,.7)', fontSize: '.95rem' }}>
              Reach millions of customers. Easy setup, zero monthly fees to start.
            </p>
          </div>
          <a href="/seller-zone" className="btn btn-primary btn-lg" onClick={(e) => e.stopPropagation()}>
            <i className="fas fa-arrow-right"></i> Become a Seller
          </a>
        </div>
      </div>
    </Layout>
  );
}

// Fetch products data on the server side
export async function getServerSideProps() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';
    
    // Fetch products and categories in parallel
    const [prodRes, catRes] = await Promise.all([
      fetch(`${baseUrl}/products?limit=100`),
      fetch(`${baseUrl}/categories`)
    ]);
    
    const prodData = await prodRes.json();
    const catData = await catRes.json();
    
    let products = [];
    let categories = [];

    if (prodData.success && prodData.data && prodData.data.length > 0) {
      products = prodData.data;
    } else {
      console.log('Using fallback product data');
      products = HILGOD_PRODUCTS.map(p => ({
        _id: p.id.toString(),
        name: p.name,
        brand: p.brand,
        description: p.description,
        price: p.price,
        originalPrice: p.originalPrice,
        images: [p.image],
        category: p.category,
        subcategory: p.subcategory,
        stock: p.inStock ? 100 : 0,
        ratings: { average: p.rating, count: p.reviews },
        badge: p.badge,
        createdAt: new Date().toISOString()
      }));
    }

    if (catData.success && catData.data && catData.data.length > 0) {
      categories = catData.data;
    } else {
      categories = [
        { id: 'beauty', name: 'Beauty & Care', slug: 'beauty', image_url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=150&q=80' },
        { id: 'womenswear', name: 'Womenswear', slug: 'womenswear', image_url: 'https://images.unsplash.com/photo-1515347619362-7164ff244837?w=150&q=80' },
        { id: 'menswear', name: 'Menswear', slug: 'menswear', image_url: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=150&q=80' },
        { id: 'electronics', name: 'Electronics', slug: 'electronics', image_url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=150&q=80' },
        { id: 'accessories', name: 'Accessories', slug: 'accessories', image_url: 'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=150&q=80' },
        { id: 'home', name: 'Home Supplies', slug: 'home', image_url: 'https://images.unsplash.com/photo-1583847268964-b28ce8f31586?w=150&q=80' },
        { id: 'kitchen', name: 'Kitchenware', slug: 'kitchen', image_url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=150&q=80' },
        { id: 'shoes', name: 'Shoes', slug: 'shoes', image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=150&q=80' },
        { id: 'sports', name: 'Sports', slug: 'sports', image_url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=150&q=80' },
        { id: 'toys', name: 'Toys', slug: 'toys', image_url: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=150&q=80' },
        { id: 'food', name: 'Food', slug: 'food', image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=150&q=80' },
        { id: 'collectibles', name: 'Collectibles', slug: 'collectibles', image_url: 'https://images.unsplash.com/photo-1611604548018-d56bbd85d681?w=150&q=80' }
      ];
    }
    
    return {
      props: {
        products,
        categories
      },
    };
  } catch (error) {
    console.error('Error fetching data, using fallback:', error);
    return {
      props: {
        products: [],
        categories: []
      },
    };
  }
}