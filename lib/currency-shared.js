// Pure currency helpers — no React, no browser APIs — so this one file is
// safe to import from both client components (via lib/currency.js) and
// server-side route handlers (checkout, exchange-rates) without dragging
// React hooks into a Node.js request handler.

// INR is display-only, same as every other non-AUD currency here — it lets
// shoppers browsing from India (currently the single biggest source of
// visitors — see Vercel Analytics) see an estimated price in their own
// currency. It does NOT mean the site ships to India yet (see
// app/api/checkout/route.js's SHIPPING_REGIONS) — that's a separate,
// still-open decision.
export const SUPPORTED_CURRENCIES = ['AUD', 'USD', 'GBP', 'CAD', 'EUR', 'NZD', 'INR'];

const SYMBOLS = {
  AUD: 'A$',
  USD: 'US$',
  GBP: '£',
  CAD: 'C$',
  EUR: '€',
  NZD: 'NZ$',
  INR: '₹',
};

// Approximate fallback rates (AUD base) used if the live rate lookup fails.
// These are only ever shown as an estimate — the real charge always happens
// in AUD through Stripe at checkout. INR ballpark as of Nov 2026 — ~62 INR
// per AUD; the live rate (see lib/exchange-rates-server.js) is what actually
// shows up almost all the time.
export const FALLBACK_RATES = {
  AUD: 1,
  USD: 0.66,
  GBP: 0.52,
  CAD: 0.91,
  EUR: 0.61,
  NZD: 1.09,
  INR: 61.8,
};

export function formatMoney(amount, currency) {
  const symbol = SYMBOLS[currency] || '';
  return `${symbol}${amount.toFixed(2)}`;
}

export function convert(amountAud, currency, rates) {
  const rate = rates?.[currency] ?? FALLBACK_RATES[currency] ?? 1;
  return amountAud * rate;
}
