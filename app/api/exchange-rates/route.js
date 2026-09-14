import { NextResponse } from 'next/server';

// Feeds the currency switcher (see lib/currency.js) an AUD -> USD/GBP/CAD/EUR/NZD
// rate table. Runs server-side so the browser never talks to a third-party API
// directly (no CORS surprises), and Vercel caches the result for an hour so we
// aren't re-fetching Frankfurter on every single visitor. Frankfurter itself
// only republishes rates once a day, so an hourly cache is already fresher
// than the source data.
const FALLBACK_RATES = {
  USD: 0.66,
  GBP: 0.52,
  CAD: 0.91,
  EUR: 0.61,
  NZD: 1.09,
};

export async function GET() {
  try {
    const res = await fetch(
      'https://api.frankfurter.dev/v1/latest?base=AUD&symbols=USD,GBP,CAD,EUR,NZD',
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error(`Frankfurter responded ${res.status}`);
    const data = await res.json();
    if (!data?.rates) throw new Error('No rates in response');
    return NextResponse.json({
      rates: { AUD: 1, ...data.rates },
      live: true,
      asOf: data.date || null,
    });
  } catch (err) {
    console.error('Exchange rate lookup failed, using fallback rates:', err.message);
    return NextResponse.json({ rates: { AUD: 1, ...FALLBACK_RATES }, live: false, asOf: null });
  }
}
