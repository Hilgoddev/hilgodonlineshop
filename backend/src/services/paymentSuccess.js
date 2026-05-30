const supabase = require('../config/supabase');
const { sendEmail, paymentConfirmedHtml, newOrderSellerHtml, newOrderAdminHtml } = require('./email');

async function handlePaymentSuccess(order_id, user_id) {
  try {
    // Fetch order items
    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('product_id, quantity, price')
      .eq('order_id', order_id);

    if (itemsErr || !items?.length) return;

    // Fetch order total
    const { data: order } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('id', order_id)
      .single();

    // Fetch product details for all items
    const productIds = [...new Set(items.map(i => i.product_id))];
    const { data: products } = await supabase
      .from('products')
      .select('id, name, stock, seller_id')
      .in('id', productIds);

    const productMap = {};
    (products || []).forEach(p => { productMap[p.id] = p; });

    // Decrement stock for each product (idempotency in payment_events ensures this runs once)
    await Promise.allSettled(
      items.map(async (item) => {
        const product = productMap[item.product_id];
        if (!product) return;
        const newStock = Math.max(0, (product.stock || 0) - item.quantity);
        return supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);
      })
    );

    const emailItems = items.map(i => ({
      name: productMap[i.product_id]?.name || 'Product',
      quantity: i.quantity,
      price: Number(i.price) || 0,
    }));

    // Send payment confirmation to buyer
    if (user_id) {
      try {
        const { data: { user } } = await supabase.auth.admin.getUserById(user_id);
        if (user?.email) {
          const buyerName = user.user_metadata?.full_name || user.user_metadata?.name || user.email;
          sendEmail({
            to: user.email,
            subject: `Payment Confirmed — Order #${String(order_id).slice(0, 8).toUpperCase()}`,
            html: paymentConfirmedHtml(order_id, emailItems, order?.total_amount || 0, buyerName),            emailType: 'payment_confirmed',
            orderId: order_id,
            userId: user_id,          }).catch(() => {});
        }
      } catch {}
    }

    // Notify each seller
    const sellerItemsMap = {};
    for (const item of items) {
      const sellerId = productMap[item.product_id]?.seller_id;
      if (!sellerId) continue;
      if (!sellerItemsMap[sellerId]) sellerItemsMap[sellerId] = [];
      sellerItemsMap[sellerId].push(item);
    }

    for (const [sellerId, sellerItems] of Object.entries(sellerItemsMap)) {
      try {
        const { data: { user: seller } } = await supabase.auth.admin.getUserById(sellerId);
        if (!seller?.email) continue;
        const sellerEmailItems = sellerItems.map(i => ({
          name: productMap[i.product_id]?.name || 'Product',
          quantity: i.quantity,
          price: Number(i.price) || 0,
        }));
        sendEmail({
          to: seller.email,
          subject: `New Order Received — #${String(order_id).slice(0, 8).toUpperCase()}`,
          html: newOrderSellerHtml(order_id, sellerEmailItems),
          emailType: 'new_order_seller',
          orderId: order_id,
          userId: sellerId,
        }).catch(() => {});
      } catch {}
    }

    // Notify admin
    if (process.env.ADMIN_EMAIL) {
      sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `New Paid Order — #${String(order_id).slice(0, 8).toUpperCase()}`,
        html: newOrderAdminHtml(order_id, emailItems, order?.total_amount || 0, user_id || 'Unknown'),
        emailType: 'new_order_admin',
        orderId: order_id,
      }).catch(() => {});
    }

  } catch (err) {
    console.error('[POST_PAYMENT] handlePaymentSuccess error:', err.message);
  }
}

module.exports = { handlePaymentSuccess };
