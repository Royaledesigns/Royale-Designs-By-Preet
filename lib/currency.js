'use client';

import { useEffect, useState } from 'react';
import { FALLBACK_RATES, SUPPORTED_CURRENCIES, formatMoney, convert } from './currency-shared';

export { SUPPORTED_CURRENCIES, formatMoney, convert };

// Fetches live AUD -> [USD, GBP, CAD, EUR, NZD] rates from our own
// /api/exchange-rates route (which in turn pulls from the free Frankfurter
// API, cached for an hour) so international shoppers can see an estimated
// price in their own currency. Falls back to static rates if the request
// fails (offline, API down, etc) — going through our own route rather than
// fetching Frankfurter directly from the browser avoids any CORS issues.
export function useCurrencyRates() {
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/exchange-rates')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (cancelled || !data?.rates) return;
        setRates(data.rates);
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
