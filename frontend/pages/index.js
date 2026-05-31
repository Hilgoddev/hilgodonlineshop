import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { normalizePricing, withNormalizedPricing } from '@/lib/pricing';
import { fetchJsonWithTimeout } from '@/lib/catalogApi';

const CATEGORY_IMAGES = {
  womenswear: 'https://plus.unsplash.com/premium_photo-1661351421471-b288544c3dda?w=600&auto=format&fit=crop&q=60',
  home: 'https://plus.unsplash.com/premium_photo-1678742388597-d9d76a759d14?w=600&auto=format&fit=crop&q=60',
  'home-kitchen': 'https://plus.unsplash.com/premium_photo-1678742388597-d9d76a759d14?w=600&auto=format&fit=crop&q=60',
  gaming: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=60',
  herbs: 'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=600&auto=format&fit=crop&q=60',
  'herbs-spices': 'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=600&auto=format&fit=crop&q=60',
  electronics: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&auto=format&fit=crop&q=60',
  menswear: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&auto=format&fit=crop&q=60',
  fashion: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&auto=format&fit=crop&q=60',
  beauty: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=60',
  'beauty-health': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=60',
  sports: 'https://images.unsplash.com/photo-1461897104016-0b3b00cc81ee?w=600&auto=format&fit=crop&q=60',
  'sports-outdoors': 'https://images.unsplash.com/photo-1461897104016-0b3b00cc81ee?w=600&auto=format&fit=crop&q=60',
  books: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&auto=format&fit=crop&q=60',
  baby: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&auto=format&fit=crop&q=60',
  automotive: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&auto=format&fit=crop&q=60',
  accessories: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=60',
};

export default function Home({ products, categories = [], flashSales = [] }) {
  const [catalogProducts, setCatalogProducts] = useState(products || []);
  const [catalogLoading, setCatalogLoading] = useState(!products || products.length === 0);
  const [flashProducts, setFlashProducts] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [electronics, setElectronics] = useState([]);
  const [menswear, setMenswear] = useState([]);
  const [womenswear, setWomenswear] = useState([]);
  const [beauty, setBeauty] = useState([]);
  const [homeKitchen, setHomeKitchen] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [flashCountdown, setFlashCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [currentSlide, setCurrentSlide] = useState(0);

  // Handle swipe scroll on mobile
  const handleScroll = (e) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return;
    const container = e.currentTarget;
    const slideWidth = container.clientWidth;
    if (slideWidth === 0) return;
    const newIndex = Math.round(container.scrollLeft / slideWidth);
    if (newIndex >= 0 && newIndex < heroSlides.length && newIndex !== currentSlide) {
      setCurrentSlide(newIndex);
    }
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      const container = document.getElementById('hero-slider');
      if (container) {
        const targetScroll = currentSlide * container.clientWidth;
        if (Math.abs(container.scrollLeft - targetScroll) > 5) {
          container.scrollTo({ left: targetScroll, behavior: 'smooth' });
        }
      }
    }
  }, [currentSlide]);

  useEffect(() => {
    setCatalogProducts(products || []);
    setCatalogLoading(!products || products.length === 0);
  }, [products]);

  const baseSlides = [
    {
      id: 1,
      bg: 'linear-gradient(135deg,#2e1a3f 0%,#4a1a5e 50%,#1a0a2e 100%)',
      tag: { text: 'New Arrivals', icon: 'fas fa-star', color: '#ec4899' },
      title: 'Elegant Dresses<br /><span>Style for All</span>',
      sub: 'Discover the latest evening and casual dresses.',
      btnLink: '/products?category=womenswear',
      btnText: 'Shop Fashion',
      img: 'https://plus.unsplash.com/premium_photo-1661351421471-b288544c3dda?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8V29tZW5zd2VhcnxlbnwwfHwwfHx8MA%3D%3D'
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
      bg: 'linear-gradient(135deg,#064e3b 0%,#065f46 50%,#047857 100%)',
      tag: { text: 'Home Essentials', icon: 'fas fa-house', color: '#34d399' },
      title: 'Home Supplies<br /><span>For Every Room</span>',
      sub: 'Quality home products for your kitchen, bedroom, and living space.',
      btnLink: '/products?category=home',
      btnText: 'Shop Home',
      img: 'https://plus.unsplash.com/premium_photo-1678742388597-d9d76a759d14?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fEhvbWUlMjBTdXBwbGllc3xlbnwwfHwwfHx8MA%3D%3D'
    }
  ];

  // Inject a real flash sale slide at position 2 only when active sales exist
  const heroSlides = (() => {
    if (flashSales.length === 0) return baseSlides;
    const sale = flashSales[0];
    const prod = sale.products || {};
    const flashProduct = withNormalizedPricing({
      ...prod,
      _id: prod.id || sale.product_id,
      id: prod.id || sale.product_id,
      price: sale.sale_price,
      originalPrice: sale.original_price || prod.price,
      badge: 'sale',
    });
    const discountPct = normalizePricing(flashProduct).discountPercent;
    const flashSlide = {
      id: 'flash',
      bg: 'linear-gradient(135deg,#1a1a1a 0%,#2d1a1a 50%,#3d0000 100%)',
      tag: { text: 'Flash Sale', icon: 'fas fa-bolt', color: '#ef4444' },
      title: `${prod.name || 'Flash Sale'}<br /><span>${discountPct > 0 ? `Up to ${discountPct}% Off` : 'Limited Time Deal'}</span>`,
      sub: 'Limited-time offer. Grab it before the timer runs out!',
      btnLink: '/flash-sales',
      btnText: 'Shop Flash Sales',
      isFlash: true,
      img: (prod.images && prod.images[0]) || prod.image_url || 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=500&q=80',
    };
    return [baseSlides[0], flashSlide, ...baseSlides.slice(1)];
  })();

  // Auto-rotate slides (all devices - including mobile)
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 5000); // 5 seconds

    return () => clearInterval(slideTimer);
  }, [heroSlides.length]);

  // Initialize products by category
  useEffect(() => {
    if (catalogProducts && catalogProducts.length > 0) {
      const cat = (p) => (p.category || '').toLowerCase();

      const best = [...catalogProducts]
        .sort((a, b) => (b.ratings?.count || 0) - (a.ratings?.count || 0))
        .slice(0, 5);
      setBestsellers(best);

      setElectronics(catalogProducts.filter(p => ['electronics', 'accessories', 'phones', 'laptops', 'gadgets'].includes(cat(p))).slice(0, 5));
      setMenswear(catalogProducts.filter(p => ['menswear', 'shoes', 'men', 'fashion'].includes(cat(p))).slice(0, 5));
      setWomenswear(catalogProducts.filter(p => ['womenswear', 'women', 'fashion'].includes(cat(p))).slice(0, 5));
      setBeauty(catalogProducts.filter(p => ['beauty', 'beauty-health', 'skincare', 'cosmetics', 'personal-care'].includes(cat(p))).slice(0, 5));
      setHomeKitchen(catalogProducts.filter(p => ['home', 'kitchen', 'home-kitchen', 'appliances', 'furniture'].includes(cat(p))).slice(0, 5));

      const newProducts = [...catalogProducts]
        .sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at))
        .slice(0, 5);
      setNewArrivals(newProducts);
    } else if (!catalogLoading) {
      setBestsellers([]);
      setElectronics([]);
      setMenswear([]);
      setWomenswear([]);
      setBeauty([]);
      setHomeKitchen([]);
      setNewArrivals([]);
    }
  }, [catalogProducts, catalogLoading]);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      if (products && products.length > 0) return;

      const data = await fetchJsonWithTimeout('/api/products?limit=500', 15000);
      if (cancelled || !data?.success || !Array.isArray(data.data)) return;

      setCatalogProducts(data.data);
      setCatalogLoading(false);
    };

    loadProducts().finally(() => {
      if (!cancelled) setCatalogLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [products]);

  // Countdown driven by the first active flash sale's expires_at
  useEffect(() => {
    if (flashSales.length === 0) return;
    const target = new Date(flashSales[0].expires_at);
    const update = () => {
      const diff = Math.max(0, target - Date.now());
      setFlashCountdown({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  // Format time for display
  const formatTime = (num) => num.toString().padStart(2, '0');

  // Map flash sales to ProductCard-compatible shape
  const flashProductCards = flashSales.map(sale => {
    const prod = sale.products || {};
    return withNormalizedPricing({
      ...prod,
      _id: prod.id || sale.product_id,
      id: prod.id || sale.product_id,
      price: sale.sale_price,
      originalPrice: sale.original_price || prod.price,
      badge: 'sale',
    });
  });

  return (
    <Layout
      title="Hilgod Online Store — Shop Electronics, Phones, Appliances, Fashion & More"
      description="Shop the best deals on Electronics, Phones, Appliances, Fashion, Gadgets and more at Hilgod Online Store. Fast delivery across Nigeria. Secure payments."
    >
      {/* Hero Slider — Single element with dynamic content for smooth transitions */}
      <div
        className="hero-slider"
        id="hero-slider"
        style={{
          borderRadius: 0,
          overflow: 'hidden',
          marginBottom: 'var(--space-4)',
          position: 'relative',
          marginLeft: '-1rem',
          marginRight: '-1rem',
          marginTop: '-1rem',
          width: 'calc(100% + 2rem)'
        }}
      >
        {heroSlides.length > 0 && (() => {
          const slide = heroSlides[currentSlide];
          return (
            <div className="hero-slide active" style={{ position: 'relative', width: '100%', height: '100%' }}>
              <div className="hero-bg" style={{ background: slide.bg }}></div>
              <div className="hero-overlay"></div>
              <div className="hero-content">
                <span className="hero-tag" style={{ background: slide.tag.color || 'var(--primary)' }}>
                  <i className={slide.tag.icon}></i> {slide.tag.text}
                </span>
                <h1 className="hero-title"
                  dangerouslySetInnerHTML={{ __html: slide.title }}
                  style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                ></h1>
                <p className="hero-sub">{slide.sub}</p>
                {/* Hero Button Section */}
                <div className="hero-actions"
                  //  flexWrap: 'wrap',
                  style={{ gap: 'var(--space-2)' }}
                >
                  <a href={slide.btnLink}
                    className="btn btn-primary btn-lg btn-mobile-full"
                  >
                    <i className="fas fa-shopping-cart"></i> {slide.btnText}
                  </a>
                  {slide.isFlash && (
                    <a href="/flash-sales"
                      className="btn btn-lg btn-mobile-full"
                      style={{ background: 'rgba(255,255,255,.15)', color: '#fff', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,.2)' }}>
                      <i className="fas fa-fire"></i> View All Deals
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
          );
        })()}

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
              onClick={() => goToSlide(index)}
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
      <div className="categories-section" style={{ marginBottom: 'var(--space-6)', marginTop: 'var(--space-4)', padding: '1rem' }}>
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
            <style dangerouslySetInnerHTML={{
              __html: `
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
                    src={CATEGORY_IMAGES[category.slug] || category.image || category.image_url || 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150&q=80'}
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
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button
              className="scroll-btn"
              onClick={() => { const el = document.getElementById('categories-scroll'); el?.scrollBy({ left: -300, behavior: 'smooth' }); }}
              aria-label="Scroll left"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <button
              className="scroll-btn"
              onClick={() => { const el = document.getElementById('categories-scroll'); el?.scrollBy({ left: 300, behavior: 'smooth' }); }}
              aria-label="Scroll right"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>


      {/* 2-Column Banner */}
      <div className="banner-2col">
        <div className="banner-card" onClick={() => window.location.href = '/products?category=gaming'}>
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
        <div className="banner-card" onClick={() => window.location.href = '/products?category=appliances'}>
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

      {/* Flash Sales Section — only visible when active flash sales exist */}
      {flashSales.length > 0 && (
        <div className="products-section">
          <style jsx>{`
            .flash-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              flex-wrap: wrap;
            }
            .flash-meta {
              display: flex;
              align-items: center;
              gap: 12px;
              flex-wrap: wrap;
              justify-content: flex-end;
              flex-direction: column;
              align-items: flex-end;
            }
            .flash-timer {
              display: flex;
              align-items: center;
              gap: 2px;
              flex-wrap: nowrap;
              white-space: nowrap;
            }
            .flash-timer-label {
              color: #64748b;
              font-weight: 700;
              font-size: 0.72rem;
              padding-top: 0;
              white-space: nowrap;
              margin-right: 2px;
            }
            .flash-timer-box {
              display: inline-block;
              min-width: 44px;
              background: transparent;
              color: #ef4444;
              font-weight: 900;
              font-size: 1.22rem;
              border-radius: 6px;
              text-align: center;
              padding: 2px 4px;
              line-height: 1;
              box-shadow: none;
            }
            .flash-timer-unit {
              color: #ef4444;
              font-size: 0.5rem;
              font-weight: 700;
              margin-top: 1px;
              letter-spacing: 0.06em;
            }
            .flash-timer-sep {
              color: #ef4444;
              font-weight: 900;
              font-size: 1.1rem;
              padding-top: 0;
            }
            @media (max-width: 640px) {
              .flash-header {
                align-items: flex-start;
              }
              .flash-meta {
                width: 100%;
                justify-content: flex-start;
                align-items: flex-end;
                gap: 6px;
              }
              .flash-timer {
                gap: 1px;
              }
              .flash-timer-label {
                font-size: 0.56rem;
                margin-right: 1px;
              }
              .flash-timer-box {
                min-width: 30px;
                font-size: 0.86rem;
                padding: 1px 3px;
                border-radius: 4px;
              }
              .flash-timer-unit {
                font-size: 0.42rem;
              }
              .flash-timer-sep {
                font-size: 0.8rem;
                padding-top: 0;
              }
            }
            @media (max-width: 420px) {
              .flash-header {
                gap: 8px;
              }
              .flash-meta {
                gap: 4px;
              }
              .flash-timer-label {
                display: none;
              }
              .flash-timer-box {
                min-width: 27px;
                font-size: 0.78rem;
                padding: 1px 2px;
              }
              .flash-timer-unit {
                font-size: 0.38rem;
                letter-spacing: 0.04em;
              }
              .flash-timer-sep {
                font-size: 0.72rem;
              }
            }
          `}</style>
          <div className="section-header flash-header" style={{ background: 'transparent', boxShadow: 'none' }}>
            <h2 className="section-title">
              <span className="bar"></span>
              <i className="fas fa-bolt" style={{ color: '#ef4444', marginRight: '6px' }} />
              Flash Sales
            </h2>
            <div className="flash-meta">
              {/* Countdown timer on the right */}
              <div className="flash-timer">
                <span className="flash-timer-label">
                  <i className="fas fa-clock" style={{ marginRight: '3px' }} />Ends in:
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span className="flash-timer-box">{formatTime(flashCountdown.hours)}</span>
                  <span className="flash-timer-unit">HRS</span>
                </span>
                <span className="flash-timer-sep">:</span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span className="flash-timer-box">{formatTime(flashCountdown.minutes)}</span>
                  <span className="flash-timer-unit">MIN</span>
                </span>
                <span className="flash-timer-sep">:</span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span className="flash-timer-box">{formatTime(flashCountdown.seconds)}</span>
                  <span className="flash-timer-unit">SEC</span>
                </span>
              </div>
              <Link href="/flash-sales" className="section-link">View All Deals <i className="fas fa-arrow-right"></i></Link>
            </div>
          </div>
          <div className="product-grid-5">
            {flashProductCards.slice(0, 5).map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </div>
      )}

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
        <div className="mini-banner" onClick={() => window.location.href = '/products?category=phones'} style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}>
          <div className="mini-banner__text"><h4><i className="fas fa-mobile-screen-button"></i> Phones</h4><p>Latest Arrivals</p></div>
        </div>
        <div className="mini-banner" onClick={() => window.location.href = '/products?category=laptops'} style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e3a8a)' }}>
          <div className="mini-banner__text"><h4><i className="fas fa-laptop"></i> Laptops</h4><p>Work Smarter</p></div>
        </div>
        <div className="mini-banner" onClick={() => window.location.href = '/products?category=fashion'} style={{ background: 'linear-gradient(135deg,#7c3aed,#4c1d95)' }}>
          <div className="mini-banner__text"><h4><i className="fas fa-shirt"></i> Fashion</h4><p>New Styles Daily</p></div>
        </div>
        <div className="mini-banner" onClick={() => window.location.href = '/products?category=gadgets'} style={{ background: 'linear-gradient(135deg,#047857,#065f46)' }}>
          <div className="mini-banner__text"><h4><i className="fas fa-headphones"></i> Gadgets</h4><p>Tech Accessories</p></div>
        </div>
      </div>

      {catalogLoading && catalogProducts.length === 0 && (
        <div className="products-section" style={{ textAlign: 'center', padding: '28px 16px' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
          <p style={{ marginTop: '12px', color: 'var(--gray-1)' }}>Loading products...</p>
        </div>
      )}

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
      <div style={{ marginBottom: 'var(--space-6)', cursor: 'pointer' }} onClick={() => window.location.href = '/seller-zone'}>
        <div className="sell-banner-inner">
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
            <h2 style={{ fontSize: 'clamp(1.2rem,4vw,1.8rem)', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>
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

      {/* Contact Us */}
      <div className="contact-us-section">
        <div className="contact-us-inner">
          <div className="contact-us-heading">
            <div className="contact-us-tag">
              <i className="fas fa-headset"></i> SUPPORT
            </div>
            <h2>We're Here to Help</h2>
            <p>Have a question, complaint, or partnership inquiry? Reach out through any of the channels below.</p>
          </div>
          <div className="contact-us-cards">
            <a href="mailto:hilgodonline@gmail.com" className="contact-card">
              <div className="contact-card-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                <i className="fas fa-envelope"></i>
              </div>
              <div>
                <div className="contact-card-label">Email Us</div>
                <div className="contact-card-value">hilgodonline@gmail.com</div>
              </div>
            </a>
            <a href="https://wa.me/+2348080535728" target="_blank" rel="noopener noreferrer" className="contact-card">
              <div className="contact-card-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                <i className="fab fa-whatsapp"></i>
              </div>
              <div>
                <div className="contact-card-label">WhatsApp</div>
                <div className="contact-card-value">Chat with us</div>
              </div>
            </a>
            <a href="/track-order" className="contact-card">
              <div className="contact-card-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
                <i className="fas fa-truck-fast"></i>
              </div>
              <div>
                <div className="contact-card-label">Track Your Order</div>
                <div className="contact-card-value">Real-time updates</div>
              </div>
            </a>
            <a href="/return-request" className="contact-card">
              <div className="contact-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                <i className="fas fa-rotate-left"></i>
              </div>
              <div>
                <div className="contact-card-label">Returns & Refunds</div>
                <div className="contact-card-value">7-day return policy</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Fetch products data on the server side
export async function getServerSideProps() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

    // Fetch products, categories and active flash sales in parallel
    const [prodData, catData, flashData] = await Promise.all([
      fetchJsonWithTimeout(`${baseUrl}/products?limit=100`, 4000),
      fetchJsonWithTimeout(`${baseUrl}/categories`, 4000),
      fetchJsonWithTimeout(`${baseUrl}/flash-sales`, 4000),
    ]);

    let products = [];
    let categories = [];
    let flashSales = [];

    if (prodData?.success && prodData.data) {
      products = prodData.data;
    }

    if (catData?.success && catData.data) {
      categories = catData.data;
    }

    if (flashData?.success && flashData.data) {
      flashSales = flashData.data;
    }

    return {
      props: {
        products,
        categories,
        flashSales,
      },
    };
  } catch (error) {
    console.error('Error fetching data, using fallback:', error);
    return {
      props: {
        products: [],
        categories: [],
        flashSales: [],
      },
    };
  }
}
