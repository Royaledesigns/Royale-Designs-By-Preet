'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart-context';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'Custom (contact us for measurements)'];

export default function AddToCartForm({ product }) {
  const [size, setSize] = useState(SIZES[2]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  const handleAdd = () => {
    addItem(product, size, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addItem(product, size, qty);
    router.push('/cart');
  };

  return (
    <div className="mt-6 space-y-5">
      <div>
        <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">Size</label>
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gold"
        >
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">Quantity</label>
        <div className="flex items-center border border-forest/20 rounded-sm w-fit">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-9 h-9 flex items-center justify-center hover:bg-cream-dark"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="w-9 h-9 flex items-center justify-center hover:bg-cream-dark"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={handleAdd}
          className="flex-1 border border-forest text-forest-dark py-3 uppercase text-sm tracking-widest hover:bg-forest hover:text-cream transition-colors"
        >
          {added ? 'Added ✓' : 'Add to Cart'}
        </button>
        <button
          onClick={handleBuyNow}
          className="flex-1 bg-gold text-forest-dark py-3 uppercase text-sm tracking-widest hover:opacity-90 transition-opacity"
        >
          Buy Now
        </button>
      </div>

      {product.customStitch !== false && (
        <p className="text-xs text-forest/80 pt-1">
          Need a size outside our standard range, or a colour tweak? Choose &ldquo;Custom&rdquo; and
          tell us your measurements at checkout, or reach out on the{' '}
          <a href="/custom-tailoring" className="underline hover:text-gold">
            Custom Made For You
          </a>{' '}
          page first.
        </p>
      )}
    </div>
  );
}
