// Pure currency helpers — no React, no browser APIs — so this one file is
// safe to import from both client components (via lib/currency.js) and
// server-side route handlers (checkout, exchange-rates) without dragging
// React hooks into a Node.js request handler.

export const SUPPORTED_CURRENCIES = ['AUD', 'USD', 'GBP', 'CAD', 'EUR', 'NZD'];

const SYMBOLS = {
  AUD: 'A$',
  USD: 'US$',
  GBP: '£',
  CAD: 'C$',
  EUR: '€',
  NZD: 'NZ$',
};

// Approximate fallback rates (AUD base) used if the live rate lookup fails.
// These are only ever shown as an estimate — the real charge always happens
// in AUD through Stripe at checkout.
export const FALLBACK_RATES = {
  AUD: 1,
  USD: 0.66,
  GBP: 0.52,
  CAD: 0.91,
  EUR: 0.61,
  NZD: 1.09,
};

export function formatMoney(amount, currency) {
  const symbol = SYMBOLS[currency] || '';
  return `${symbol}${amount.toFixed(2)}`;
}

export function convert(amountAud, currency, rates) {
  const rate = rates?.[currency] ?? FALLBACK_RATES[currency] ?? 1;
  return amountAud * rate;
}
