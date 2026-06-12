// Statuses that count as real revenue for online-payment orders.
// Use isRevenueOrder() when payment_method is available — POD requires 'delivered'.
const REVENUE_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];

// Statuses whose earnings are withdrawable for online-payment orders.
// Use isPayableOrder() when payment_method is available.
const PAYABLE_STATUSES = ['paid', 'shipped', 'delivered'];

// Money model:
//   order.total_amount  = product sales + ₦1,500 delivery fee
//   admin revenue       = 10% platform commission on product sales + full delivery fee
//   seller net earnings = 90% of their product sales (order_items, no delivery cut)
// These helpers control WHEN an order counts — the revenue split is in the route logic.

// POD: cash is only collected at delivery — earlier statuses mean money hasn't changed
// hands yet and must not appear in any revenue or earnings total.
function isRevenueOrder(status, paymentMethod) {
  const isPod = String(paymentMethod || '').toLowerCase() === 'pod';
  return isPod ? status === 'delivered' : REVENUE_STATUSES.includes(status);
}

function isPayableOrder(status, paymentMethod) {
  const isPod = String(paymentMethod || '').toLowerCase() === 'pod';
  return isPod ? status === 'delivered' : PAYABLE_STATUSES.includes(status);
}

module.exports = { REVENUE_STATUSES, PAYABLE_STATUSES, isRevenueOrder, isPayableOrder };
