const supabase = require('../config/supabase');

async function checkMetrics() {
  // Get first seller
  const { data: sellers, error: sellerErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'seller')
    .limit(1);
  if (sellerErr) return console.error('Error fetching sellers:', sellerErr);
  if (!sellers || sellers.length === 0) return console.log('No sellers found');
  const seller = sellers[0];
  console.log('Checking metrics for seller:', seller.id, seller.full_name);

  const { data: orderItems, error: oiErr } = await supabase
    .from('order_items')
    .select('order_id, quantity, unit_price, seller_id')
    .eq('seller_id', seller.id);
  if (oiErr) return console.error('Error fetching order items:', oiErr);

  const orderIds = [...new Set((orderItems || []).map(i => i.order_id))];
  const { data: paidOrders, error: poErr } = await supabase
    .from('orders')
    .select('id')
    .in('id', orderIds)
    .in('status', ['paid', 'shipped', 'delivered']);
  if (poErr) return console.error('Error fetching paid orders:', poErr);
  const paidSet = new Set((paidOrders || []).map(o => o.id));
  const paidItems = (orderItems || []).filter(i => paidSet.has(i.order_id));

  const totalSales = paidItems.reduce((acc, i) => acc + Number(i.unit_price) * Number(i.quantity), 0);
  const totalUnits = paidItems.reduce((acc, i) => acc + Number(i.quantity), 0);
  const totalOrders = new Set(paidItems.map(i => i.order_id)).size;

  console.log('Computed totals:');
  console.log('  total_sales (units):', totalUnits);
  console.log('  total_revenue:', totalSales);
  console.log('  total_orders:', totalOrders);
}

checkMetrics().then(() => process.exit());
