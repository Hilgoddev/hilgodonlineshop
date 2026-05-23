import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();
const FALLBACK_RATES = { USD: 1, NGN: 1550, GBP: 0.79, EUR: 0.92 };
const CURRENCY_STORAGE_KEY = 'hilgod_currency_pref';

const mapLocaleToCurrency = (locale = '') => {
    const lower = String(locale).toLowerCase();
    if (lower.includes('ng')) return 'NGN';
    if (lower.includes('gb')) return 'GBP';
    if (lower.includes('fr') || lower.includes('de') || lower.includes('it') || lower.includes('es') || lower.includes('nl')) return 'EUR';
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

                // Fetch live exchange rates
                let rates = FALLBACK_RATES;
                try {
                    const ratesRes = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
                    if (ratesRes.ok) {
                        const ratesData = await ratesRes.json();
                        if (ratesData?.rates && typeof ratesData.rates === 'object') {
                            rates = { ...FALLBACK_RATES, ...ratesData.rates };
                        }
                    }
                } catch (_) {}

                // 1. IP geolocation (always runs first — most accurate)
                let geoCurrency = null;
                try {
                    const locRes = await fetch('https://ipwho.is/', { cache: 'no-store' });
                    if (locRes.ok) {
                        const locData = await locRes.json();
                        if (locData?.success && locData?.currency?.code) {
                            geoCurrency = locData.currency.code;
                        }
                    }
                } catch (_) {}

                // Priority: IP geo → saved preference → locale → USD
                const detectedCurrency = geoCurrency || saved || localeCurrency || 'USD';

                if (isMounted) {
                    setExchangeRates(rates);
                    const finalCurrency = rates[detectedCurrency]
                        ? detectedCurrency
                        : rates[localeCurrency] ? localeCurrency : 'USD';
                    setCurrency(finalCurrency);
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

    const SYMBOLS = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' };

    // sourceCurrency: the currency the price is stored in (e.g. 'NGN' for naira prices)
    // compact=true → "₦5,700,000" (no cents); compact=false → "₦5,700,000.00" (full)
    const formatPrice = (price, sourceCurrency = 'NGN', compact = true) => {
        const srcRate = exchangeRates[sourceCurrency] ?? 1;
        const dstRate = exchangeRates[currency] ?? 1;
        const priceInUSD = price / srcRate;
        const converted = priceInUSD * dstRate;
        const symbol = SYMBOLS[currency] || currency;
        if (compact) return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const setCurrencyPreference = (nextCurrency) => {
        setCurrency(nextCurrency);
        try {
            localStorage.setItem(CURRENCY_STORAGE_KEY, nextCurrency);
        } catch (_) {
            // ignore storage failures
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
