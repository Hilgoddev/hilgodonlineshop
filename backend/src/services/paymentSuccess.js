const supabase = require('../config/supabase');
const { sendEmail, paymentConfirmedHtml, newOrderSellerHtml, newOrderAdminHtml } = require('./email');

async function handlePaymentSuccess(order_id, user_id) {
  try {
    // Fetch order and verify it hasn't been processed already (guard against duplicate webhook calls)
    const { data: order, error: orderCheckErr } = await supabase
      .from('orders')
      .select('total_amount, status, currency, created_at')
      .eq('id', order_id)
      .single();

    if (orderCheckErr) return;

    // Fetch order items. NOTE: the column is `unit_price`, NOT `price`.
    // Selecting a non-existent column makes PostgREST error, which previously
    // made this whole function abort — so stock was never decremented and no
    // confirmation emails were ever sent. Always select real columns.
    let { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('product_id, quantity, unit_price, selected_options')
      .eq('order_id', order_id);
    // Backward-compat: retry without selected_options if that column is absent.
    if (itemsErr && String(itemsErr.message || '').includes('selected_options')) {
      ({ data: items, error: itemsErr } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price')
        .eq('order_id', order_id));
    }

    if (itemsErr || !items?.length) return;

    // Take stock first, so nothing below (email lookups) can skip it.
    // Exactly-once per line (migration 021): lines that already took stock,
    // or are cancelled, are skipped.
    await takeOrderStock(order_id);

    // Fetch product details for email only
    const productIds = [...new Set(items.map(i => i.product_id))];
    const { data: products } = await supabase
      .from('products')
      .select('id, name, seller_id, images')
      .in('id', productIds);

    const productMap = {};
    (products || []).forEach(p => { productMap[p.id] = p; });

    const emailItems = items.map(i => ({
      name: productMap[i.product_id]?.name || 'Product',
      quantity: i.quantity,
      price: Number(i.unit_price) || 0,
      image: productMap[i.product_id]?.images?.[0] || null,
      selectedOptions: i.selected_options || null,
    }));

    // Resolve the buyer's identity once — reused for the buyer, seller and admin
    // emails so they all show a human name + date instead of a raw user ID.
    let buyerName = 'Customer';
    let buyerEmail = null;
    if (user_id) {
      try {
        const { data: { user } } = await supabase.auth.admin.getUserById(user_id);
        if (user) {
          buyerEmail = user.email || null;
          buyerName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Customer';
        }
      } catch {}
    }

    // Human-readable order date for emails (e.g. "9 Jun 2026, 11:30").
    const orderDate = new Date(order?.created_at || Date.now()).toLocaleString('en-NG', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    // Send payment confirmation to buyer
    if (buyerEmail) {
      try {
        sendEmail({
          to: buyerEmail,
          subject: `Payment Confirmed — Order #${String(order_id).slice(0, 8).toUpperCase()}`,
          html: paymentConfirmedHtml(order_id, emailItems, order?.total_amount || 0, buyerName, order?.currency),
          emailType: 'payment_confirmed',
          orderId: order_id,
          userId: user_id,
        }).catch(() => {});
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
          selectedOptions: i.selected_options || null,
        }));
        sendEmail({
          to: seller.email,
          subject: `New Order Received — #${String(order_id).slice(0, 8).toUpperCase()}`,
          html: newOrderSellerHtml(order_id, sellerEmailItems, order?.currency, buyerName, orderDate),
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
        html: newOrderAdminHtml(order_id, emailItems, order?.total_amount || 0, buyerName, orderDate, order?.currency),
        emailType: 'new_order_admin',
        orderId: order_id,
      }).catch(() => {});
    }

  } catch (err) {
    console.error('[POST_PAYMENT] handlePaymentSuccess error:', err.message);
  }
}

// Confirm an online payment for an order. Single entry point for every
// provider (Paystack webhook + verify, Stripe, Grey) so all of them apply the
// same checks:
//   1. the amount paid matches the order total (±0.01) and, when the provider
//      reports one, the currency matches the order's currency;
//   2. only a still-'pending' order is claimed — the conditional UPDATE is the
//      atomic "first caller wins" barrier, and it never resurrects an order
//      that is already processing/shipped/delivered/cancelled;
//   3. the cart is cleared and handlePaymentSuccess runs exactly once.
// Returns { ok: true, claimed } or { ok: false, reason } — never throws for a
// business-rule rejection (so webhooks can ack instead of retrying forever).
// DB errors DO throw, so callers can let the provider retry.
async function markOrderPaid({ orderId, reference, paidAmount, currency, provider }) {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, user_id, total_amount, currency, status, payment_reference')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw error;
  if (!order) return { ok: false, reason: 'order_not_found' };

  const expected = Number(order.total_amount || 0);
  const paid = Number(paidAmount);
  if (!Number.isFinite(paid) || Math.abs(paid - expected) > 0.01) {
    console.error(`[PAYMENT_TAMPERING] ${provider} amount mismatch for order ${orderId}: paid=${paidAmount}, expected=${expected}`);
    return { ok: false, reason: 'amount_mismatch' };
  }
  if (currency && order.currency && String(currency).toUpperCase() !== String(order.currency).toUpperCase()) {
    console.error(`[PAYMENT_TAMPERING] ${provider} currency mismatch for order ${orderId}: paid=${currency}, expected=${order.currency}`);
    return { ok: false, reason: 'currency_mismatch' };
  }

  const { data: claimed, error: claimErr } = await supabase
    .from('orders')
    .update({ status: 'paid', payment_reference: reference })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('id');
  if (claimErr) throw claimErr;
  if (!claimed || !claimed.length) {
    // Money arrived for an order that can't take it — it must not vanish.
    if (order.status === 'cancelled') {
      console.error(`[PAYMENT_NEEDS_REFUND] ${provider} payment ${reference} for CANCELLED order ${orderId} (${paid} ${currency || order.currency})`);
      return { ok: false, reason: 'order_cancelled' };
    }
    if (order.payment_reference && reference && order.payment_reference !== reference && order.status !== 'pending') {
      console.error(`[PAYMENT_NEEDS_REFUND] ${provider} second payment ${reference} for already-paid order ${orderId} (paid by ${order.payment_reference})`);
    }
    return { ok: true, claimed: false };
  }

  // Use the order's own user, never a user id from provider metadata.
  if (order.user_id) {
    await supabase.from('cart_items').delete().eq('user_id', order.user_id);
  }
  await handlePaymentSuccess(orderId, order.user_id);
  return { ok: true, claimed: true };
}

// Stock ledger (migration 021): each order line records how much stock it
// took, and these DB functions lock the lines while changing stock, so calling
// them repeatedly or concurrently can never take or return stock twice.
async function takeOrderStock(orderId) {
  const { error } = await supabase.rpc('take_order_stock', { p_order_id: orderId });
  if (error) console.error('[STOCK] take_order_stock failed:', error.message, { orderId });
}

// Return the stock an order took — all lines, or just `itemId`.
async function restoreOrderStock(orderId, itemId = null) {
  const { error } = await supabase.rpc('release_order_stock', { p_order_id: orderId, p_item_id: itemId });
  if (error) console.error('[STOCK] release_order_stock failed:', error.message, { orderId, itemId });
}

module.exports = { handlePaymentSuccess, markOrderPaid, takeOrderStock, restoreOrderStock };
