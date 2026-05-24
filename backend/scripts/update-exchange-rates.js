require('dotenv').config();
const supabase = require('../src/config/supabase');

async function updateExchangeRates() {
  console.log('Starting exchange rates update...');
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.result !== 'success' || !data.rates) {
      throw new Error('Invalid response structure from exchange rate API');
    }

    const targetCurrencies = ['USD', 'NGN', 'GBP', 'EUR'];
    const upsertData = targetCurrencies.map((currency) => {
      const rate = data.rates[currency];
      if (rate === undefined) {
        throw new Error(`Rate for currency ${currency} not found in API response`);
      }
      return {
        source_currency: 'USD',
        target_currency: currency,
        rate: rate,
        last_updated: new Date().toISOString()
      };
    });

    console.log('Upserting rates to Supabase:', upsertData);
    const { error } = await supabase
      .from('exchange_rates')
      .upsert(upsertData, { onConflict: 'source_currency,target_currency' });

    if (error) {
      throw error;
    }

    console.log('Exchange rates successfully updated in Supabase.');
  } catch (err) {
    console.error('Error updating exchange rates:', err.message);
    process.exit(1);
  }
}

updateExchangeRates();
