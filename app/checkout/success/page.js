'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart-context';

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-forest text-cream flex items-center justify-center mx-auto mb-6 text-2xl">
        ✓
      </div>
      <h1 className="font-serif text-4xl text-forest-dark mb-4">Thank you for your order!</h1>
      <p className="text-forest/80 leading-relaxed">
        Your payment was successful and a confirmation has been sent to your email.
        Every piece is made to order, so please allow processing time before dispatch —
        we&apos;ll be in touch with tracking details once your order ships.
      </p>
      <Link href="/shop" className="inline-block mt-8 bg-gold text-forest-dark px-8 py-3 uppercase text-sm tracking-widest hover:opacity-90">
        Continue Shopping
      </Link>
    </div>
  );
}
