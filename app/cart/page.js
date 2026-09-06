'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/cart-context';
import Price from '@/components/Price';
import { formatMoney } from '@/lib/currency';

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal, hydrated } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCheckout() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
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
                <p className="text-sm text-forest/80">Size: {item.size}</p>
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
        <div className="text-right">
          <p className="text-sm text-forest/80">Subtotal</p>
          <p className="font-serif text-2xl text-forest-dark">{formatMoney(subtotal, 'AUD')}</p>
          <p className="text-xs text-forest/80">Shipping & any taxes calculated at checkout.</p>
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
