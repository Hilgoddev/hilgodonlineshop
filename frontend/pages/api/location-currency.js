const COUNTRY_TO_CURRENCY = {
  NG: 'NGN',
  GB: 'GBP',
  FR: 'EUR',
  DE: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  AT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  LU: 'EUR',
  US: 'USD',
  CA: 'USD',
};

export default function handler(req, res) {
  const countryHeader =
    req.headers['x-vercel-ip-country'] ||
    req.headers['cf-ipcountry'] ||
    req.headers['x-country-code'] ||
    '';

  const country = String(countryHeader).trim().toUpperCase();
  const currency = COUNTRY_TO_CURRENCY[country] || 'USD';

  res.status(200).json({
    success: true,
    country,
    currency: { code: currency },
  });
}

