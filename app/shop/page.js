import { getAllProducts } from '@/lib/catalog';
import ProductCard from '@/components/ProductCard';

export const metadata = {
  // "Melbourne" keeps the local-search edge (see the category page's
  // CATEGORY_SEO comment for why); "Worldwide Shipping" is what's missing
  // for a USA/Canada/UK searcher — without it, the title alone gives them
  // no reason to think this site ships to them at all.
  title: 'Shop Indian & Pakistani Ethnic Wear Melbourne | Worldwide Shipping',
  description:
    'Browse the full collection from our Melbourne-based boutique — lehengas, gharara sets, anarkalis and suits, handcrafted to order and delivered to Australia, the USA, Canada, the UK, New Zealand and Europe.',
  alternates: { canonical: '/shop' },
};
// 5 minutes, not 30 seconds — every regeneration re-reads the catalog from
// the database, and the old 30-second interval across every page was
// enough regeneration traffic on its own to blow through the database's
// free monthly command quota in a single busy day.
export const revalidate = 300;

export default async function ShopPage() {
  const products = await getAllProducts();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
      <h1 className="font-serif text-4xl text-forest-dark mb-2">Shop All</h1>
      <p className="text-forest/80 mb-8">
        {products.length} pieces, handcrafted to order. Browse by category from the Shop menu above.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
        {products.map((p) => (
          <ProductCard key={p.handle} product={p} />
        ))}
      </div>
    </div>
  );
}
