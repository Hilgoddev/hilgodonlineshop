// Delivery model — must match backend/src/lib/money.js. The backend is authoritative
// (it recomputes the order total); these are for displaying the cart/checkout summary.
export const DELIVERY_FEE = 1500;
export const FREE_DELIVERY_THRESHOLD = 50000; // free delivery strictly ABOVE this amount

// Delivery fee for a given product subtotal (free above the threshold).
export function computeDeliveryFee(subtotal) {
  return Number(subtotal) > FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const firstNumber = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export function normalizePricing(source = {}) {
  const price = firstNumber(source.price, source.sale_price, source.salePrice);
  const originalPrice = firstNumber(source.originalPrice, source.original_price);
  const resolvedPrice = price ?? 0;
  // A "was" price is only shown when it is really higher than today's price —
  // otherwise the page would strike through a lower number.
  const resolvedOriginalPrice = originalPrice != null && originalPrice > resolvedPrice ? originalPrice : null;
  const discountPercent = resolvedOriginalPrice && resolvedPrice < resolvedOriginalPrice
    ? Math.round(((resolvedOriginalPrice - resolvedPrice) / resolvedOriginalPrice) * 100)
    : 0;

  return {
    price: resolvedPrice,
    originalPrice: resolvedOriginalPrice,
    discountPercent,
    hasDiscount: discountPercent > 0,
  };
}

export function withNormalizedPricing(source = {}) {
  const pricing = normalizePricing(source);
  return {
    ...source,
    price: pricing.price,
    originalPrice: pricing.originalPrice,
  };
}

export function formatPriceNumber(value) {
  return toNumber(value);
}
