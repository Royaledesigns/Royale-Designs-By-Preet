import Link from 'next/link';

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-serif text-4xl text-forest-dark mb-4">Checkout Cancelled</h1>
      <p className="text-forest/70 leading-relaxed">
        No payment was taken. Your cart is still saved whenever you&apos;re ready to
        continue.
      </p>
      <Link href="/cart" className="inline-block mt-8 bg-gold text-forest-dark px-8 py-3 uppercase text-sm tracking-widest hover:opacity-90">
        Return to Cart
      </Link>
    </div>
  );
}
