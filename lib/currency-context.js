'use client';

import { createContext, useContext, useState } from 'react';
import { useCurrencyRates } from './currency';

const CurrencyContext = createContext(null);

// Currency choice is deliberately NOT remembered between visits — every
// fresh visit (or page reload) starts back on AUD, your home currency.
// It still stays put while someone browses around the site in one sitting
// (this provider lives at the root layout, so it isn't remounted between
// pages), it just doesn't carry over to their next visit.
export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState('AUD');
  const { rates, loaded } = useCurrencyRates();

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, loaded }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
