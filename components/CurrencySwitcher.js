'use client';

import { useCurrency } from '@/lib/currency-context';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';

export default function CurrencySwitcher({ className = '' }) {
  const { currency, setCurrency } = useCurrency();
  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      className={`text-xs uppercase tracking-wide bg-transparent border border-forest/20 rounded-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gold ${className}`}
      aria-label="Display currency"
    >
      {SUPPORTED_CURRENCIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
