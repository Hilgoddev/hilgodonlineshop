const { withTimeout } = require('./resilience');
const supabase = require('../config/supabase');
const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
function convertAmount(amount, source, target, rates) {
  if (source === target) return roundMoney(amount);
  const from = Number(rates?.[source]), to = Number(rates?.[target]);
  if (!(from > 0) || !(to > 0) || !Number.isFinite(from + to)) throw new Error('A current exchange rate is unavailable. Please try again shortly.');
  return roundMoney(Number(amount) / from * to);
}
async function getCheckoutRates() {
  const { data, error } = await withTimeout(signal => supabase.from('exchange_rates')
    .select('source_currency,target_currency,rate,last_updated').eq('source_currency','USD').abortSignal(signal), 6000);
  if (error) throw error;
  const rates = {};
  for (const row of data || []) {
    if (Date.now() - Date.parse(row.last_updated) < 7 * 86400000 && Number(row.rate) > 0) rates[row.target_currency] = Number(row.rate);
  }
  if (!rates.NGN || !rates.EUR) throw new Error('A current exchange rate is unavailable. Please try again shortly.');
  return rates;
}
function settlementQuote(totalNGN, country, method, rates) {
  if (country !== 'Cyprus') return null;
  if (method !== 'stripe') throw new Error('Orders delivered to Cyprus are charged in EUR through Stripe. Please select Stripe.');
  return { currency: 'EUR', amount: convertAmount(totalNGN,'NGN','EUR',rates), ngn_to_eur: Number(rates.EUR)/Number(rates.NGN), quoted_at: new Date().toISOString(), ledger_currency: 'NGN' };
}
module.exports = { roundMoney, convertAmount, getCheckoutRates, settlementQuote };
