// Seller money rules: platform commission per sale and payout methods.
// Frontend mirror (display only): frontend/lib/payouts.js — keep in sync.

const supabase = require('../config/supabase');

// Commission: 5% of an item's price for items up to €100, 10% for items above
// €100. The rate is decided when the order is placed (at that day's exchange
// rate) and stored on the order line, so a seller's earnings never change
// afterwards when rates move.
const LOW_COMMISSION_RATE = 0.05;
const HIGH_COMMISSION_RATE = 0.10;
const HIGH_RATE_ABOVE_EUR = 100;
// Lines sold before per-line rates existed were charged the old flat 10%.
const LEGACY_COMMISSION_RATE = 0.10;

// Prices are in Naira; the €100 threshold is converted with the stored rates
// (USD-based rows in exchange_rates), falling back to a recent fixed rate.
const FALLBACK_NGN_PER_EUR = 1425.2 / 0.911369;

async function getNgnPerEur() {
  try {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('target_currency, rate')
      .eq('source_currency', 'USD')
      .in('target_currency', ['NGN', 'EUR']);
    if (error || !data) return FALLBACK_NGN_PER_EUR;
    const ngn = Number(data.find((r) => r.target_currency === 'NGN')?.rate);
    const eur = Number(data.find((r) => r.target_currency === 'EUR')?.rate);
    return ngn > 0 && eur > 0 ? ngn / eur : FALLBACK_NGN_PER_EUR;
  } catch {
    return FALLBACK_NGN_PER_EUR;
  }
}

// Commission rate for one item at `unitPriceNgn`.
function commissionRateFor(unitPriceNgn, ngnPerEur) {
  return Number(unitPriceNgn) > HIGH_RATE_ABOVE_EUR * ngnPerEur ? HIGH_COMMISSION_RATE : LOW_COMMISSION_RATE;
}

// A stored line's rate; lines sold before rates were stored used the flat 10%.
const lineRate = (line) => {
  const r = Number(line?.commission_rate);
  return r > 0 && r < 1 ? r : LEGACY_COMMISSION_RATE;
};

// ── Payout methods ──────────────────────────────────────────────────────────
// Bank transfer is the main method; crypto and "other" (mobile money, PayPal…)
// are alternatives. Details are checked here so admins get complete, usable
// instructions.
const PAYOUT_METHODS = ['bank_transfer', 'crypto', 'other'];
const CRYPTO_ASSETS = ['USDT', 'USDC', 'BTC', 'ETH'];
const CRYPTO_NETWORKS = ['TRC20', 'ERC20', 'BEP20', 'Solana', 'Bitcoin'];

const str = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

// Returns { method, details } or { error }.
function cleanPayoutDetails(method, raw = {}) {
  const m = PAYOUT_METHODS.includes(method) ? method : null;
  if (!m) return { error: 'Choose how you want to be paid: bank transfer, crypto or another method.' };
  const r = raw && typeof raw === 'object' ? raw : {};

  if (m === 'bank_transfer') {
    const details = { bankName: str(r.bankName, 80), accountName: str(r.accountName, 100), accountNumber: str(r.accountNumber, 34).replace(/\s/g, '') };
    if (!details.bankName) return { error: 'Enter your bank name.' };
    if (!details.accountName) return { error: 'Enter the account holder’s name.' };
    if (!/^[A-Za-z0-9]{6,34}$/.test(details.accountNumber)) return { error: 'Enter a valid account number (Nigerian accounts have 10 digits).' };
    return { method: m, details };
  }
  if (m === 'crypto') {
    const details = { asset: str(r.asset, 10).toUpperCase(), network: str(r.network, 20), walletAddress: str(r.walletAddress, 120).replace(/\s/g, '') };
    if (!CRYPTO_ASSETS.includes(details.asset)) return { error: `Choose a coin: ${CRYPTO_ASSETS.join(', ')}.` };
    if (!CRYPTO_NETWORKS.includes(details.network)) return { error: `Choose a network: ${CRYPTO_NETWORKS.join(', ')}.` };
    if (!/^[A-Za-z0-9]{20,120}$/.test(details.walletAddress)) return { error: 'Enter your full wallet address (letters and numbers only).' };
    return { method: m, details };
  }
  const details = { provider: str(r.provider, 60), account: str(r.account, 120), note: str(r.note, 300) };
  if (!details.provider) return { error: 'Enter the payment service (e.g. OPay, PayPal, Payoneer).' };
  if (!details.account) return { error: 'Enter the account, phone number or email to pay into.' };
  return { method: m, details };
}

// One-line summary for emails and admin lists.
function describePayoutDetails(method, d = {}) {
  if (method === 'crypto') return `${d.asset || ''} on ${d.network || ''} → ${d.walletAddress || ''}`;
  if (method === 'other') return `${d.provider || ''}: ${d.account || ''}${d.note ? ` (${d.note})` : ''}`;
  return `${d.bankName || ''} · ${d.accountName || ''} · ${d.accountNumber || ''}`;
}

// After an admin marks a payout as paid, the seller should see the money
// within this many hours; otherwise they report a discrepancy.
const PAYOUT_ARRIVAL_HOURS = 5;
const SUPPORT_PHONE = process.env.SUPPORT_PHONE?.trim() || '+357 95 130549';

module.exports = {
  LOW_COMMISSION_RATE,
  HIGH_COMMISSION_RATE,
  HIGH_RATE_ABOVE_EUR,
  LEGACY_COMMISSION_RATE,
  getNgnPerEur,
  commissionRateFor,
  lineRate,
  PAYOUT_METHODS,
  CRYPTO_ASSETS,
  CRYPTO_NETWORKS,
  cleanPayoutDetails,
  describePayoutDetails,
  PAYOUT_ARRIVAL_HOURS,
  SUPPORT_PHONE,
};
