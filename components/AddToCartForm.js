'use client';

import { useState } from 'react';
import { getSizesForCategory, isUnsizedCategory, getSizeStock } from '@/data/products';
import { formatMoney } from '@/lib/currency-shared';
import siteConfig from './SiteConfig';

const CUSTOM_SIZE = 'Custom (contact us for measurements)';
const ONE_SIZE = 'One Size';

// WhatsApp's wa.me deep link accepts a prefilled "text" query param when
// addressed by phone number (unlike the wa.me/message/<code> short link
// used elsewhere, which carries its own fixed template) — so orders built
// here go straight to the business number with the product, size and price
// already filled in, ready for the shopper to just hit send.
function whatsappNumber() {
  return siteConfig.phone.replace(/[^0-9]/g, '');
}

function buildWhatsAppLink(message) {
  return `https://wa.me/${whatsappNumber()}?text=${encodeURIComponent(message)}`;
}

function buildOrderMessage(product, size, qty, isUnsized) {
  const sizeLine = isUnsized || size === CUSTOM_SIZE ? '' : ` — Size: ${size}`;
  const qtyLine = qty > 1 ? ` x${qty}` : '';
  const total = formatMoney(product.price * qty, 'AUD');
  const customNote = size === CUSTOM_SIZE ? ' (custom stitched to my measurements)' : '';
  return `Hi! I'd like to order: ${product.title}${sizeLine}${customNote}${qtyLine} — ${total}. Is it available?`;
}

export default function AddToCartForm({ product }) {
  // Clothing sizes (XS–XL) everywhere except Heels & Punjabi Jutti (EU shoe
  // sizes) and Kids Wear (age-based sizes). Jewellery and Dupattas aren't
  // sized at all.
  const isFootwear = product.category === 'heels-punjabi-jutti';
  const isUnsized = isUnsizedCategory(product.category);
  const sizeOptions = getSizesForCategory(product.category);

  // { size: quantity } — legacy products (seeded before per-size stock
  // existed) show every size as available with no count; new ones default
  // to none until the admin enters the sizes actually ready-made and how
  // many.
  const sizeStock = getSizeStock(product.availableSizes, sizeOptions);
  const availableSizes = Object.keys(sizeStock).filter((s) => (sizeStock[s] || 0) > 0);
  // Shoes are made in fixed EU sizes only, and unsized categories don't
  // have a "Custom" fallback option either.
  const customStitchAvailable = !isFootwear && !isUnsized && product.customStitch !== false;
  const defaultSize = isUnsized
    ? ONE_SIZE
    : availableSizes[0] || (customStitchAvailable ? CUSTOM_SIZE : sizeOptions[0]);

  const [size, setSize] = useState(defaultSize);
  const [qty, setQty] = useState(1);

  // Custom orders and jewellery/dupattas (one size) aren't stock-limited —
  // only a specific ready-made size is. Caps the quantity stepper so
  // nobody can add more than what's actually sitting ready to ship.
  const maxQty = isUnsized || size === CUSTOM_SIZE ? Infinity : sizeStock[size] ?? Infinity;

  function handleSizeChange(nextSize) {
    setSize(nextSize);
    const nextMax = nextSize === CUSTOM_SIZE ? Infinity : sizeStock[nextSize] ?? Infinity;
    setQty((q) => Math.min(q, Number.isFinite(nextMax) ? Math.max(nextMax, 1) : q));
  }

  const orderLink = buildWhatsAppLink(buildOrderMessage(product, size, qty, isUnsized));

  if (product.soldOut) {
    const reachOutLink = buildWhatsAppLink(
      `Hi! I'm interested in: ${product.title}. Is it still available, or could something similar be made?`
    );
    return (
      <div className="mt-6 space-y-4">
        <p className="inline-block bg-forest-dark text-cream text-xs uppercase tracking-widest px-3 py-1.5">
          Sold Out
        </p>
        <p className="text-sm text-forest/80">
          This piece has found its home and is no longer available.
          {isUnsized
            ? ' Love the look? Reach out and we may have something similar.'
            : ' Love the look? We may be able to recreate something similar as a custom stitch.'}
        </p>
        <a
          href={reachOutLink}
          target="_blank"
          rel="noreferrer"
          className="inline-block bg-gold text-forest-dark px-6 py-3 uppercase text-sm tracking-widest hover:opacity-90 transition-opacity"
        >
          Reach Out on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      {!isUnsized && (
        <div>
          <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">Size</label>
          <select
            value={size}
            onChange={(e) => handleSizeChange(e.target.value)}
            className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gold"
          >
            {sizeOptions.map((s) => {
              const stock = sizeStock[s] || 0;
              const isAvailable = stock > 0;
              const lowStock = isAvailable && Number.isFinite(stock) && stock <= 3;
              return (
                <option key={s} value={s} disabled={!isAvailable}>
                  {s}
                  {!isAvailable ? ' — order as custom' : lowStock ? ` — only ${stock} left` : ''}
                </option>
              );
            })}
            {!isFootwear && (
              <option value={CUSTOM_SIZE} disabled={!customStitchAvailable}>
                {CUSTOM_SIZE}
                {!customStitchAvailable ? ' — unavailable' : ''}
              </option>
            )}
          </select>
        </div>
      )}

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
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={qty >= maxQty}
            className="w-9 h-9 flex items-center justify-center hover:bg-cream-dark disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        {Number.isFinite(maxQty) && (
          <p className="text-[11px] text-forest/60 mt-1">Only {maxQty} left ready-made in this size.</p>
        )}
      </div>

      <div className="pt-2">
        <a
          href={orderLink}
          target="_blank"
          rel="noreferrer"
          className="block w-full text-center bg-gold text-forest-dark py-3 uppercase text-sm tracking-widest hover:opacity-90 transition-opacity"
        >
          Order on WhatsApp
        </a>
      </div>

      {customStitchAvailable && (
        <p className="text-xs text-forest/80 pt-1">
          Need a size outside our standard range, or a colour tweak? Choose &ldquo;Custom&rdquo; above, then
          tap Order on WhatsApp and share your measurements with us there — or visit the{' '}
          <a href="/custom-tailoring" className="font-semibold text-gold-dark underline hover:text-forest-dark">
            Custom Made For You
          </a>{' '}
          page first.
        </p>
      )}
    </div>
  );
}
