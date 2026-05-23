import Link from 'next/link';
import { useShop } from './ShopProvider';
import { useCurrency } from '../contexts/CurrencyContext';

export default function ProductCard({ product, showAddToCart = true }) {
  const { _id, name, price, originalPrice, images, category, brand, stock, description, badge } = product;
  const { addToCart, toggleWishlist, isInWishlist, openQuickView } = useShop();
  const { formatPrice } = useCurrency();

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

  const discount = originalPrice && price < originalPrice 
    ? Math.round(((originalPrice - price) / originalPrice) * 100) 
    : 0;

  // Generate a brief description snippet (first 60 chars)
  const briefDesc = description 
    ? (description.length > 60 ? description.substring(0, 60) + '...' : description)
    : '';

  return (
    <div className="product-card" data-id={_id}>
      <div className="product-card__badges">
        {badge && <span className={`product-card__badge badge-${badge}`}>{badge.toUpperCase()}</span>}
        {stock === 0 && <span className="product-card__badge badge-danger">OUT OF STOCK</span>}
        {discount > 0 && <span className="product-card__badge badge-sale">-{discount}%</span>}
      </div>
      
      <button 
        className={`product-card__wishlist ${isInWishlist(_id) ? 'active' : ''}`}
        onClick={handleAddToWishlist}
        aria-label="Wishlist"
      >
        <i className={`${isInWishlist(_id) ? 'fas' : 'far'} fa-heart`}></i>
      </button>

      <div className="product-card__img-wrapper">
        <Link href={`/products/${_id}`}>
          <img 
            src={images && images[0] ? images[0] : product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'}
            alt={name} 
            loading="lazy" 
            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'; }}
          />
        </Link>
        <div className="product-card__quick-view" onClick={handleQuickView}>
          <i className="fas fa-eye"></i> Quick View
        </div>
      </div>

      <div className="product-card__body">
        <div className="product-card__brand">{brand || category}</div>
        <Link href={`/products/${_id}`} className="product-card__name">
          {name}
        </Link>
        
        {briefDesc && (
          <p className="product-card__desc">{briefDesc}</p>
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
          {showAddToCart && stock > 0 ? (
            <button 
              className="btn-add-cart" 
              onClick={handleAddToCart}
            >
              <i className="fas fa-cart-plus"></i> Add to Cart
            </button>
          ) : showAddToCart && stock === 0 ? (
            <button 
              className="btn-add-cart" 
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            >
              Out of Stock
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}