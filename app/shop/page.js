import Link from 'next/link';
import { categories, products } from '@/data/products';
import ProductCard from '@/components/ProductCard';

export const metadata = { title: 'Shop All | Royale Designs by Preet' };

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
      <h1 className="font-serif text-4xl text-forest-dark mb-2">Shop All</h1>
      <p className="text-forest/60 mb-8">{products.length} pieces, handcrafted to order.</p>

      <div className="flex flex-wrap gap-2 mb-10">
        <span className="px-4 py-1.5 rounded-full text-xs uppercase tracking-wide bg-forest text-cream">
          All
        </span>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/shop/${c.slug}`}
            className="px-4 py-1.5 rounded-full text-xs uppercase tracking-wide border border-forest/20 text-forest-dark hover:bg-forest hover:text-cream transition-colors"
          >
            {c.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
        {products.map((p) => (
          <ProductCard key={p.handle} product={p} />
        ))}
      </div>
    </div>
  );
}
