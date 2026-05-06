import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { useShop } from '@/components/ShopProvider';
import { useCurrency } from '@/contexts/CurrencyContext';
import { HILGOD_PRODUCTS } from '@/lib/products-data';

export default function ProductDetail({ product, relatedProducts }) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  
  // Review form state
  const [reviewForm, setReviewForm] = useState({
    name: '',
    email: '',
    rating: 5,
    title: '',
    message: ''
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

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

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
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
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: product._id,
          product_name: product.name,
          name: reviewForm.name,
          email: reviewForm.email,
          rating: reviewForm.rating,
          title: reviewForm.title,
          message: reviewForm.message
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        showToast('Thank you! Your review has been submitted.', 'success');
        setReviewForm({ name: '', email: '', rating: 5, title: '', message: '' });
        // Optionally, we could fetch reviews again here to update the UI
      } else {
        throw new Error(data.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error(error);
      showToast('Failed to submit review. Please try again.', 'error');
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

  const discount = product.originalPrice && product.price < product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

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
              {product.images && product.images[selectedImage] ? (
                <img src={product.images[selectedImage]} alt={product.name} />
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
            {product.images && product.images.length > 1 && (
              <div className="gallery-thumbnails">
                {product.images.map((img, index) => (
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
                    className={`${i < Math.floor(product.ratings?.average || 0) ? 'fas fa-star' : i < (product.ratings?.average || 0) ? 'fas fa-star-half-alt' : 'far fa-star'}`}
                    style={{ color: '#f59e0b', fontSize: '.9rem' }}
                  ></i>
                ))}
              </div>
              <span className="rating-count">({product.ratings?.count || 0} reviews)</span>
              <a href="#reviews" className="review-link">Write a Review</a>
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

            {/* Pricing */}
            <div className="pdp-pricing">
              <span className="pdp-price">{formatPrice(product.price || 0)}</span>
              {product.originalPrice && (
                <span className="pdp-original">{formatPrice(product.originalPrice || 0)}</span>
              )}
              {discount > 0 && (
                <span className="pdp-discount">Save {discount}%</span>
              )}
              {product.price >= 10000 && (
                <div className="pdp-installment">
                  Or pay {formatPrice((product.price / 4) || 0)}/month × 4 months
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

            {/* Meta Info */}
            <div className="pdp-meta">
              <div className="pdp-meta-item">
                <i className="fas fa-truck-fast"></i>
                <span>Free delivery on orders above <strong>₦50,000</strong></span>
              </div>
              <div className="pdp-meta-item">
                <i className="fas fa-shield-halved"></i>
                <span><strong>1-Year Warranty</strong> included</span>
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
              Reviews ({product.ratings?.count || 0})
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
                <tr>
                  <td>Brand</td>
                  <td>{product.brand || '—'}</td>
                </tr>
                <tr>
                  <td>Price</td>
                  <td>{formatPrice(product.price || 0)}</td>
                </tr>
                <tr>
                  <td>Stock</td>
                  <td>{product.stock > 0 ? `${product.stock} units` : 'Out of Stock'}</td>
                </tr>
                <tr>
                  <td>SKU</td>
                  <td>{product.sku || 'N/A'}</td>
                </tr>
                <tr>
                  <td>Rating</td>
                  <td>{product.ratings?.average?.toFixed(1) || '0.0'} / 5.0</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Reviews Tab */}
          <div className={`tab-body ${activeTab === 'reviews' ? 'active' : ''}`} id="reviews">
            {/* Sample Reviews */}
            {(product.ratings?.count > 0) ? (
              <div>
                <div className="review-card">
                  <div className="review-header">
                    <div>
                      <span className="reviewer-name">Verified Customer</span>
                      <span className="verified-badge"><i className="fas fa-check-circle"></i> Verified Purchase</span>
                    </div>
                    <span className="review-date">Recently</span>
                  </div>
                  <div className="stars" style={{ margin: '8px 0' }}>
                    {[...Array(5)].map((_, i) => (
                      <i key={i} className={`${i < Math.floor(product.ratings?.average || 0) ? 'fas fa-star' : 'far fa-star'}`}></i>
                    ))}
                  </div>
                  <p className="review-body">Great product! Works exactly as described and arrived quickly.</p>
                </div>
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

// Fetch product data on the server side
export async function getServerSideProps({ params }) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    // Fetch product
    const res = await fetch(`${baseUrl}/api/products/${params.id}`);
    const data = await res.json();
    
    if (data.success && data.data) {
      // Fetch related products from same category
      let relatedProducts = [];
      try {
        const relRes = await fetch(`${baseUrl}/api/products?category=${data.data.category}&limit=4`);
        const relData = await relRes.json();
        if (relData.success) {
          relatedProducts = (relData.data || []).filter(p => p._id !== params.id).slice(0, 3);
        }
      } catch (e) {
        console.error('Error fetching related products:', e);
      }

      return {
        props: {
          product: data.data,
          relatedProducts,
        },
      };
    }
    
    // If API fails, try to find product in fallback data
    console.log('Product not found in API, checking fallback data');
    const productId = parseInt(params.id);
    const fallbackProduct = HILGOD_PRODUCTS.find(p => p.id === productId);
    
    if (fallbackProduct) {
      const formattedProduct = {
        _id: fallbackProduct.id.toString(),
        name: fallbackProduct.name,
        brand: fallbackProduct.brand,
        description: fallbackProduct.description,
        price: fallbackProduct.price,
        originalPrice: fallbackProduct.originalPrice,
        images: [fallbackProduct.image],
        category: fallbackProduct.category,
        subcategory: fallbackProduct.subcategory,
        stock: fallbackProduct.inStock ? 100 : 0,
        ratings: { average: fallbackProduct.rating, count: fallbackProduct.reviews },
        badge: fallbackProduct.badge,
        createdAt: new Date().toISOString()
      };
      
      // Get related products from same category
      const relatedFromFallback = HILGOD_PRODUCTS
        .filter(p => p.category === fallbackProduct.category && p.id !== productId)
        .slice(0, 3)
        .map(p => ({
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
      
      return {
        props: {
          product: formattedProduct,
          relatedProducts: relatedFromFallback,
        },
      };
    }
    
    // Product not found anywhere
    return { props: { product: null, relatedProducts: [] } };
  } catch (error) {
    console.error('Error fetching product, trying fallback:', error);
    
    // Try fallback on error
    try {
      const productId = parseInt(params.id);
      const fallbackProduct = HILGOD_PRODUCTS.find(p => p.id === productId);
      
      if (fallbackProduct) {
        const formattedProduct = {
          _id: fallbackProduct.id.toString(),
          name: fallbackProduct.name,
          brand: fallbackProduct.brand,
          description: fallbackProduct.description,
          price: fallbackProduct.price,
          originalPrice: fallbackProduct.originalPrice,
          images: [fallbackProduct.image],
          category: fallbackProduct.category,
          subcategory: fallbackProduct.subcategory,
          stock: fallbackProduct.inStock ? 100 : 0,
          ratings: { average: fallbackProduct.rating, count: fallbackProduct.reviews },
          badge: fallbackProduct.badge,
          createdAt: new Date().toISOString()
        };
        
        const relatedFromFallback = HILGOD_PRODUCTS
          .filter(p => p.category === fallbackProduct.category && p.id !== productId)
          .slice(0, 3)
          .map(p => ({
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
        
        return {
          props: {
            product: formattedProduct,
            relatedProducts: relatedFromFallback,
          },
        };
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    
    return { props: { product: null, relatedProducts: [] } };
  }
}