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
                const fallbackCurrency = mapLocaleToCurrency(
                    typeof navigator !== 'undefined' ? navigator.language : ''
                );
                const initialCurrency = saved || fallbackCurrency;

                let userCurrency = initialCurrency;
                let rates = FALLBACK_RATES;

                // Best-effort geolocation lookup (non-blocking for UX).
                try {
                    const locRes = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
                    if (locRes.ok) {
                        const locData = await locRes.json();
                        userCurrency = locData?.currency || userCurrency;
                    }
                } catch (_) {
                    // Swallow all network failures; keep fallback currency.
                }

                // Best-effort rates lookup.
                try {
                    const ratesRes = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
                    if (ratesRes.ok) {
                        const ratesData = await ratesRes.json();
                        if (ratesData?.rates && typeof ratesData.rates === 'object') {
                            rates = { ...FALLBACK_RATES, ...ratesData.rates };
                        }
                    }
                } catch (_) {
                    // Swallow all network failures; keep fallback rates.
                }

                if (isMounted) {
                    setExchangeRates(rates);
                    setCurrency(rates[userCurrency] ? userCurrency : initialCurrency || 'USD');
                }
            } catch (error) {
                console.error("Failed to detect currency:", error);
                if (isMounted) {
                    setExchangeRates(FALLBACK_RATES);
                    setCurrency('USD');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        detectCurrency();
        return () => {
            isMounted = false;
        };
    }, []);

    const formatPrice = (priceInUSD) => {
        if (!exchangeRates[currency]) return `$${priceInUSD.toFixed(2)}`;
        
        const converted = priceInUSD * exchangeRates[currency];
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(converted);
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
