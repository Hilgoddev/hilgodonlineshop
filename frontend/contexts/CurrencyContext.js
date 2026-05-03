import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
    const [currency, setCurrency] = useState('USD');
    const [exchangeRates, setExchangeRates] = useState({ USD: 1 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function detectCurrency() {
            try {
                // Fetch user's IP-based location
                const locRes = await fetch('https://ipapi.co/json/');
                const locData = await locRes.json();
                
                const userCurrency = locData.currency || 'USD';
                
                // Fetch exchange rates based on USD
                // Note: Using a public mock/demo API for demonstration. 
                // Replace with a real API like ExchangeRate-API or OpenExchangeRates.
                const ratesRes = await fetch('https://open.er-api.com/v6/latest/USD');
                const ratesData = await ratesRes.json();
                
                if (ratesData.rates) {
                    setExchangeRates(ratesData.rates);
                    // Only set to user's currency if we have a rate for it, otherwise default to USD
                    if (ratesData.rates[userCurrency]) {
                        setCurrency(userCurrency);
                    }
                }
            } catch (error) {
                console.error("Failed to detect currency:", error);
                // Fallback to USD
                setCurrency('USD');
            } finally {
                setLoading(false);
            }
        }

        detectCurrency();
    }, []);

    const formatPrice = (priceInUSD) => {
        if (!exchangeRates[currency]) return `$${priceInUSD.toFixed(2)}`;
        
        const converted = priceInUSD * exchangeRates[currency];
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(converted);
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, loading }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    return useContext(CurrencyContext);
}
