import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [storeRating, setStoreRating] = useState(null);

  // Site-wide rating badge (average + total review count across all products).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/reviews/overall')
      .then((r) => r.json())
      .then((j) => { if (!cancelled && j?.success && j.data?.count > 0) setStoreRating(j.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    setNewsletterSubmitting(true);
    setNewsletterStatus('');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      const json = await res.json();
      if (json.success) {
        setNewsletterStatus('success');
        setNewsletterEmail('');
      } else {
        setNewsletterStatus('error');
      }
    } catch {
      setNewsletterStatus('error');
    } finally {
      setNewsletterSubmitting(false);
    }
  };
  const categories = [
    { name: 'Accessories', slug: 'accessories' },
    { name: 'Beauty & Care', slug: 'beauty' },
    { name: 'Collectibles', slug: 'collectibles' },
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Gaming', slug: 'gaming' },
    { name: 'Herbs', slug: 'herbs' },
    { name: 'Home Supplies', slug: 'home' },
    { name: 'Kitchenware', slug: 'kitchen' },
    { name: 'Menswear', slug: 'menswear' },
    { name: 'Shoes', slug: 'shoes' },
    { name: 'Sports', slug: 'sports' },
    { name: 'Toys', slug: 'toys' },
    { name: 'Womenswear', slug: 'womenswear' },
  ];

  return (
    <footer className="site-footer">
      {/* Promo Strip */}
      <div className="footer-promo">
        <div className="container">
          <div className="promo-item">
            <div className="promo-icon"><i className="fas fa-truck-fast"></i></div>
            <div className="promo-text">
              <h4>Fast Delivery</h4>
              <p>Nationwide shipping</p>
            </div>
          </div>
          <div className="promo-item">
            <div className="promo-icon"><i className="fas fa-shield-halved"></i></div>
            <div className="promo-text">
              <h4>Secure Payment</h4>
              <p>100% protected</p>
            </div>
          </div>
          <div className="promo-item">
            <div className="promo-icon"><i className="fas fa-rotate-left"></i></div>
            <div className="promo-text">
              <h4>Easy Returns</h4>
              <p>7-day return policy</p>
            </div>
          </div>
          <div className="promo-item">
            <div className="promo-icon"><i className="fas fa-headset"></i></div>
            <div className="promo-text">
              <h4>24/7 Support</h4>
              <p>Always here to help</p>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter */}
      <div className="newsletter-strip">
        <div className="container">
          <div className="newsletter-text">
            <h3>Subscribe to Our Newsletter</h3>
            <p>Get the latest deals, new arrivals, and exclusive offers.</p>
          </div>
          {newsletterStatus === 'success' && (
            <div style={{ marginBottom: '8px', padding: '10px 16px', background: 'rgba(21,128,61,0.15)', color: '#86efac', borderRadius: '8px', fontWeight: 600, fontSize: '.9rem' }}>
              You are subscribed! Check your inbox.
            </div>
          )}
          {newsletterStatus === 'error' && (
            <div style={{ marginBottom: '8px', padding: '10px 16px', background: 'rgba(185,28,28,0.15)', color: '#fca5a5', borderRadius: '8px', fontWeight: 600, fontSize: '.9rem' }}>
              Something went wrong. Please try again.
            </div>
          )}
          <form
            className="newsletter-form"
            onSubmit={handleNewsletterSubmit}
          >
            <input
              type="email"
              className="newsletter-input"
              placeholder="Enter your email address..."
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
            />
            <button type="submit" className="newsletter-btn" disabled={newsletterSubmitting}>
              <i className="fas fa-paper-plane"></i> {newsletterSubmitting ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        </div>
      </div>

      {/* Main Footer Body */}
      <div className="footer-body">
        <div className="container">
          {/* About Column */}
          <div className="footer-col">
            <div className="footer-logo">
              <Link href="/">
                <img src="/logo.png" alt="Hilgod" style={{ height: '80px', width: 'auto' }} />
              </Link>
            </div>
            <p className="footer-about">
              Hilgod Online Store — Africa's trusted destination for Electronics, Phones, Appliances, Fashion and everything in between. Shop smart, live better.
            </p>
            {/* FUTURE UPGRADE: site-wide reviews page (/reviews) link — disabled for now.
            {storeRating && (
              <Link href="/reviews" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: '999px', padding: '6px 14px', textDecoration: 'none', color: '#fff', marginBottom: 'var(--space-3)' }}>
                <span style={{ color: '#f59e0b', letterSpacing: '1px' }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <i key={i} className={`fa${i <= Math.round(storeRating.average) ? 's' : 'r'} fa-star`} style={{ fontSize: '.72rem' }} />
                  ))}
                </span>
                <span style={{ fontWeight: 700, fontSize: '.85rem' }}>{storeRating.average.toFixed(1)}/5</span>
                <span style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.7)' }}>· {storeRating.count.toLocaleString()} review{storeRating.count !== 1 ? 's' : ''}</span>
              </Link>
            )}
            */}
            <div className="footer-contact-item">
              <i className="fas fa-map-marker-alt"></i>
              <span>21 Agbor Road, Oredo Benin City Edo Statea</span>
            </div>
            <div className="footer-contact-item">
              <i className="fas fa-phone"></i>
              <span>+234 808 053 5728, +357 95 130549</span>
            </div>
            <div className="footer-contact-item">
              <i className="fas fa-envelope"></i>
              <span>hilgodonline@gmail.com</span>
            </div>
            <div className="social-links">
              <a href="#" className="social-link" aria-label="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="social-link" aria-label="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="social-link" aria-label="TikTok">
                <i className="fab fa-tiktok"></i>
              </a>
              <a href="https://wa.me/+2348080535728" className="social-link" aria-label="WhatsApp">
                <i className="fab fa-whatsapp"></i>
        
              </a>
            </div>
            <div className="payments-section">
              <div className="payments-title">We Accept</div>
              <div className="payment-logos">
                <div className="payment-logo stripe"><i className="fas fa-s"></i> Stripe</div>
                <div className="payment-logo mastercard">GREY</div>
                <div className="payment-logo visa">VISA</div>
                <div className="payment-logo paystack">Paystack</div>
                <div className="payment-logo opay">OPay</div>
              </div>
            </div>
          </div>

          {/* Buy Column */}
          <div className="footer-col">
            <span className="footer-col-title">Shop</span>
            <div className="footer-links">
              {categories.map((cat) => (
                <Link key={cat.slug} href={`/products?category=${cat.slug}`}>
                  <i className="fas fa-chevron-right"></i>{cat.name}
                </Link>
              ))}
              <Link href="/categories">
                <i className="fas fa-chevron-right"></i>All Categories
              </Link>
            </div>
          </div>

          {/* Help Column */}
          <div className="footer-col">
            <span className="footer-col-title">Help & Info</span>
            <div className="footer-links">
              <Link href="/about"><i className="fas fa-chevron-right"></i>About Hilgod</Link>
              <a href="mailto:hilgodonline@gmail.com"><i className="fas fa-chevron-right"></i>Contact Us</a>
              <Link href="/careers"><i className="fas fa-chevron-right"></i>Careers</Link>
              <Link href="/blog"><i className="fas fa-chevron-right"></i>Blog</Link>
              <Link href="/categories"><i className="fas fa-chevron-right"></i>Sitemap</Link>
              <Link href="/privacy"><i className="fas fa-chevron-right"></i>Privacy Policy</Link>
              <Link href="/terms"><i className="fas fa-chevron-right"></i>Terms of Service</Link>
            </div>
          </div>

          {/* Account Column */}
          <div className="footer-col">
            <span className="footer-col-title">My Account</span>
            <div className="footer-links">
              <Link href="/auth/login"><i className="fas fa-chevron-right"></i>Login</Link>
              <Link href="/auth/signup"><i className="fas fa-chevron-right"></i>Register</Link>
              <Link href="/account"><i className="fas fa-chevron-right"></i>My Orders</Link>
              <Link href="/wishlist"><i className="fas fa-chevron-right"></i>My Wishlist</Link>
              <Link href="/cart"><i className="fas fa-chevron-right"></i>My Cart</Link>
              <Link href="/return-request"><i className="fas fa-chevron-right"></i>Return Request</Link>
              <Link href="/flash-sales"><i className="fas fa-chevron-right"></i>Flash Sales</Link>
            </div>
          </div>

          {/* Partners Column */}
          <div className="footer-col">
            <span className="footer-col-title">Partners</span>
            <Link href="/seller-zone" className="footer-cta-link">
              <i className="fas fa-store"></i>
              <div>
                <strong>Sell on Hilgod</strong>
                <br />
                <span style={{ fontSize: '.78rem' }}>Start your online shop today</span>
              </div>
            </Link>
            <Link href="/delivery" className="footer-cta-link">
              <i className="fas fa-motorcycle"></i>
              <div>
                <strong>Delivery Partner</strong>
                <br />
                <span style={{ fontSize: '.78rem' }}>Earn money with every delivery</span>
              </div>
            </Link>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <span className="footer-col-title">Download App</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <a 
                  href="#" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    background: 'rgba(255,255,255,.08)', 
                    border: '1px solid rgba(255,255,255,.15)', 
                    borderRadius: 'var(--radius)', 
                    padding: '8px 12px', 
                    color: 'rgba(255,255,255,.8)', 
                    fontSize: '.82rem', 
                    fontWeight: '600' 
                  }}
                >
                  <i className="fab fa-apple" style={{ fontSize: '1.2rem' }}></i>App Store
                </a>
                <a 
                  href="#" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    background: 'rgba(255,255,255,.08)', 
                    border: '1px solid rgba(255,255,255,.15)', 
                    borderRadius: 'var(--radius)', 
                    padding: '8px 12px', 
                    color: 'rgba(255,255,255,.8)', 
                    fontSize: '.82rem', 
                    fontWeight: '600' 
                  }}
                >
                  <i className="fab fa-google-play" style={{ fontSize: '1.2rem' }}></i>Google Play
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <div className="container">
          <div className="footer-copyright">
            &copy; 2026 <span>Hilgod Online Store</span>. All Rights Reserved.
          </div>
          <div className="footer-bottom-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy#cookies">Cookies</Link>
            <Link href="/about">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
