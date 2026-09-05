'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { SUPPORTED_CURRENCIES, useCurrencyRates } from './currency';

const CurrencyContext = createContext(null);
const STORAGE_KEY = 'royale-designs-currency';

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState('AUD');
  const { rates, loaded } = useCurrencyRates();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED_CURRENCIES.includes(saved)) setCurrency(saved);
    } catch {
      // ignore
    }
  }, []);

  const changeCurrency = (c) => {
    setCurrency(c);
    try {
      window.localStorage.setItem(STORAGE_KEY, c);
    } catch {
      // ignore
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency: changeCurrency, rates, loaded }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
