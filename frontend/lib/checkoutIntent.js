// Buy Now is a separate, reload-safe checkout intent. It never adds a cart line.
function buildBuyNowUrl(productId, quantity = 1, options = {}) {
  const p = new URLSearchParams({ buy: productId, quantity: String(quantity) });
  for (const key of ['size', 'color']) if (options?.[key]) p.set(key, options[key]);
  return '/checkout?' + p.toString();
}
function readBuyNowQuery(query = {}) {
  if (typeof query.buy !== 'string' || !query.buy) return null;
  const quantity = Number(query.quantity ?? 1);
  const options = {};
  for (const key of ['size', 'color']) if (typeof query[key] === 'string' && query[key]) options[key] = query[key];
  return { productId: query.buy, quantity: Number.isInteger(quantity) && quantity > 0 && quantity <= 20 ? quantity : 1, options };
}
module.exports = { buildBuyNowUrl, readBuyNowQuery };
