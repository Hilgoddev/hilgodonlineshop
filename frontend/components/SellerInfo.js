import Link from 'next/link';

/**
 * SellerInfo Component
 * Displays seller/store information for products and orders
 * 
 * Props:
 * - seller: { id, name, phone, storeName, storeLogo }
 * - variant: 'compact' | 'card' | 'inline' (default: 'compact')
 * - showContact: boolean (default: false) - Show phone/email if available
 */
export default function SellerInfo({ seller, variant = 'compact', showContact = false }) {
  if (!seller) return null;

  const { id, name, phone, storeName, storeLogo } = seller;
  const displayName = storeName || name || 'Seller';

  // Compact variant - just store name with optional link
  if (variant === 'compact') {
    return (
      <div className="seller-info seller-info--compact">
        <span className="seller-info__label">Sold by:</span>
        <Link href={`/store/${id}`} className="seller-info__name">
          {displayName}
        </Link>
      </div>
    );
  }

  // Card variant - full seller card with logo and contact
  if (variant === 'card') {
    return (
      <div className="seller-info seller-info--card">
        <div className="seller-info__header">
          {storeLogo ? (
            <img src={storeLogo} alt={displayName} className="seller-info__logo" />
          ) : (
            <div className="seller-info__logo-placeholder">
              <i className="fas fa-store"></i>
            </div>
          )}
          <div className="seller-info__details">
            <h4 className="seller-info__store-name">{displayName}</h4>
            {name && name !== displayName && (
              <p className="seller-info__seller-name">Owner: {name}</p>
            )}
          </div>
        </div>
        
        {showContact && (phone || seller.email) && (
          <div className="seller-info__contact">
            {phone && (
              <a href={`tel:${phone}`} className="seller-info__contact-item">
                <i className="fas fa-phone"></i> {phone}
              </a>
            )}
            {seller.email && (
              <a href={`mailto:${seller.email}`} className="seller-info__contact-item">
                <i className="fas fa-envelope"></i> {seller.email}
              </a>
            )}
          </div>
        )}

        <Link href={`/store/${id}`} className="seller-info__link">
          Visit Store <i className="fas fa-arrow-right"></i>
        </Link>
      </div>
    );
  }

  // Inline variant - horizontal layout
  if (variant === 'inline') {
    return (
      <div className="seller-info seller-info--inline">
        {storeLogo ? (
          <img src={storeLogo} alt={displayName} className="seller-info__logo-sm" />
        ) : (
          <div className="seller-info__logo-placeholder-sm">
            <i className="fas fa-store"></i>
          </div>
        )}
        <div className="seller-info__text">
          <span className="seller-info__label">Sold by:</span>
          <Link href={`/store/${id}`} className="seller-info__name">
            {displayName}
          </Link>
          {showContact && phone && (
            <span className="seller-info__phone">
              <i className="fas fa-phone"></i> {phone}
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// Seller badge component for product cards
export function SellerBadge({ seller }) {
  if (!seller) return null;
  
  const displayName = seller.storeName || seller.name || 'Seller';
  
  return (
    <Link href={`/store/${seller.id}`} className="seller-badge" title={`Sold by ${displayName}`}>
      <i className="fas fa-store"></i>
      <span>{displayName}</span>
    </Link>
  );
}