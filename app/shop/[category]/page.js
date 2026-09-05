import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categories, getCategory, getProductsByCategory } from '@/data/products';
import ProductCard from '@/components/ProductCard';

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }) {
  const { category: categorySlug } = await params;
  const category = getCategory(categorySlug);
  return { title: category ? `${category.label} | Royale Designs by Preet` : 'Shop' };
}

export default async function CategoryPage({ params }) {
  const { category: categorySlug } = await params;
  const category = getCategory(categorySlug);
  if (!category) notFound();
  const items = getProductsByCategory(categorySlug);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
      <h1 className="font-serif text-4xl text-forest-dark mb-2">{category.label}</h1>
      <p className="text-forest/60 mb-8">{items.length} piece{items.length === 1 ? '' : 's'}</p>

      <div className="flex flex-wrap gap-2 mb-10">
        <Link
          href="/shop"
          className="px-4 py-1.5 rounded-full text-xs uppercase tracking-wide border border-forest/20 text-forest-dark hover:bg-forest hover:text-cream transition-colors"
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/shop/${c.slug}`}
            className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-wide transition-colors ${
              c.slug === category.slug
                ? 'bg-forest text-cream'
                : 'border border-forest/20 text-forest-dark hover:bg-forest hover:text-cream'
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-forest/60">No pieces in this category yet — check back soon.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          {items.map((p) => (
            <ProductCard key={p.handle} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
