import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { useShop } from '@/components/ShopProvider';
import { useCurrency } from '@/contexts/CurrencyContext';
import { normalizePricing } from '@/lib/pricing';
import { resolveServerApiBase } from '@/lib/env';
import { apiFetch } from '@/lib/apiClient';
import { colorName } from '@/lib/colorName';

export default function ProductDetail({ product, relatedProducts }) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [selectedSize, setSelectedSize] = useState(product?.size_options?.[0] || '');
  const [selectedColor, setSelectedColor] = useState(product?.color_options?.[0] || '');
  
  // Review form state
  const [reviewForm, setReviewForm] = useState({
    name: '',
    email: '',
    rating: 5,
    title: '',
    message: ''
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviews, setReviews] = useState([]);

  // Load this product's reviews from the API (and refresh after a new submission).
  const loadReviews = async () => {
    if (!product?._id) return;
    try {
      const res = await fetch(`/api/reviews/${product._id}`);
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) setReviews(json.data);
    } catch { /* ignore */ }
  };
  useEffect(() => { loadReviews(); /* eslint-disable-next-line */ }, [product?._id]);

  // Live rating summary from the fetched reviews (falls back to server aggregate).
  const reviewCount = reviews.length || product?.review_count || 0;
  const avgRating = reviews.length
    ? reviews.reduce((a, r) => a + Number(r.rating || 0), 0) / reviews.length
    : Number(product?.rating || 0);

  const openReviewsTab = () => {
    setActiveTab('reviews');
    setTimeout(() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }), 60);
  };

  if (!product) {
    return (
      <Layout title="Product Not Found — Hilgod Online Store">
        <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
          <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', color: 'var(--warning)' }}></i>
          <h2 style={{ marginTop: '20px', marginBottom: '10px' }}>Product Not Found</h2>
          <p>The product you're looking for doesn't exist or has been removed.</p>
          <Link href="/products" className="btn btn-primary" style={{ marginTop: '20px' }}>
            Browse Products
          </Link>
        </div>
      </Layout>
    );
  }

  const { addToCart, toggleWishlist, isInWishlist, showToast } = useShop();
  const { formatPrice } = useCurrency();

  // Collect the buyer's chosen variant (only keys the product actually offers).
  const buildSelectedOptions = () => {
    const o = {};
    if (product.size_options?.length && selectedSize) o.size = selectedSize;
    if (product.color_options?.length && selectedColor) o.color = selectedColor;
    return Object.keys(o).length ? o : null;
  };

  const handleAddToCart = () => {
    addToCart(product, quantity, buildSelectedOptions());
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, buildSelectedOptions());
    router.push('/checkout');
  };

  const handleAddToWishlist = () => {
    toggleWishlist(product);
  };

  const incrementQuantity = () => {
    if (quantity < product.stock) setQuantity(quantity + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleReviewChange = (e) => {
    const { name, value } = e.target;
    setReviewForm(prev => ({ ...prev, [name]: value }));
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.name || !reviewForm.email || !reviewForm.message) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    setReviewSubmitting(true);
    
    try {
      // apiFetch attaches the Supabase auth token — the reviews endpoint requires
      // a logged-in user (name/email are taken from the verified account).
      const res = await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          product_id: product._id,
          product_name: product.name,
          rating: reviewForm.rating,
          title: reviewForm.title,
          message: reviewForm.message
        })
      });

      if (res.status === 401) {
        showToast('Please log in to leave a review.', 'error');
        return;
      }
      const data = await res.json();

      if (res.ok && data.success) {
        showToast('Thank you! Your review has been submitted.', 'success');
        setReviewForm({ name: '', email: '', rating: 5, title: '', message: '' });
        if (typeof loadReviews === 'function') loadReviews();
      } else {
        throw new Error(data.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Failed to submit review. Please try again.', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const getCategoryName = (category) => {
    const catNames = {
      phones: 'Phones & Tablets',
      laptops: 'Laptops & Computers',
      tvs: 'TVs & Displays',
      appliances: 'Home Appliances',
      gadgets: 'Tech Gadgets',
      fashion: 'Fashion',
      gaming: 'Gaming'
    };
    return catNames[category] || category;
  };

  const productCurrency = product.currency || 'NGN';
  const productImages = (product.images && product.images.length > 0)
    ? product.images
    : product.image_url ? [product.image_url] : [];

  const pricing = normalizePricing(product);
  const origPrice = pricing.originalPrice;
  const discount = pricing.discountPercent;

  return (
    <Layout 
      title={`${product.name} — Hilgod Online Store`}
      description={product.description}
    >
      <div className="container">
        {/* Breadcrumb */}
        <nav className="breadcrumb" id="pdp-breadcrumb">
          <Link href="/">Home</Link>
          <i className="fas fa-chevron-right sep"></i>
          <Link href={`/products?category=${product.category}`}>
            {getCategoryName(product.category)}
          </Link>
          <i className="fas fa-chevron-right sep"></i>
          <span className="current">{product.name}</span>
        </nav>

        {/* Product Detail Layout */}
        <div className="pdp-layout">
          {/* LEFT: Gallery */}
          <div className="pdp-gallery">
            <div className="gallery-main">
              {productImages[selectedImage] ? (
                <img
                  src={productImages[selectedImage]}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80&auto=format'; }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <i className="fas fa-image" style={{ fontSize: '3rem', color: 'var(--gray-3)' }}></i>
                </div>
              )}
              {discount > 0 && (
                <div style={{
                  position: 'absolute', top: '12px', left: '12px', background: 'var(--primary)',
                  color: '#fff', padding: '6px 14px', borderRadius: 'var(--radius-full)',
                  fontWeight: '700', fontSize: '.82rem'
                }}>
                  -{discount}% OFF
                </div>
              )}
              <div className="gallery-zoom"><i className="fas fa-search-plus"></i> Zoom</div>
            </div>
            {productImages.length > 1 && (
              <div className="gallery-thumbnails">
                {productImages.map((img, index) => (
                  <div
                    key={index}
                    className={`thumb ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img src={img} alt={`${product.name} ${index + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Product Info */}
          <div className="pdp-info">
            <div className="pdp-brand">{product.brand || getCategoryName(product.category)}</div>
            <h1 className="pdp-title">{product.name}</h1>
            
            {/* Rating */}
            <div className="pdp-rating">
              <div className="stars">
                {[...Array(5)].map((_, i) => (
                  <i
                    key={i}
                    className={`${i < Math.floor(avgRating) ? 'fas fa-star' : i < avgRating ? 'fas fa-star-half-alt' : 'far fa-star'}`}
                    style={{ color: '#f59e0b', fontSize: '.9rem' }}
                  ></i>
                ))}
              </div>
              <span className="rating-count">({reviewCount} review{reviewCount === 1 ? '' : 's'})</span>
              <button type="button" className="review-link" onClick={openReviewsTab} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)' }}>Write a Review</button>
            </div>

            {/* Stock Status */}
            {product.stock > 0 ? (
              <div className="in-stock">
                <i className="fas fa-check-circle"></i> In Stock — {product.stock} available
              </div>
            ) : (
              <div className="in-stock out-stock">
                <i className="fas fa-times-circle"></i> Out of Stock
              </div>
            )}

            {/* Size Selector */}
            {product.size_options?.length > 0 && (
              <div className="pdp-variants">
                <div className="variant-label">
                  Size: <strong>{selectedSize || 'Select size'}</strong>
                </div>
                <div className="variant-options">
                  {product.size_options.map(size => (
                    <button
                      key={size}
                      className={`variant-btn ${selectedSize === size ? 'selected' : ''}`}
                      onClick={() => setSelectedSize(size)}
                      type="button"
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selector */}
            {product.color_options?.length > 0 && (
              <div className="pdp-variants">
                <div className="variant-label">
                  Color: <strong>{selectedColor ? colorName(selectedColor) : 'Select color'}</strong>
                </div>
                <div className="variant-options">
                  {product.color_options.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`variant-btn color-variant ${selectedColor === color ? 'selected' : ''}`}
                      onClick={() => setSelectedColor(color)}
                      style={{ background: color, border: selectedColor === color ? '2px solid var(--dark)' : '2px solid var(--gray-3)' }}
                      title={colorName(color)}
                      aria-label={colorName(color)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="pdp-pricing">
              <span className="pdp-price">{formatPrice(pricing.price || 0, productCurrency, false)}</span>
              {origPrice && (
                <span className="pdp-original">{formatPrice(origPrice, productCurrency, false)}</span>
              )}
              {discount > 0 && (
                <span className="pdp-discount">Save {discount}%</span>
              )}
              {pricing.price >= 10000 && (
                <div className="pdp-installment">
                  Or pay {formatPrice((pricing.price / 4) || 0, productCurrency, false)}/month × 4 months
                </div>
              )}
            </div>

            {/* Quantity & Actions */}
            {product.stock > 0 && (
              <div className="qty-wrap">
                <span style={{ fontSize: '.88rem', fontWeight: '700' }}>Quantity:</span>
                <div className="qty-control">
                  <div className="qty-btn" onClick={decrementQuantity}>−</div>
                  <div className="qty-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{quantity}</div>
                  <div className="qty-btn" onClick={incrementQuantity}>+</div>
                </div>
              </div>
            )}

            <div className="pdp-actions">
              <button className="btn btn-primary btn-lg" onClick={handleAddToCart} disabled={product.stock === 0}>
                <i className="fas fa-cart-plus"></i> Add to Cart
              </button>
              <button className="btn btn-buy-now btn-lg" onClick={handleBuyNow} disabled={product.stock === 0}>
                <i className="fas fa-bolt"></i> Buy Now
              </button>
              <button 
                className={`btn btn-outline btn-lg`}
                onClick={handleAddToWishlist}
                style={isInWishlist(product._id) ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : {}}
              >
                <i className={`${isInWishlist(product._id) ? 'fas' : 'far'} fa-heart`}></i>
              </button>
            </div>

            {/* Seller/Store Info */}
            {(product.seller || product.store) && (
              <div className="pdp-seller-info" style={{
                background: 'var(--gray-6)',
                borderRadius: 'var(--radius)',
                padding: '16px',
                border: '1px solid var(--gray-4)',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {(product.store?.logo_url || product.seller?.avatar_url) ? (
                    <img 
                      src={product.store?.logo_url || product.seller?.avatar_url} 
                      alt={product.store?.name || product.seller?.full_name}
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-xlight)' }}
                    />
                  ) : (
                    <div style={{ 
                      width: '48px', height: '48px', borderRadius: '50%', 
                      background: 'var(--primary)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: '1.2rem'
                    }}>
                      {(product.store?.name || product.seller?.full_name || 'S').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '.88rem' }}>
                      {product.store?.name || product.seller?.full_name || 'Seller'}
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'var(--gray-1)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <i className="fas fa-check-circle" style={{ color: 'var(--success)', fontSize: '.65rem' }}></i>
                      <span>Verified Seller</span>
                      {product.store?.status === 'approved' && (
                        <>
                          <span>•</span>
                          <span>Store Status: <strong style={{ color: 'var(--success)' }}>Approved</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                  {product.seller?.phone_number && (
                    <a 
                      href={`tel:${product.seller.phone_number}`}
                      style={{ 
                        fontSize: '.75rem', color: 'var(--primary)', fontWeight: 600,
                        padding: '6px 12px', border: '1px solid var(--primary)',
                        borderRadius: 'var(--radius)', textDecoration: 'none'
                      }}
                    >
                      <i className="fas fa-phone"></i> Contact
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Meta Info */}
            <div className="pdp-meta">
              <div className="pdp-meta-item">
                <i className="fas fa-truck-fast"></i>
                <span>Free delivery on orders above <strong>{formatPrice(50000, 'NGN', false)}</strong></span>
              </div>
              <div className="pdp-meta-item">
                <i className="fas fa-rotate-left"></i>
                <span><strong>7-Day</strong> return policy</span>
              </div>
              <div className="pdp-meta-item">
                <i className="fas fa-lock"></i>
                <span>Secure checkout with <strong>SSL Encryption</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="tabs-wrap" style={{ marginTop: 'var(--space-8)' }}>
          <div className="tab-heads">
            <div 
              className={`tab-head ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              Description
            </div>
            <div 
              className={`tab-head ${activeTab === 'specs' ? 'active' : ''}`}
              onClick={() => setActiveTab('specs')}
            >
              Specifications
            </div>
            <div 
              className={`tab-head ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews ({reviewCount})
            </div>
          </div>

          {/* Description Tab */}
          <div className={`tab-body ${activeTab === 'description' ? 'active' : ''}`}>
            <div style={{ lineHeight: '1.8', fontSize: '.95rem', color: 'var(--gray-1)' }}>
              <p>{product.description}</p>
            </div>
          </div>

          {/* Specifications Tab */}
          <div className={`tab-body ${activeTab === 'specs' ? 'active' : ''}`}>
            <table className="spec-table">
              <tbody>
                <tr>
                  <td>Category</td>
                  <td>{getCategoryName(product.category)}</td>
                </tr>
                {product.subcategory && (
                  <tr>
                    <td>Subcategory</td>
                    <td>{product.subcategory}</td>
                  </tr>
                )}
                {product.brand && (
                  <tr>
                    <td>Brand</td>
                    <td>{product.brand}</td>
                  </tr>
                )}
                <tr>
                  <td>Price</td>
                  <td>{formatPrice(pricing.price || 0, productCurrency, false)}</td>
                </tr>
                {origPrice && (
                  <tr>
                    <td>Original Price</td>
                    <td style={{ textDecoration: 'line-through', color: 'var(--gray-2)' }}>{formatPrice(origPrice, productCurrency, false)}</td>
                  </tr>
                )}
                <tr>
                  <td>Stock</td>
                  <td>{product.stock > 0 ? `${product.stock} units` : 'Out of Stock'}</td>
                </tr>
                {product.size_options?.length > 0 && (
                  <tr>
                    <td>Available Sizes</td>
                    <td>{product.size_options.join(', ')}</td>
                  </tr>
                )}
                {product.color_options?.length > 0 && (
                  <tr>
                    <td>Available Colors</td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {product.color_options.map(c => (
                          <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ display: 'inline-block', width: '18px', height: '18px', borderRadius: '50%', background: c, border: '1px solid var(--gray-3)' }} title={colorName(c)} />
                            <span style={{ fontSize: '.85rem' }}>{colorName(c)}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
                <tr>
                  <td>Rating</td>
                  <td>{(avgRating || 0).toFixed(1)} / 5.0 {reviewCount ? `(${reviewCount})` : ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Reviews Tab */}
          <div className={`tab-body ${activeTab === 'reviews' ? 'active' : ''}`} id="reviews">
            {reviews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {reviews.map((r) => (
                  <div key={r.id} className="review-card">
                    <div className="review-header">
                      <span className="reviewer-name">{r.user_name || 'Customer'}</span>
                      <span className="review-date">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                    </div>
                    <div className="stars" style={{ margin: '8px 0', color: '#f59e0b' }}>
                      {[...Array(5)].map((_, i) => (
                        <i key={i} className={`${i < Math.round(r.rating || 0) ? 'fas fa-star' : 'far fa-star'}`}></i>
                      ))}
                    </div>
                    {r.title && <div style={{ fontWeight: 700, marginBottom: '4px' }}>{r.title}</div>}
                    <p className="review-body">{r.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--gray-2)' }}>
                <i className="fas fa-comment-dots" style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block' }}></i>
                <p style={{ fontSize: '.95rem' }}>No reviews yet. Be the first to share your experience!</p>
              </div>
            )}

            {/* Review Form */}
            <div style={{ 
              marginTop: 'var(--space-8)', padding: 'var(--space-6)', 
              background: 'var(--gray-6)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--gray-4)'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: 'var(--space-2)' }}>
                <i className="fas fa-pen" style={{ color: 'var(--primary)' }}></i> Write a Review
              </h3>
              <p style={{ fontSize: '.85rem', color: 'var(--gray-1)', marginBottom: 'var(--space-4)' }}>
                Share your experience with this product to help other shoppers
              </p>
              
              <form onSubmit={handleReviewSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Your Name *</label>
                    <input 
                      type="text" className="form-input" placeholder="John Doe" 
                      name="name" value={reviewForm.name} onChange={handleReviewChange} required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input 
                      type="email" className="form-input" placeholder="your@email.com" 
                      name="email" value={reviewForm.email} onChange={handleReviewChange} required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Your Rating *</label>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <i 
                        key={star}
                        className={`${star <= reviewForm.rating ? 'fas' : 'far'} fa-star`}
                        onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                        style={{ 
                          fontSize: '1.5rem', cursor: 'pointer', 
                          color: star <= reviewForm.rating ? '#f59e0b' : 'var(--gray-3)',
                          transition: 'color .2s, transform .2s'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                      ></i>
                    ))}
                    <span style={{ fontSize: '.85rem', color: 'var(--gray-1)', marginLeft: '8px', alignSelf: 'center' }}>
                      {reviewForm.rating}/5
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Review Title</label>
                  <input 
                    type="text" className="form-input" placeholder="Summarize your experience..." 
                    name="title" value={reviewForm.title} onChange={handleReviewChange} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Your Review *</label>
                  <textarea 
                    className="form-textarea" 
                    placeholder="Tell us what you liked, disliked, or any tips for other buyers..."
                    name="message" value={reviewForm.message} onChange={handleReviewChange} required
                    style={{ minHeight: '120px' }}
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-lg" 
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting ? (
                    <><i className="fas fa-spinner fa-spin"></i> Submitting...</>
                  ) : (
                    <><i className="fas fa-paper-plane"></i> Submit Review</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div style={{ marginTop: 'var(--space-10)' }}>
            <div className="section-header">
              <h2 className="section-title">
                <span className="bar"></span> You May Also Like
              </h2>
              <Link href={`/products?category=${product.category}`} className="section-link">
                View All <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
            <div className="related-grid">
              {relatedProducts.slice(0, 3).map(rp => (
                <ProductCard key={rp._id} product={rp} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export async function getServerSideProps({ params, req }) {
  const apiBase = resolveServerApiBase(req);
  const productUrl = `${apiBase}/products/${params.id}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    let res;
    try {
      res = await fetch(productUrl, { cache: 'no-store', signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 404) return { notFound: true };

    if (!res.ok) {
      console.error(`[PDP] Backend error ${res.status} for product ${params.id} (url: ${productUrl})`);
      return { notFound: true };
    }

    const data = await res.json();
    if (!data.success || !data.data) {
      console.error(`[PDP] Bad data for product ${params.id}:`, JSON.stringify(data).slice(0, 200));
      return { notFound: true };
    }

    let relatedProducts = [];
    try {
      const relRes = await fetch(
        `${apiBase}/products?category=${data.data.category}&limit=4`,
        { cache: 'no-store' }
      );
      const relData = await relRes.json();
      if (relData.success) {
        relatedProducts = (relData.data || []).filter(p => p._id !== params.id).slice(0, 3);
      }
    } catch (_) {}

    return { props: { product: data.data, relatedProducts } };
  } catch (error) {
    console.error(`[PDP] Failed to fetch product ${params.id} from ${productUrl}:`, error.message);
    return { notFound: true };
  }
}
