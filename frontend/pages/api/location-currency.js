const COUNTRY_TO_CURRENCY = {
  // Africa
  NG: 'NGN', GH: 'USD', KE: 'USD', ZA: 'USD', EG: 'USD',
  // Europe – GBP
  GB: 'GBP',
  // Europe – EUR
  FR: 'EUR', DE: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  BE: 'EUR', PT: 'EUR', IE: 'EUR', AT: 'EUR', FI: 'EUR',
  GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR', EE: 'EUR',
  LV: 'EUR', LT: 'EUR', CY: 'EUR', MT: 'EUR', HR: 'EUR',
  // Americas
  US: 'USD', CA: 'USD', MX: 'USD', BR: 'USD',
  // Asia-Pacific
  AU: 'USD', JP: 'USD', IN: 'USD', CN: 'USD', SG: 'USD',
};

export default function handler(req, res) {
  const countryHeader =
    req.headers['x-vercel-ip-country'] ||
    req.headers['cf-ipcountry'] ||
    req.headers['x-country-code'] ||
    '';

  const country = String(countryHeader).trim().toUpperCase();

  // If no geo header was present, tell the client so it can use its own fallback
  if (!country) {
    return res.status(200).json({
      success: true,
      detected: false,
      country: '',
      currency: { code: 'USD' },
    });
  }

  const currency = COUNTRY_TO_CURRENCY[country] || 'USD';

  res.status(200).json({
    success: true,
    detected: true,
    country,
    currency: { code: currency },
  });
}

