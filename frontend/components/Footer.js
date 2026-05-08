import Link from 'next/link';
import { useState } from 'react';

export default function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);

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
    { name: 'Phones & Tablets', slug: 'phones' },
    { name: 'Laptops', slug: 'laptops' },
    { name: 'TVs & Displays', slug: 'tvs' },
    { name: 'Home Appliances', slug: 'appliances' },
    { name: 'Tech Gadgets', slug: 'gadgets' },
    { name: 'Fashion', slug: 'fashion' },
    { name: 'Gaming', slug: 'gaming' },
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                <i className="fas fa-shopping-bag" style={{ fontSize: '1.8rem', color: 'var(--primary)' }}></i>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '2px', lineHeight: 1 }}>HILGOD</div>
                  <div style={{ fontSize: '.55rem', letterSpacing: '3px', opacity: 0.8 }}>ONLINE STORE</div>
                </div>
              </div>
            </div>
            <p className="footer-about">
              Hilgod Online Store — Africa's trusted destination for Electronics, Phones, Appliances, Fashion and everything in between. Shop smart, live better.
            </p>
            <div className="footer-contact-item">
              <i className="fas fa-map-marker-alt"></i>
              <span>14 Commerce Road, Victoria Island, Lagos, Nigeria</span>
            </div>
            <div className="footer-contact-item">
              <i className="fas fa-phone"></i>
              <span>+234 800 HILGOD (445463)</span>
            </div>
            <div className="footer-contact-item">
              <i className="fas fa-envelope"></i>
              <span>support@hilgod.com</span>
            </div>
            <div className="social-links">
              <a href="#" className="social-link" aria-label="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="social-link" aria-label="Twitter">
                <i className="fab fa-x-twitter"></i>
              </a>
              <a href="#" className="social-link" aria-label="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="social-link" aria-label="YouTube">
                <i className="fab fa-youtube"></i>
              </a>
              <a href="#" className="social-link" aria-label="TikTok">
                <i className="fab fa-tiktok"></i>
              </a>
              <a href="#" className="social-link" aria-label="WhatsApp">
                <i className="fab fa-whatsapp"></i>
              </a>
            </div>
            <div className="payments-section">
              <div className="payments-title">We Accept</div>
              <div className="payment-logos">
                <div className="payment-logo stripe"><i className="fas fa-s"></i> Stripe</div>
                <div className="payment-logo mastercard">MC</div>
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
              <a href="#"><i className="fas fa-chevron-right"></i>About Hilgod</a>
              <a href="#"><i className="fas fa-chevron-right"></i>Contact Us</a>
              <a href="#"><i className="fas fa-chevron-right"></i>Careers</a>
              <a href="#"><i className="fas fa-chevron-right"></i>Press & Media</a>
              <a href="#"><i className="fas fa-chevron-right"></i>Blog</a>
              <a href="#"><i className="fas fa-chevron-right"></i>Sitemap</a>
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
              <a href="#"><i className="fas fa-chevron-right"></i>Return Request</a>
              <a href="#"><i className="fas fa-chevron-right"></i>Flash Sales</a>
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
            <Link href="/track-order" className="footer-cta-link">
              <i className="fas fa-location-dot"></i>
              <div>
                <strong>Track Your Order</strong>
                <br />
                <span style={{ fontSize: '.78rem' }}>Real-time delivery tracking</span>
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
            <a href="#">Cookies</a>
            <a href="#">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}