'use client';

import { useCurrency } from '@/lib/currency-context';
import { convert, formatMoney } from '@/lib/currency';

// Displays a AUD product price converted into the shopper's chosen display
// currency, with a small note that checkout always runs in AUD.
export default function Price({ amountAud, showEstimateNote = false, className = '' }) {
  const { currency, rates } = useCurrency();
  const converted = convert(amountAud, currency, rates);

  return (
    <span className={className}>
      {formatMoney(converted, currency)}
      {currency !== 'AUD' && showEstimateNote && (
        <span className="block text-[11px] text-forest/50 font-sans normal-case">
          est. — charged as {formatMoney(amountAud, 'AUD')}
        </span>
      )}
    </span>
  );
}
