// Display helpers for seller payouts. The rules themselves live in
// backend/src/lib/payouts.js — keep labels and lists in sync.

export const PAYOUT_METHODS = [
  { id: 'bank_transfer', label: 'Bank transfer', icon: 'fa-building-columns', hint: 'Recommended — straight to your bank account' },
  { id: 'crypto', label: 'Crypto', icon: 'fa-coins', hint: 'USDT, USDC, BTC or ETH to your wallet' },
  { id: 'other', label: 'Other', icon: 'fa-mobile-screen', hint: 'OPay, PalmPay, PayPal, Payoneer…' },
];
export const CRYPTO_ASSETS = ['USDT', 'USDC', 'BTC', 'ETH'];
export const CRYPTO_NETWORKS = ['TRC20', 'ERC20', 'BEP20', 'Solana', 'Bitcoin'];

export const methodLabel = (id) => PAYOUT_METHODS.find((m) => m.id === id)?.label || 'Bank transfer';

// Short, partly hidden summary for lists (full details stay with admins).
export function payoutSummary(method, d = {}) {
  const tail = (s, n = 4) => (s ? `…${String(s).slice(-n)}` : '');
  if (method === 'crypto') return `${d.asset || ''} · ${d.network || ''} · ${tail(d.walletAddress, 6)}`;
  if (method === 'other') return `${d.provider || ''} · ${tail(d.account)}`;
  return `${d.bankName || ''} · ${tail(d.accountNumber)}`;
}

// WhatsApp link to support, pre-filled with the payout's details.
export function discrepancyLink(phone, payout) {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  const text = `Hello Hilgod, I'm reporting a payout discrepancy. Payout of ₦${Number(payout.amount).toLocaleString()} marked paid${payout.paid_at ? ` on ${new Date(payout.paid_at).toLocaleString('en-GB')}` : ''}${payout.payment_reference ? `, reference ${payout.payment_reference}` : ''}, has not reached me.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
