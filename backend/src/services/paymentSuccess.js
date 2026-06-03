const supabase = require('../config/supabase');
const { sendEmail, paymentConfirmedHtml, newOrderSellerHtml, newOrderAdminHtml } = require('./email');

async function handlePaymentSuccess(order_id, user_id) {
  try {
    // Fetch order and verify it hasn't been processed already (guard against duplicate webhook calls)
    const { data: order, error: orderCheckErr } = await supabase
      .from('orders')
      .select('total_amount, status')
      .eq('id', order_id)
      .single();

    if (orderCheckErr) return;

    // Fetch order items. NOTE: the column is `unit_price`, NOT `price`.
    // Selecting a non-existent column makes PostgREST error, which previously
    // made this whole function abort — so stock was never decremented and no
    // confirmation emails were ever sent. Always select real columns.
    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('product_id, quantity, unit_price')
      .eq('order_id', order_id);

    if (itemsErr || !items?.length) return;

    // Fetch product details for email only (stock is managed via RPC)
    const productIds = [...new Set(items.map(i => i.product_id))];
    const { data: products } = await supabase
      .from('products')
      .select('id, name, seller_id, images')
      .in('id', productIds);

    const productMap = {};
    (products || []).forEach(p => { productMap[p.id] = p; });

    // Atomically decrement stock via Postgres RPC — safe against concurrent calls.
    // decrement_product_stock uses UPDATE … WHERE stock >= quantity so it never goes negative.
    await Promise.allSettled(
      items.map((item) =>
        supabase.rpc('decrement_product_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
        })
      )
    );

    const emailItems = items.map(i => ({
      name: productMap[i.product_id]?.name || 'Product',
      quantity: i.quantity,
      price: Number(i.unit_price) || 0,
      image: productMap[i.product_id]?.images?.[0] || null,
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
            html: paymentConfirmedHtml(order_id, emailItems, order?.total_amount || 0, buyerName),
            emailType: 'payment_confirmed',
            orderId: order_id,
            userId: user_id,
          }).catch(() => {});
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
          price: Number(i.unit_price) || 0,
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
    const adminEmail = require('../lib/env').cleanEnv(process.env.ADMIN_EMAIL);
    if (adminEmail) {
      sendEmail({
        to: adminEmail,
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
