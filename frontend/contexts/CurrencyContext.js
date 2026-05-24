import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();
const FALLBACK_RATES = { USD: 1, NGN: 1550, GBP: 0.79, EUR: 0.92 };
const CURRENCY_STORAGE_KEY = 'hilgod_currency_pref';
const SUPPORTED = ['USD', 'NGN', 'GBP', 'EUR'];

const mapLocaleToCurrency = (locale = '') => {
    const lower = String(locale).toLowerCase();
    if (lower.includes('ng')) return 'NGN';
    if (lower.includes('gb')) return 'GBP';
    if (lower.includes('fr') || lower.includes('de') || lower.includes('it') || lower.includes('es') || lower.includes('nl')) return 'EUR';
    return 'USD';
};

const mapTimeZoneToCurrency = (timeZone = '') => {
    const tz = String(timeZone).toLowerCase();
    if (tz.includes('africa/lagos')) return 'NGN';
    if (tz.includes('europe/london')) return 'GBP';
    if (tz.startsWith('europe/')) return 'EUR';
    if (tz.startsWith('america/')) return 'USD';
    return 'USD';
};

export function CurrencyProvider({ children }) {
    const [currency, setCurrency] = useState('USD');
    const [exchangeRates, setExchangeRates] = useState(FALLBACK_RATES);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function detectCurrency() {
            try {
                const saved = typeof window !== 'undefined' ? localStorage.getItem(CURRENCY_STORAGE_KEY) : null;
                const localeCurrency = mapLocaleToCurrency(
                    typeof navigator !== 'undefined' ? navigator.language : ''
                );
                const tzCurrency = mapTimeZoneToCurrency(
                    typeof Intl !== 'undefined'
                        ? Intl.DateTimeFormat().resolvedOptions().timeZone
                        : ''
                );

                // Load exchange rates
                let rates = FALLBACK_RATES;
                let ratesLoaded = false;

                // Check localStorage cache first
                const localRatesCache = typeof window !== 'undefined' ? localStorage.getItem('hilgod_exchange_rates_cache') : null;
                if (localRatesCache) {
                    try {
                        const { rates: cachedRates, timestamp } = JSON.parse(localRatesCache);
                        // 24 hour TTL (24 * 60 * 60 * 1000 = 86400000 ms)
                        if (Date.now() - timestamp < 86400000 && cachedRates && typeof cachedRates === 'object') {
                            rates = cachedRates;
                            ratesLoaded = true;
                        }
                    } catch (_) {}
                }

                if (!ratesLoaded) {
                    // Fetch from backend cache
                    try {
                        const ratesRes = await fetch('/api/exchange-rates', { cache: 'no-store' });
                        if (ratesRes.ok) {
                            const ratesData = await ratesRes.json();
                            if (ratesData?.success && ratesData?.rates) {
                                rates = { ...FALLBACK_RATES, ...ratesData.rates };
                                ratesLoaded = true;
                                try {
                                    localStorage.setItem('hilgod_exchange_rates_cache', JSON.stringify({
                                        rates,
                                        timestamp: Date.now()
                                    }));
                                } catch (_) {}
                            }
                        }
                    } catch (_) {
                        console.warn('Failed to fetch rates from backend, trying external API...');
                    }
                }

                if (!ratesLoaded) {
                    // Fetch from external API as fallback
                    try {
                        const ratesRes = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
                        if (ratesRes.ok) {
                            const ratesData = await ratesRes.json();
                            if (ratesData?.rates && typeof ratesData.rates === 'object') {
                                rates = { ...FALLBACK_RATES, ...ratesData.rates };
                                ratesLoaded = true;
                                try {
                                    localStorage.setItem('hilgod_exchange_rates_cache', JSON.stringify({
                                        rates,
                                        timestamp: Date.now()
                                    }));
                                } catch (_) {}
                            }
                        }
                    } catch (_) {}
                }

                // 1. IP geolocation (runs first of geo checks — most accurate)
                let geoCurrency = null;
                try {
                    const locRes = await fetch('/api/location-currency', { cache: 'no-store' });
                    if (locRes.ok) {
                        const locData = await locRes.json();
                        if (locData?.success && locData?.currency?.code) {
                            geoCurrency = locData.currency.code;
                        }
                    }
                } catch (_) {}

                // 2. Client-side IP lookup fallback if edge headers are unavailable
                if (!geoCurrency) {
                    try {
                        const locRes = await fetch('https://ipwho.is/', { cache: 'no-store' });
                        if (locRes.ok) {
                            const locData = await locRes.json();
                            if (locData?.success && locData?.currency?.code) {
                                geoCurrency = locData.currency.code;
                            }
                        }
                    } catch (_) {}
                }

                // Priority: saved preference -> IP geo -> timezone -> locale -> USD
                const detectedCurrency = saved || geoCurrency || tzCurrency || localeCurrency || 'USD';

                if (isMounted) {
                    setExchangeRates(rates);
                    const normalized = String(detectedCurrency || 'USD').toUpperCase();
                    const finalCurrency = SUPPORTED.includes(normalized) && rates[normalized]
                        ? normalized
                        : rates[tzCurrency] ? tzCurrency
                        : rates[localeCurrency] ? localeCurrency : 'USD';
                    setCurrency(finalCurrency);

                    // Keep local preference aligned when user has never chosen manually
                    if (!saved) {
                        try { localStorage.setItem(CURRENCY_STORAGE_KEY, finalCurrency); } catch (_) {}
                    }
                }
            } catch (error) {
                console.error('Failed to detect currency:', error);
                if (isMounted) {
                    setExchangeRates(FALLBACK_RATES);
                    setCurrency('USD');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        detectCurrency();
        return () => {
            isMounted = false;
        };
    }, []);

    const SYMBOLS = { NGN: '\u20A6', USD: '$', GBP: '\u00A3', EUR: '\u20AC' };

    // sourceCurrency: the currency the price is stored in (e.g. 'NGN' for naira prices)
    // compact=true -> "5,700,000" (no cents); compact=false -> "5,700,000.00" (full)
    const formatPrice = (price, sourceCurrency = 'NGN', compact = true) => {
        const src = String(sourceCurrency || 'NGN').toUpperCase();
        const dst = String(currency || 'USD').toUpperCase();
        const srcRate = exchangeRates[src] ?? 1;
        const dstRate = exchangeRates[dst] ?? 1;
        const priceInUSD = price / srcRate;
        const converted = priceInUSD * dstRate;
        const symbol = SYMBOLS[dst] || dst;
        if (compact) return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const setCurrencyPreference = (nextCurrency) => {
        const normalized = String(nextCurrency || 'USD').toUpperCase();
        if (SUPPORTED.includes(normalized)) {
            setCurrency(normalized);
            try {
                localStorage.setItem(CURRENCY_STORAGE_KEY, normalized);
            } catch (_) {
                // ignore storage failures
            }
        }
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency: setCurrencyPreference, formatPrice, loading }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    return useContext(CurrencyContext);
}
