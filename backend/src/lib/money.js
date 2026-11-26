// Single source of truth for the platform's money model.
// Money model:
//   order.total_amount  = product sales + delivery fee
//   admin revenue       = commission on product sales + the full delivery fee
//   seller net earnings = product sales minus commission (no delivery cut)
//   commission          = 5% per item up to €100, 10% above — see lib/payouts.js
//                         (PLATFORM_COMMISSION_RATE is only the legacy flat rate)
// Keep frontend/lib/pricing.js (DELIVERY_FEE / FREE_DELIVERY_THRESHOLD) in sync.

const DELIVERY_FEE = 1500;
const FREE_DELIVERY_THRESHOLD = 50000; // free delivery strictly ABOVE this amount
const PLATFORM_COMMISSION_RATE = 0.10;

// Delivery fee for a given product subtotal (free above the threshold).
function computeDeliveryFee(subtotal) {
  return Number(subtotal) > FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

module.exports = {
  DELIVERY_FEE,
  FREE_DELIVERY_THRESHOLD,
  PLATFORM_COMMISSION_RATE,
  computeDeliveryFee,
};
