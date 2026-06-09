import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { useCurrency } from '@/contexts/CurrencyContext';
import { normalizePricing, withNormalizedPricing } from '@/lib/pricing';
import { fetchJsonWithTimeout } from '@/lib/catalogApi';
import { resolveServerApiBase } from '@/lib/env';
import HomeCampaignSection from '@/components/HomeCampaignSection';

// Campaign types shown on the landing page, in display order. Each renders its
// own hero slide + its own deals section, only when it has active campaigns.
const CAMPAIGN_ORDER = ['flash', 'black_friday', 'easter'];
const CAMPAIGN_THEMES = {
  flash:        { title: 'Flash Sales',  icon: 'fa-bolt', accent: '#ef4444', href: '/flash-sales',  tag: 'Flash Sale',   heroBg: 'linear-gradient(135deg,#1a1a1a 0%,#2d1a1a 50%,#3d0000 100%)' },
  black_friday: { title: 'Black Friday', icon: 'fa-tag',  accent: '#f59e0b', href: '/black-friday', tag: 'Black Friday', heroBg: 'linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#000000 100%)' },
  easter:       { title: 'Easter Sale',  icon: 'fa-egg',  accent: '#8b5cf6', href: '/easter',       tag: 'Easter Sale',  heroBg: 'linear-gradient(135deg,#312e81 0%,#5b21b6 50%,#7e22ce 100%)' },
};

const CATEGORY_IMAGES = {
  womenswear: 'https://plus.unsplash.com/premium_photo-1661351421471-b288544c3dda?w=300&auto=format&fit=crop&q=60',
  home: 'https://plus.unsplash.com/premium_photo-1678742388597-d9d76a759d14?w=300&auto=format&fit=crop&q=60',
  'home-kitchen': 'https://plus.unsplash.com/premium_photo-1678742388597-d9d76a759d14?w=300&auto=format&fit=crop&q=60',
  gaming: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=60',
  herbs: 'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=300&auto=format&fit=crop&q=60',
  'herbs-spices': 'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=300&auto=format&fit=crop&q=60',
  electronics: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=300&auto=format&fit=crop&q=60',
  menswear: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=300&auto=format&fit=crop&q=60',
  fashion: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=300&auto=format&fit=crop&q=60',
  beauty: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&auto=format&fit=crop&q=60',
  'beauty-health': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&auto=format&fit=crop&q=60',
  sports: 'https://images.unsplash.com/photo-1461897104016-0b3b00cc81ee?w=300&auto=format&fit=crop&q=60',
  'sports-outdoors': 'https://images.unsplash.com/photo-1461897104016-0b3b00cc81ee?w=300&auto=format&fit=crop&q=60',
  books: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=300&auto=format&fit=crop&q=60',
  baby: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=300&auto=format&fit=crop&q=60',
  automotive: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=300&auto=format&fit=crop&q=60',
  accessories: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300&auto=format&fit=crop&q=60',
  // slugs from DB that aren't in the above list
  shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&auto=format&fit=crop&q=60',
  kitchen: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&auto=format&fit=crop&q=60',
  collectibles: 'https://images.unsplash.com/photo-1611604548018-d56bbd85d681?w=300&auto=format&fit=crop&q=60',
  toys: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=300&auto=format&fit=crop&q=60',
};

export default function Home({ products, categories = [], campaigns = [] }) {
  const { formatPrice } = useCurrency();
  const [catalogProducts, setCatalogProducts] = useState(products || []);
  const [catalogLoading, setCatalogLoading] = useState(!products || products.length === 0);
  const [categoryList, setCategoryList] = useState(categories || []);
  const [flashProducts, setFlashProducts] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [electronics, setElectronics] = useState([]);
  const [menswear, setMenswear] = useState([]);
  const [womenswear, setWomenswear] = useState([]);
  const [beauty, setBeauty] = useState([]);
  const [homeKitchen, setHomeKitchen] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
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
      title: `Premium Laptops<br /><span>From ${formatPrice(280000, 'NGN', false)}</span>`,
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

  // Group active campaigns by type, in display order, keeping only types that
  // actually have live campaigns. Drives both the hero slides and the sections.
  const campaignGroups = CAMPAIGN_ORDER
    .map((type) => ({ type, theme: CAMPAIGN_THEMES[type], items: campaigns.filter((c) => (c.type || 'flash') === type) }))
    .filter((g) => g.items.length > 0);

  // One hero slide per active campaign type, injected after the first base slide.
  const heroSlides = (() => {
    if (campaignGroups.length === 0) return baseSlides;
    const campaignSlides = campaignGroups.map(({ type, theme, items }) => {
      const sale = items[0];
      const prod = sale.products || {};
      const cardProduct = withNormalizedPricing({
        ...prod,
        _id: prod.id || sale.product_id,
        id: prod.id || sale.product_id,
        price: sale.sale_price,
        originalPrice: sale.original_price || prod.price,
        badge: 'sale',
      });
      const discountPct = normalizePricing(cardProduct).discountPercent;
      return {
        id: `campaign-${type}`,
        bg: theme.heroBg,
        tag: { text: theme.tag, icon: `fas ${theme.icon}`, color: theme.accent },
        title: `${prod.name || theme.title}<br /><span>${discountPct > 0 ? `Up to ${discountPct}% Off` : 'Limited Time Deal'}</span>`,
        sub: 'Limited-time offer. Grab it before the timer runs out!',
        btnLink: theme.href,
        btnText: `Shop ${theme.title}`,
        isFlash: true,
        img: (prod.images && prod.images[0]) || prod.image_url || 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=500&q=80',
      };
    });
    return [baseSlides[0], ...campaignSlides, ...baseSlides.slice(1)];
  })();

  // Auto-rotate slides (all devices - including mobile)
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 5000); // 5 seconds

    return () => clearInterval(slideTimer);
  }, [heroSlides.length]);

  // Bestsellers & New Arrivals derive from the loaded catalog sample.
  useEffect(() => {
    if (catalogProducts && catalogProducts.length > 0) {
      setBestsellers([...catalogProducts]
        .sort((a, b) => (b.ratings?.count || 0) - (a.ratings?.count || 0))
        .slice(0, 8));
      setNewArrivals([...catalogProducts]
        .sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at))
        .slice(0, 8));
    } else if (!catalogLoading) {
      setBestsellers([]);
      setNewArrivals([]);
    }
  }, [catalogProducts, catalogLoading]);

  // Category sections are fetched PER CATEGORY from the API. Filtering a small
  // shared sample let a dominant category (menswear has hundreds of items) crowd
  // the others out, leaving sections like Womenswear empty even though stock exists.
  useEffect(() => {
    let cancelled = false;
    // Same-origin /api (Next.js rewrite → backend) so category fetches don't depend
    // on the API host's CORS allowlist.
    const apiBase = '/api';
    const loadCat = async (slugs, setter) => {
      for (const slug of slugs) {
        try {
          const data = await fetchJsonWithTimeout(`${apiBase}/products?category=${encodeURIComponent(slug)}&limit=8`, 8000);
          if (!cancelled && data?.success && Array.isArray(data.data) && data.data.length) {
            setter(data.data.slice(0, 8));
            return;
          }
        } catch { /* try the next fallback slug */ }
      }
      if (!cancelled) setter([]);
    };
    loadCat(['electronics', 'accessories'], setElectronics);
    loadCat(['menswear', 'shoes'], setMenswear);
    loadCat(['womenswear'], setWomenswear);
    loadCat(['beauty'], setBeauty);
    loadCat(['home', 'kitchen'], setHomeKitchen);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      if (products && products.length > 0) return;

      const data = await fetchJsonWithTimeout(`/api/products?limit=20`, 15000);
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

  // Keep categories in sync with SSR props, and fall back to a client-side
  // fetch when SSR returned none (e.g. the server-side fetch timed out).
  useEffect(() => {
    if (categories && categories.length > 0) {
      setCategoryList(categories);
      return;
    }

    let cancelled = false;
    const loadCategories = async () => {
      const data = await fetchJsonWithTimeout(`/api/categories`, 15000);
      if (cancelled || !data?.success || !Array.isArray(data.data)) return;
      setCategoryList(data.data);
    };
    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [categories]);

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

            {categoryList.slice(0, 12).map(category => (
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
                    src={CATEGORY_IMAGES[category.slug] || category.image_url || 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300&q=80'}
                    alt={category.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300&q=80'; }}
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

      {/* Campaign sections - one per active type (Flash / Black Friday / Easter) */}
      {campaignGroups.map(({ type, theme, items }) => (
        <HomeCampaignSection key={type} campaigns={items} theme={theme} />
      ))}

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
            <a href="/account?tab=orders" className="contact-card">
              <div className="contact-card-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
                <i className="fas fa-box"></i>
              </div>
              <div>
                <div className="contact-card-label">My Orders</div>
                <div className="contact-card-value">View order history & status</div>
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
export async function getServerSideProps({ req }) {
  try {
    const baseUrl = resolveServerApiBase(req);

    // Fetch products, categories and ALL active campaigns (any type) in parallel
    const [prodData, catData, campaignData] = await Promise.all([
      fetchJsonWithTimeout(`${baseUrl}/products?limit=20`, 12000),
      fetchJsonWithTimeout(`${baseUrl}/categories`, 8000),
      fetchJsonWithTimeout(`${baseUrl}/campaigns`, 8000),
    ]);

    let products = [];
    let categories = [];
    let campaigns = [];

    if (prodData?.success && prodData.data) {
      products = prodData.data;
    }

    if (catData?.success && catData.data) {
      categories = catData.data;
    }

    if (campaignData?.success && campaignData.data) {
      campaigns = campaignData.data;
    }

    return {
      props: {
        products,
        categories,
        campaigns,
      },
    };
  } catch (error) {
    console.error('Error fetching data, using fallback:', error);
    return {
      props: {
        products: [],
        categories: [],
        campaigns: [],
      },
    };
  }
}
