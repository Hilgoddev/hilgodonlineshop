export default function PaymentQuote({ order }) {
  const quote = (order?.shippingAddress || order?.shipping_address)?.payment_quote;
  if (!quote?.currency || !Number.isFinite(Number(quote.amount))) return null;
  return <p style={{ margin: '8px 0', fontWeight: 700 }}>Payment amount: {new Intl.NumberFormat('en-GB', { style: 'currency', currency: quote.currency }).format(Number(quote.amount))} ({quote.currency})</p>;
}
