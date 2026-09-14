'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/cart-context';
import { useCurrency } from '@/lib/currency-context';
import Price from '@/components/Price';
import { convert, formatMoney } from '@/lib/currency';

// Mirrors SHIPPING_REGIONS' `amount` (in cents) in app/api/checkout/route.js
// — kept in sync there since that's what actually gets charged. This copy
// is only used to show the shopper a running total on this page before they
// reach Stripe.
const SHIPPING_COST_AUD = { AU: 20, NZ: 30, INTL: 60, PICKUP: 0 };

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal, hydrated } = useCart();
  const { currency, rates } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shippingRegion, setShippingRegion] = useState('');
  const orderTotalAud = subtotal + (shippingRegion ? SHIPPING_COST_AUD[shippingRegion] : 0);

  async function handleCheckout() {
    if (!shippingRegion) {
      setError('Please select a shipping or pickup option.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, shippingRegion, displayCurrency: currency }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not start checkout.');
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (!hydrated) return null;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-serif text-3xl text-forest-dark mb-4">Your cart is empty</h1>
        <p className="text-forest/80 mb-8">Explore the collection and find your next favourite piece.</p>
        <Link href="/shop" className="inline-block bg-gold text-forest-dark px-8 py-3 uppercase text-sm tracking-widest hover:opacity-90">
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14">
      <h1 className="font-serif text-4xl text-forest-dark mb-10">Your Cart</h1>

      <div className="space-y-6">
        {items.map((item) => (
          <div key={item.key} className="flex gap-4 border-b border-forest/10 pb-6">
            <div className="relative w-24 h-32 flex-shrink-0 rounded-sm overflow-hidden bg-cream-dark">
              <Image src={item.image} alt={item.title} fill sizes="96px" className="object-cover" />
            </div>
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Link href={`/product/${item.handle}`} className="font-serif text-lg text-forest-dark hover:text-gold">
                  {item.title}
                </Link>
                {item.size !== 'One Size' && <p className="text-sm text-forest/80">Size: {item.size}</p>}
                <p className="text-sm text-forest/80 mt-1">
                  <Price amountAud={item.price} />
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-forest/20 rounded-sm w-fit">
                  <button
                    onClick={() => updateQty(item.key, item.qty - 1)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-cream-dark"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.key, item.qty + 1)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-cream-dark"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.key)}
                  className="text-xs uppercase tracking-wide text-forest/80 hover:text-red-500"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-end gap-4">
        <div className="w-full sm:w-72 text-right space-y-1.5">
          <div className="flex items-baseline justify-between text-sm text-forest/80">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal, 'AUD')}</span>
          </div>
          {shippingRegion && (
            <div className="flex items-baseline justify-between text-sm text-forest/80">
              <span>{shippingRegion === 'PICKUP' ? 'Pickup' : 'Shipping'}</span>
              <span>{shippingRegion === 'PICKUP' ? 'Free' : formatMoney(SHIPPING_COST_AUD[shippingRegion], 'AUD')}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between font-serif text-2xl text-forest-dark pt-1.5 border-t border-forest/10">
            <span className="text-sm font-sans uppercase tracking-wide text-forest/80">Total</span>
            <span>{formatMoney(orderTotalAud, 'AUD')}</span>
          </div>
          {currency !== 'AUD' && (
            <p className="text-xs text-forest/80">
              est. {formatMoney(convert(orderTotalAud, currency, rates), currency)} in {currency}
              {!shippingRegion && ' (excl. shipping)'} — you're charged in AUD
            </p>
          )}
          <p className="text-xs text-forest/80">Taxes, if any, calculated at checkout.</p>
        </div>

        <div className="w-full sm:w-72 text-right">
          <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">
            Shipping or pickup
          </label>
          <select
            value={shippingRegion}
            onChange={(e) => setShippingRegion(e.target.value)}
            className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-gold"
          >
            <option value="">Select shipping or pickup…</option>
            <option value="PICKUP">Local Pickup — Tarneit, VIC (Free)</option>
            <option value="AU">Australia — $20 shipping</option>
            <option value="NZ">New Zealand — $30 shipping</option>
            <option value="INTL">USA, Canada, UK or Europe — $60 shipping</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="bg-forest text-cream px-10 py-3.5 uppercase text-sm tracking-widest hover:bg-forest-dark transition-colors disabled:opacity-60"
        >
          {loading ? 'Redirecting to checkout…' : 'Proceed to Checkout'}
        </button>
      </div>
    </div>
  );
}
