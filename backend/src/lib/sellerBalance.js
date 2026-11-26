// A seller's balance, shared by the seller earnings page and admin payout
// approval so both always agree.
const supabase = require('../config/supabase');
const { isPayableOrder } = require('./orderStatus');
const { lineRate } = require('./payouts');

// A seller's balance: payable sales minus commission (each line's own rate:
// 5% up to $100 per item, 10% above, legacy lines 10%) minus approved/paid
// payouts. Keyed on order_items.seller_id (who sold the line at the time), not
// current product ownership, and cancelled lines never count.
async function getSellerBalance(sellerId) {
  const select = (cols) => supabase.from('order_items').select(cols).eq('seller_id', sellerId);
  let { data: items, error: itemsErr } = await select('quantity, unit_price, commission_rate, fulfillment_status, order:orders(status, payment_method)');
  if (itemsErr && String(itemsErr.message || '').includes('commission_rate')) {
    ({ data: items, error: itemsErr } = await select('quantity, unit_price, fulfillment_status, order:orders(status, payment_method)'));
  }
  if (itemsErr) throw itemsErr;
  const payable = (items || [])
    .filter(i => i.fulfillment_status !== 'cancelled')
    .filter(i => isPayableOrder(i.order?.status, i.order?.payment_method));
  const lineTotal = (i) => Number(i.unit_price) * Number(i.quantity);
  const grossSales = payable.reduce((s, i) => s + lineTotal(i), 0);
  const commission = payable.reduce((s, i) => s + lineTotal(i) * lineRate(i), 0);
  // Sales split by commission tier, shown on My Earnings.
  const byRate = {};
  for (const i of payable) { const r = lineRate(i); byRate[r] = (byRate[r] || 0) + lineTotal(i); }
  const netEarnings = grossSales - commission;

  const { data: payouts, error: payoutsErr } = await supabase
    .from('seller_payouts')
    .select('amount')
    .eq('seller_id', sellerId)
    .in('status', ['approved', 'paid']);
  if (payoutsErr) throw payoutsErr;
  const withdrawn = (payouts || []).reduce((s, p) => s + Number(p.amount), 0);

  return { grossSales, commission, byRate, netEarnings, withdrawn, available: Math.max(0, netEarnings - withdrawn) };
}

module.exports = { getSellerBalance };
