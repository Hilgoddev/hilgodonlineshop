const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || 'Hilgod <noreply@hilgod.com>';
const BASE_URL = process.env.FRONTEND_URL || 'https://hilgod-frontend.onrender.com';

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL SKIPPED — no RESEND_API_KEY] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) console.error('[EMAIL] Resend error:', await res.text());
  } catch (err) {
    console.error('[EMAIL] Failed to send:', err.message);
  }
}

function orderConfirmationHtml(orderId, items, total) {
  const rows = items.map(i =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₦${Number(i.price * i.quantity).toLocaleString()}</td></tr>`
  ).join('');
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#E31C1C">Order Confirmed!</h2>
    <p>Thank you for shopping on Hilgod. Your order <strong>#${String(orderId).slice(0,8).toUpperCase()}</strong> has been received.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:#f8f8f8"><th style="padding:8px;text-align:left">Product</th><th style="padding:8px;text-align:center">Qty</th><th style="padding:8px;text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:1.1rem"><strong>Total: ₦${Number(total).toLocaleString()}</strong></p>
    <a href="${BASE_URL}/track-order" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#E31C1C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Track Your Order</a>
  </div>`;
}

function orderStatusHtml(orderId, status) {
  const messages = {
    paid: 'Your payment has been confirmed! We are preparing your order.',
    processing: 'Your order is being picked and packed.',
    shipped: 'Great news — your order is on its way!',
    delivered: 'Your order has been delivered. Enjoy your purchase!',
    cancelled: 'Your order has been cancelled. If this was unexpected, please contact support.',
  };
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#E31C1C">Order Update</h2>
    <p>${messages[status] || `Your order status has been updated to: <strong>${status}</strong>.`}</p>
    <p>Order ID: <strong>#${String(orderId).slice(0,8).toUpperCase()}</strong></p>
    <a href="${BASE_URL}/account?tab=orders" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#E31C1C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View My Orders</a>
  </div>`;
}

function sellerApprovedHtml(sellerName, businessName) {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#E31C1C">Congratulations, ${sellerName}!</h2>
    <p>Your seller application for <strong>${businessName}</strong> has been approved by Hilgod.</p>
    <p>You can now log in and start listing products on the platform.</p>
    <a href="${BASE_URL}/seller/dashboard" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#E31C1C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Go to Seller Dashboard</a>
  </div>`;
}

function newsletterConfirmHtml(email) {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#E31C1C">You're subscribed!</h2>
    <p>Thanks for subscribing to Hilgod updates. You'll be the first to know about flash sales and new arrivals.</p>
    <a href="${BASE_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#E31C1C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Shop Now</a>
  </div>`;
}

function paymentConfirmedHtml(orderId, items, total, buyerName) {
  const rows = items.map(i =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₦${Number(i.price * i.quantity).toLocaleString()}</td></tr>`
  ).join('');
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#E31C1C">Payment Confirmed!</h2>
    <p>Hi <strong>${buyerName}</strong>, your payment for order <strong>#${String(orderId).slice(0,8).toUpperCase()}</strong> has been received and confirmed.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:#f8f8f8"><th style="padding:8px;text-align:left">Product</th><th style="padding:8px;text-align:center">Qty</th><th style="padding:8px;text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:1.1rem"><strong>Total Paid: ₦${Number(total).toLocaleString()}</strong></p>
    <p style="color:#666;font-size:.88rem">We are now preparing your order for dispatch.</p>
    <a href="${BASE_URL}/track-order" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#E31C1C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Track Your Order</a>
  </div>`;
}

function newOrderSellerHtml(orderId, items) {
  const rows = items.map(i =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₦${Number(i.price * i.quantity).toLocaleString()}</td></tr>`
  ).join('');
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#E31C1C">New Order Received!</h2>
    <p>A customer has placed and paid for an order containing your product(s). Order ID: <strong>#${String(orderId).slice(0,8).toUpperCase()}</strong></p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:#f8f8f8"><th style="padding:8px;text-align:left">Product</th><th style="padding:8px;text-align:center">Qty</th><th style="padding:8px;text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#666;font-size:.88rem">Please prepare the item(s) for dispatch promptly.</p>
    <a href="${BASE_URL}/seller/dashboard" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#E31C1C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View Seller Dashboard</a>
  </div>`;
}

function newOrderAdminHtml(orderId, items, total, buyerUserId) {
  const rows = items.map(i =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₦${Number(i.price * i.quantity).toLocaleString()}</td></tr>`
  ).join('');
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#E31C1C">New Paid Order</h2>
    <p>Order <strong>#${String(orderId).slice(0,8).toUpperCase()}</strong> has been paid. Buyer user ID: <strong>${buyerUserId}</strong></p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:#f8f8f8"><th style="padding:8px;text-align:left">Product</th><th style="padding:8px;text-align:center">Qty</th><th style="padding:8px;text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:1.1rem"><strong>Total: ₦${Number(total).toLocaleString()}</strong></p>
    <a href="${BASE_URL}/admin/orders" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#E31C1C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View in Admin Panel</a>
  </div>`;
}

module.exports = { sendEmail, orderConfirmationHtml, orderStatusHtml, sellerApprovedHtml, newsletterConfirmHtml, paymentConfirmedHtml, newOrderSellerHtml, newOrderAdminHtml };
