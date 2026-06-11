// Human-friendly labels for order statuses.
// pending    = order placed, awaiting payment
// processing = payment received, order being prepared for shipment
const ORDER_STATUS_LABELS = {
  pending: 'Awaiting payment',
  processing: 'Paid · Preparing',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// POD is paid at delivery, so it never shows "Paid"/"Awaiting payment" earlier.
const POD_STATUS_LABELS = {
  pending: 'Order placed',
  processing: 'Preparing',
  paid: 'Payment received',
  shipped: 'Out for delivery',
  delivered: 'Delivered & paid',
  cancelled: 'Cancelled',
};

export function orderStatusLabel(status, paymentMethod) {
  const pod = String(paymentMethod || '').toLowerCase() === 'pod';
  if (pod) return POD_STATUS_LABELS[status] || status || 'Order placed';
  return ORDER_STATUS_LABELS[status] || status || 'Awaiting payment';
}
