const crypto = require('crypto');
const { optionsSummary } = require('../utils/colorName');

// A small grey line under a product name showing its chosen variant options
// (e.g. "Color: Denim · Size: M"). Colors are rendered as names, never hex.
function optionsHtml(selectedOptions) {
  const summary = optionsSummary(selectedOptions);
  return summary ? `<div style="font-size:.78rem;color:#64748b;margin-top:2px">${escapeHtml(summary)}</div>` : '';
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function formatMoney(amount, currency = 'NGN') {
  const normalizedCurrency = String(currency || 'NGN').toUpperCase();
  const numericAmount = Number(amount || 0);
  if (!Number.isFinite(numericAmount)) return `${normalizedCurrency} 0`;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  } catch (error) {
    const symbols = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' };
    const symbol = symbols[normalizedCurrency] || `${normalizedCurrency} `;
    return `${symbol}${numericAmount.toLocaleString('en-US')}`;
  }
}

const { cleanEnv } = require('../lib/env');

// Sanitize the key — a BOM/zero-width char (common in copied-in dashboard env
// vars) makes the "Authorization: Bearer <key>" header throw and silently
// breaks ALL emails in production while working locally.
const RESEND_API_KEY = cleanEnv(process.env.RESEND_API_KEY);
// Used to build links inside emails (Track Order, View Orders, etc). MUST be
// the live site in production — a stale/localhost value makes email buttons
// point at localhost. FRONTEND_URL may be a comma-separated list (used for CORS),
// so take the first usable origin; in production skip any localhost entry and
// fall back to the live domain so email buttons are never broken.
const isLocalUrl = (u) => /localhost|127\.0\.0\.1|\[::1\]/i.test(u || '');
const FRONTEND_URLS = (cleanEnv(process.env.FRONTEND_URL) || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
const BASE_URL = (
  FRONTEND_URLS.find((u) => !(process.env.NODE_ENV === 'production' && isLocalUrl(u)))
  || 'https://www.hilgod.com'
).replace(/\/$/, '');
const supabase = require('../config/supabase');

const FROM_ORDERS = cleanEnv(process.env.EMAIL_FROM_ORDERS) || 'Hilgod Orders <order@hilgod.com>';
const FROM_NOREPLY = cleanEnv(process.env.EMAIL_FROM_NOREPLY) || 'Hilgod <noreply@hilgod.com>';

// Email type to sender address mapping
const EMAIL_FROM_MAP = {
  order_confirmation: FROM_ORDERS,
  order_status: FROM_ORDERS,
  payment_confirmed: FROM_ORDERS,
  new_order_seller: FROM_ORDERS,
  new_order_admin: FROM_ORDERS,
  seller_approval: FROM_NOREPLY,
  rider_approval: FROM_NOREPLY,
  rider_rejection: FROM_NOREPLY,
  newsletter: FROM_NOREPLY,
  admin_alert: FROM_NOREPLY,
  general: FROM_NOREPLY,
};

/**
 * Generate email footer with logo, company info, and support contact
 */
function getEmailFooter() {
  const supportEmail = cleanEnv(process.env.SUPPORT_EMAIL) || 'support@hilgod.com';
  const supportPhone = cleanEnv(process.env.SUPPORT_PHONE) || '+123';
  const website = cleanEnv(process.env.COMPANY_WEBSITE) || 'hilgod.com';
  // Use the lightweight (~5KB) email logo, not the 2MB site logo.png that many
  // email clients refuse to render. EMAIL_LOGO_URL can override if needed.
  const logoUrl = cleanEnv(process.env.EMAIL_LOGO_URL) || 'https://www.hilgod.com/email-logo.png';
  const companyName = cleanEnv(process.env.COMPANY_NAME) || 'Hilgod Online Store';
  
  return `
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:0.85rem;color:#666;text-align:center">
      <div style="margin-bottom:16px">
        <img src="${logoUrl}" alt="${companyName}" style="height:40px;margin-bottom:8px" />
      </div>
      <p style="margin:8px 0">
        <strong>Need help?</strong><br/>
        Contact us at <a href="mailto:${supportEmail}" style="color:#E31C1C;text-decoration:none">${supportEmail}</a> or call <a href="tel:${supportPhone}" style="color:#E31C1C;text-decoration:none">${supportPhone}</a>
      </p>
      <p style="margin:8px 0">
        <strong>${companyName}</strong><br/>
        <a href="https://${website}" style="color:#E31C1C;text-decoration:none">${website}</a>
      </p>
    </div>
  `;
}

/**
 * Send an email and log the attempt to the database
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML body
 * @param {string} [params.emailType='general'] - Type of email for categorization
 * @param {string} [params.orderId] - Associated order ID
 * @param {string} [params.userId] - Associated user ID
 * @param {Object} [params.metadata] - Additional metadata
 */
async function sendEmail({ to, subject, html, emailType = 'general', orderId = null, userId = null, metadata = {} }) {
  const logId = crypto.randomUUID();

  // Sanitize recipient too — a BOM/zero-width char here would make Resend
  // reject the address or break the request.
  to = cleanEnv(to);

  // Get sender address based on email type
  const fromEmail = EMAIL_FROM_MAP[emailType] || EMAIL_FROM_MAP.general;
  
  // Append footer to HTML
  const htmlWithFooter = html + getEmailFooter();
  
  // Log the email attempt (fire-and-forget, don't await)
  const logEmail = async (status, providerResponse = null, errorMessage = null) => {
    try {
      await supabase.from('email_logs').insert({
        id: logId,
        to_email: to,
        from_email: fromEmail,
        subject: subject,
        email_type: emailType,
        order_id: orderId,
        user_id: userId,
        status: status,
        provider_response: providerResponse,
        error_message: errorMessage,
        metadata: metadata
      });
    } catch (logErr) {
      console.error('[EMAIL_LOG] Failed to log email:', logErr.message);
    }
  };

  if (!RESEND_API_KEY) {
    console.warn(`[EMAIL] SKIPPED — no RESEND_API_KEY configured. To: ${to} | Subject: ${subject}`);
    await logEmail('failed', null, 'RESEND_API_KEY not configured');
    return;
  }

  try {
    console.log(`[EMAIL] Sending ${emailType} email to ${to}: ${subject} (from: ${fromEmail})`);
    
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${RESEND_API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ from: fromEmail, to, subject, html: htmlWithFooter }),
    });

    const responseText = await res.text();
    
    if (!res.ok) {
      console.error(`[EMAIL] Resend API error (${res.status}):`, responseText);
      await logEmail('failed', responseText, `HTTP ${res.status}: ${responseText}`);
      return;
    }

    const responseData = JSON.parse(responseText);
    console.log(`[EMAIL] Successfully sent to ${to}: ${subject} (ID: ${responseData.id})`);
    await logEmail('sent', JSON.stringify(responseData));
    
  } catch (err) {
    console.error('[EMAIL] Failed to send:', err.message);
    await logEmail('failed', null, err.message);
  }
}

function orderConfirmationHtml(orderId, items, total, currency = 'NGN') {
  const rows = items.map(i =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(i.name)}${optionsHtml(i.selectedOptions)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatMoney(Number(i.price * i.quantity), currency)}</td></tr>`
  ).join('');
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#E31C1C">Order Confirmed!</h2>
    <p>Thank you for shopping on Hilgod. Your order <strong>#${String(orderId).slice(0,8).toUpperCase()}</strong> has been received.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:#f8f8f8"><th style="padding:8px;text-align:left">Product</th><th style="padding:8px;text-align:center">Qty</th><th style="padding:8px;text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:1.1rem"><strong>Total: ${formatMoney(total, currency)}</strong></p>
    <a href="${BASE_URL}/account?tab=orders" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#E31C1C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View My Orders</a>
  </div>`;
}

function orderStatusHtml(orderId, status, items = []) {
  const messages = {
    paid: 'Your payment has been confirmed! We are preparing your order.',
    processing: 'Your order is being picked and packed.',
    shipped: 'Great news — your order is on its way!',
    delivered: 'Your order has been delivered. Enjoy your purchase!',
    cancelled: 'Your order has been cancelled. If this was unexpected, please contact support.',
  };
  const valid = (items || []).filter((i) => i && i.name);
  const itemsLine = valid.length
    ? `<p style="color:#475569;font-size:.92rem">Item${valid.length > 1 ? 's' : ''}: <strong>${valid.map((i) => {
        const opts = optionsSummary(i.selectedOptions);
        return escapeHtml(i.name) + (opts ? ` (${escapeHtml(opts)})` : '');
      }).join(', ')}</strong></p>`
    : '';
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#E31C1C">Order Update</h2>
    <p>${messages[status] || `Your order status has been updated to: <strong>${status}</strong>.`}</p>
    ${itemsLine}
    <p>Order ID: <strong>#${String(orderId).slice(0,8).toUpperCase()}</strong></p>
    <a href="${BASE_URL}/account?tab=orders" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#E31C1C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View My Orders</a>
  </div>`;
}

function sellerApprovedHtml(sellerName, businessName) {
  const safeName = escapeHtml(sellerName);
  const safeBiz  = escapeHtml(businessName);
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#E31C1C">Congratulations, ${safeName}!</h2>
    <p>Your seller application for <strong>${safeBiz}</strong> has been approved by Hilgod.</p>
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

function paymentConfirmedHtml(orderId, items, total, buyerName, currency = 'NGN') {
  const safeBuyerName = escapeHtml(buyerName);
  const rows = items.map(i => {
    const safeName = escapeHtml(i.name);
    const safeImg  = i.image ? escapeHtml(i.image) : '';
    const img = safeImg ? `<img src="${safeImg}" alt="${safeName}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:8px" />` : '';
    return `<tr><td style="padding:8px;border-bottom:1px solid #eee">${img}${safeName}${optionsHtml(i.selectedOptions)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatMoney(Number(i.price * i.quantity), currency)}</td></tr>`;
  }).join('');
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#E31C1C">Payment Confirmed!</h2>
    <p>Hi <strong>${safeBuyerName}</strong>, your payment for order <strong>#${String(orderId).slice(0,8).toUpperCase()}</strong> has been received and confirmed.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:#f8f8f8"><th style="padding:8px;text-align:left">Product</th><th style="padding:8px;text-align:center">Qty</th><th style="padding:8px;text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:1.1rem"><strong>Total Paid: ${formatMoney(total, currency)}</strong></p>
    <p style="color:#666;font-size:.88rem">We are now preparing your order for dispatch.</p>
    <a href="${BASE_URL}/account?tab=orders" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#E31C1C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View My Orders</a>
  </div>`;
}

function newOrderSellerHtml(orderId, items, currency = 'NGN', buyerName = '', orderDate = '') {
  const rows = items.map(i =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(i.name)}${optionsHtml(i.selectedOptions)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatMoney(Number(i.price * i.quantity), currency)}</td></tr>`
  ).join('');
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#E31C1C">New Order Received!</h2>
    <p>A customer has placed and paid for an order containing your product(s). Order ID: <strong>#${String(orderId).slice(0,8).toUpperCase()}</strong></p>
    ${(buyerName || orderDate) ? `<p style="color:#444">${buyerName ? `<strong>Customer:</strong> ${escapeHtml(buyerName)}` : ''}${(buyerName && orderDate) ? ' &nbsp;·&nbsp; ' : ''}${orderDate ? `<strong>Date:</strong> ${escapeHtml(orderDate)}` : ''}</p>` : ''}
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:#f8f8f8"><th style="padding:8px;text-align:left">Product</th><th style="padding:8px;text-align:center">Qty</th><th style="padding:8px;text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#666;font-size:.88rem">Please prepare the item(s) for dispatch promptly.</p>
    <a href="${BASE_URL}/seller/dashboard" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#E31C1C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View Seller Dashboard</a>
  </div>`;
}

function newOrderAdminHtml(orderId, items, total, buyerName, orderDate = '', currency = 'NGN') {
  const rows = items.map(i =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(i.name)}${optionsHtml(i.selectedOptions)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatMoney(Number(i.price * i.quantity), currency)}</td></tr>`
  ).join('');
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#E31C1C">New Paid Order</h2>
    <p>Order <strong>#${String(orderId).slice(0,8).toUpperCase()}</strong> has been paid.</p>
    <p style="color:#444"><strong>Customer:</strong> ${escapeHtml(buyerName || 'Customer')}${orderDate ? ` &nbsp;·&nbsp; <strong>Date:</strong> ${escapeHtml(orderDate)}` : ''}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:#f8f8f8"><th style="padding:8px;text-align:left">Product</th><th style="padding:8px;text-align:center">Qty</th><th style="padding:8px;text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:1.1rem"><strong>Total: ${formatMoney(total, currency)}</strong></p>
    <a href="${BASE_URL}/admin/orders" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#E31C1C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View in Admin Panel</a>
  </div>`;
}

function payoutRequestAdminHtml({ sellerName, sellerEmail, amount, bankName, accountName, accountNumber, currency = 'NGN' }) {
  const row = (label, val) => val ? `<tr><td style="padding:6px 8px;color:#64748b">${escapeHtml(label)}</td><td style="padding:6px 8px;font-weight:600">${escapeHtml(String(val))}</td></tr>` : '';
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#E31C1C">New Payout Request</h2>
    <p>A seller has requested a payout and submitted their bank details.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
      ${row('Seller', sellerName)}
      ${row('Seller email', sellerEmail)}
      <tr><td style="padding:6px 8px;color:#64748b">Amount</td><td style="padding:6px 8px;font-weight:800;color:#E31C1C">${formatMoney(Number(amount || 0), currency)}</td></tr>
      ${row('Bank', bankName)}
      ${row('Account name', accountName)}
      ${row('Account number', accountNumber)}
    </table>
    <a href="${BASE_URL}/admin/payouts" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#E31C1C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Review in Admin</a>
  </div>`;
}

module.exports = { sendEmail, escapeHtml, formatMoney, getEmailFooter, orderConfirmationHtml, orderStatusHtml, sellerApprovedHtml, newsletterConfirmHtml, paymentConfirmedHtml, newOrderSellerHtml, newOrderAdminHtml, payoutRequestAdminHtml };
