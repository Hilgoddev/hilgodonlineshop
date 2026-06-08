import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();
const FALLBACK_RATES = { USD: 1, NGN: 1365, GBP: 0.75, EUR: 0.87 };
const CURRENCY_STORAGE_KEY = 'hilgod_currency_pref';
const RATES_CACHE_KEY = 'hilgod_exchange_rates_cache';
const RATES_CACHE_TTL = 24 * 60 * 60 * 1000;
const SUPPORTED = ['USD', 'NGN', 'GBP', 'EUR'];
const REQUIRED_RATES = ['USD', 'NGN', 'GBP', 'EUR'];

const normalizeRates = (input) => {
    if (!input || typeof input !== 'object') return null;

    const rates = {};
    for (const currency of REQUIRED_RATES) {
        const numericRate = Number(input[currency]);
        if (!Number.isFinite(numericRate) || numericRate <= 0) {
            return null;
        }
        rates[currency] = numericRate;
    }

    return rates;
};

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

                // ── Load exchange rates ──────────────────────────────────
                let rates = FALLBACK_RATES;
                let ratesLoaded = false;

                // Check localStorage cache first
                const localRatesCache = typeof window !== 'undefined' ? localStorage.getItem(RATES_CACHE_KEY) : null;
                if (localRatesCache) {
                    try {
                        const { rates: cachedRates, timestamp } = JSON.parse(localRatesCache);
                        const normalizedCachedRates = normalizeRates(cachedRates);
                        if (Date.now() - Number(timestamp || 0) < RATES_CACHE_TTL && normalizedCachedRates) {
                            rates = normalizedCachedRates;
                            ratesLoaded = true;
                        } else {
                            try { localStorage.removeItem(RATES_CACHE_KEY); } catch (_) {}
                        }
                    } catch (_) {
                        try { localStorage.removeItem(RATES_CACHE_KEY); } catch (_) {}
                    }
                }

                if (!ratesLoaded) {
                    try {
                        const ratesRes = await fetch('/api/exchange-rates', { cache: 'no-store' });
                        if (ratesRes.ok) {
                            const ratesData = await ratesRes.json();
                            const normalizedRates = normalizeRates(ratesData?.rates);
                            if (ratesData?.success && normalizedRates) {
                                rates = normalizedRates;
                                ratesLoaded = true;
                                try {
                                    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({
                                        rates,
                                        timestamp: Date.now()
                                    }));
                                } catch (_) {}
                            }
                        }
                    } catch (_) {
                        console.warn('Failed to fetch rates from backend, using fallback rates...');
                    }
                }

                // ── Dynamic-first geolocation ────────────────────────────
                // Try server-side geo FIRST (Vercel/Cloudflare headers — fast,
                // no CORS). Only fall back to the third-party ipwho.is lookup
                // when the server had no real geo, so we avoid its frequent 403s.
                let geoCurrency = null;
                let geoDetected = false; // true only when a *real* IP geo source answered

                // 1) Prefer server-side geo
                try {
                    const serverData = await fetch('/api/location-currency', { cache: 'no-store' })
                        .then(r => r.ok ? r.json() : null);
                    if (serverData?.success && serverData?.detected && serverData?.currency?.code) {
                        geoCurrency = serverData.currency.code;
                        geoDetected = true;
                    }
                } catch (_) {}

                // 2) Fallback to client-side ipwho.is only when server had no real geo
                if (!geoCurrency) {
                    try {
                        const clientData = await fetch('https://ipwho.is/', { cache: 'no-store' })
                            .then(r => r.ok ? r.json() : null);
                        if (clientData?.success && clientData?.currency?.code && SUPPORTED.includes(String(clientData.currency.code).toUpperCase())) {
                            geoCurrency = String(clientData.currency.code).toUpperCase();
                            geoDetected = true;
                        }
                    } catch (_) {}
                }

                // ── Priority: saved > IP geo > timezone > locale > USD ───
                const detectedCurrency = saved || geoCurrency || tzCurrency || localeCurrency || 'USD';

                if (isMounted) {
                    setExchangeRates(rates);
                    const normalized = String(detectedCurrency || 'USD').toUpperCase();
                    const finalCurrency = SUPPORTED.includes(normalized) && Number(rates[normalized]) > 0
                        ? normalized
                        : SUPPORTED.includes(String(tzCurrency).toUpperCase()) && Number(rates[tzCurrency]) > 0 ? String(tzCurrency).toUpperCase()
                        : SUPPORTED.includes(String(localeCurrency).toUpperCase()) && Number(rates[localeCurrency]) > 0 ? String(localeCurrency).toUpperCase()
                        : 'USD';
                    setCurrency(finalCurrency);

                    // Only persist when we got a REAL geo detection or timezone/locale,
                    // never persist the bare 'USD' fallback default
                    if (!saved && geoDetected) {
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
        // Guard against missing/zero/non-finite rates so we never render
        // Infinity or NaN. A bad rate falls back to 1 (no conversion).
        const rawSrc = Number(exchangeRates[src]);
        const rawDst = Number(exchangeRates[dst]);
        const srcRate = Number.isFinite(rawSrc) && rawSrc > 0 ? rawSrc : 1;
        const dstRate = Number.isFinite(rawDst) && rawDst > 0 ? rawDst : 1;
        const amount = Number(price);
        const safeAmount = Number.isFinite(amount) ? amount : 0;
        const priceInUSD = safeAmount / srcRate;
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
