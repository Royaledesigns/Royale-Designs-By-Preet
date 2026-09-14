// Shared server-side helper for fetching AUD -> foreign-currency rates.
// Used by /api/exchange-rates (feeds the header's currency switcher) and by
// /api/checkout (to show a "you'll be charged ~X in your currency" note on
// the Stripe payment page). Frankfurter only republishes once a day, and
// the `next: { revalidate }` option lets Vercel cache this for an hour so
// we aren't hitting Frankfurter on every request.
import { FALLBACK_RATES } from './currency-shared';

export async function getExchangeRates() {
  try {
    const res = await fetch(
      'https://api.frankfurter.dev/v1/latest?base=AUD&symbols=USD,GBP,CAD,EUR,NZD',
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error(`Frankfurter responded ${res.status}`);
    const data = await res.json();
    if (!data?.rates) throw new Error('No rates in response');
    return { rates: { AUD: 1, ...data.rates }, live: true, asOf: data.date || null };
  } catch (err) {
    console.error('Exchange rate lookup failed, using fallback rates:', err.message);
    return { rates: { AUD: 1, ...FALLBACK_RATES }, live: false, asOf: null };
  }
}
