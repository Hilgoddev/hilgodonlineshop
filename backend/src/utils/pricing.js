const supabase = require('../config/supabase');

async function getActiveFlashSaleMap(productIds = []) {
  const ids = [...new Set((productIds || []).filter(Boolean))];
  if (!ids.length) return new Map();

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('flash_sales')
    .select('product_id, sale_price, original_price, expires_at, is_active')
    .eq('is_active', true)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .in('product_id', ids);

  if (error) throw error;

  const saleMap = new Map();
  for (const sale of data || []) {
    if (!saleMap.has(sale.product_id)) {
      saleMap.set(sale.product_id, sale);
    }
  }
  return saleMap;
}

function getEffectiveProductPricing(product, flashSale = null) {
  const basePrice = Number(product?.price || 0);
  const salePrice = flashSale ? Number(flashSale.sale_price || 0) : null;
  const hasSalePrice = flashSale && Number.isFinite(salePrice);

  return {
    price: hasSalePrice ? salePrice : basePrice,
    originalPrice: flashSale
      ? Number(flashSale.original_price || basePrice || 0)
      : (product?.original_price != null ? Number(product.original_price) : null),
  };
}

module.exports = {
  getActiveFlashSaleMap,
  getEffectiveProductPricing,
};
