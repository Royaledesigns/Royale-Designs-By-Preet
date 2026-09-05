'use client';

import { useEffect, useState } from 'react';

// Approximate fallback rates (AUD base) used if the live rate lookup fails.
// These are only ever shown as an estimate — the real charge always happens
// in AUD through Stripe at checkout.
const FALLBACK_RATES = {
  AUD: 1,
  USD: 0.66,
  GBP: 0.52,
  CAD: 0.91,
  EUR: 0.61,
  NZD: 1.09,
};

export const SUPPORTED_CURRENCIES = ['AUD', 'USD', 'GBP', 'CAD', 'EUR', 'NZD'];

const SYMBOLS = {
  AUD: 'A$',
  USD: 'US$',
  GBP: '£',
  CAD: 'C$',
  EUR: '€',
  NZD: 'NZ$',
};

export function formatMoney(amount, currency) {
  const symbol = SYMBOLS[currency] || '';
  return `${symbol}${amount.toFixed(2)}`;
}

// Fetches live AUD -> [USD, GBP, CAD, EUR, NZD] rates from the free
// Frankfurter API (no key required) so international customers can see an
// estimated price in their own currency. Falls back to static rates if the
// request fails (offline, API down, etc).
export function useCurrencyRates() {
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(
      'https://api.frankfurter.app/latest?from=AUD&to=USD,GBP,CAD,EUR,NZD'
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (cancelled || !data?.rates) return;
        setRates({ AUD: 1, ...data.rates });
        setLoaded(true);
      })
      .catch(() => {
        // keep fallback rates
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { rates, loaded };
}

export function convert(amountAud, currency, rates) {
  const rate = rates[currency] ?? FALLBACK_RATES[currency] ?? 1;
  return amountAud * rate;
}
