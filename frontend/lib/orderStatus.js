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

export function orderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] || status || 'Awaiting payment';
}
