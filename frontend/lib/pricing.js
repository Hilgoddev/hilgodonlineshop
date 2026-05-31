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
  const resolvedOriginalPrice = originalPrice ?? null;
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
