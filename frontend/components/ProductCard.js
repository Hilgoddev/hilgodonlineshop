import Link from 'next/link';
import { useShop } from './ShopProvider';
import { useCurrency } from '../contexts/CurrencyContext';
import { normalizePricing } from '../lib/pricing';

export default function ProductCard({ product, showAddToCart = true }) {
  const { _id, name, images, category, brand, stock, description, badge, store, seller } = product;
  const pricing = normalizePricing(product);
  const price = pricing.price;
  const originalPrice = pricing.originalPrice;
  const { addToCart, toggleWishlist, isInWishlist, openQuickView } = useShop();
  const { formatPrice } = useCurrency();
  
  // Get seller/store display name
  const sellerName = store?.name || seller?.full_name || null;
  const sellerAvatar = store?.logo_url || seller?.avatar_url || null;

  const handleAddToCart = (e) => {
    e.preventDefault();
    addToCart(product, 1);
  };

  const handleAddToWishlist = (e) => {
    e.preventDefault();
    toggleWishlist(product);
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    openQuickView(product);
  };

  const discount = pricing.discountPercent;

  // Generate a brief description snippet (first 60 chars)
  const briefDesc = description 
    ? (description.length > 60 ? description.substring(0, 60) + '...' : description)
    : '';

  const outOfStock = stock === 0;

  return (
    <div className="product-card" data-id={_id} style={outOfStock ? { opacity: 0.72 } : {}}>
      <div className="product-card__badges">
        {badge && <span className={`product-card__badge badge-${badge}`}>{badge.toUpperCase()}</span>}
        {outOfStock && (
          <span className="product-card__badge badge-danger" style={{ background: '#ef4444', color: '#fff', fontWeight: 800 }}>
            OUT OF STOCK
          </span>
        )}
        {!outOfStock && discount > 0 && <span className="product-card__badge badge-sale">-{discount}%</span>}
      </div>
      
      <button 
        className={`product-card__wishlist ${isInWishlist(_id) ? 'active' : ''}`}
        onClick={handleAddToWishlist}
        aria-label="Wishlist"
      >
        <i className={`${isInWishlist(_id) ? 'fas' : 'far'} fa-heart`}></i>
      </button>

      <div className="product-card__img-wrapper" style={{ position: 'relative' }}>
        <Link href={`/products/${_id}`}>
          <img
            src={images && images[0] ? images[0] : product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'}
            alt={name}
            loading="lazy"
            style={outOfStock ? { filter: 'grayscale(40%)' } : {}}
            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'; }}
          />
        </Link>
        {outOfStock && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ background: '#ef4444', color: '#fff', padding: '6px 16px', borderRadius: '6px', fontWeight: 800, fontSize: '.82rem', letterSpacing: '.5px' }}>
              OUT OF STOCK
            </span>
          </div>
        )}
        {!outOfStock && (
          <div className="product-card__quick-view" onClick={handleQuickView}>
            <i className="fas fa-eye"></i> Quick View
          </div>
        )}
      </div>

        <div className="product-card__body">
          <div className="product-card__brand">{brand || category}</div>
          <Link href={`/products/${_id}`} className="product-card__name">
            {name}
          </Link>
          
          {briefDesc && (
            <p className="product-card__desc">{briefDesc}</p>
          )}

          {/* Seller/Store Info */}
          {sellerName && (
            <div className="product-card__seller" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '.75rem', color: 'var(--gray-1)' }}>
              {sellerAvatar ? (
                <img src={sellerAvatar} alt={sellerName} style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <i className="fas fa-store" style={{ fontSize: '.7rem', color: 'var(--primary)' }}></i>
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{sellerName}</span>
            </div>
          )}

          <div className="product-card__pricing">
            <span className="product-card__price">{formatPrice(price || 0, product.currency || 'NGN')}</span>
            {discount > 0 && (
              <>
                <span className="product-card__original">{formatPrice(originalPrice || 0, product.currency || 'NGN')}</span>
              </>
            )}
          </div>

        <div className="product-card__actions">
          {showAddToCart && !outOfStock ? (
            <button className="btn-add-cart" onClick={handleAddToCart}>
              <i className="fas fa-cart-plus"></i> Add to Cart
            </button>
          ) : showAddToCart && outOfStock ? (
            <button
              className="btn-add-cart"
              disabled
              style={{ background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed', border: '1px solid #e2e8f0', fontWeight: 700 }}
            >
              <i className="fas fa-ban" style={{ marginRight: '6px' }}></i>Out of Stock
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
