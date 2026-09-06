import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategory, getProduct, getProductsByCategory, products } from '@/data/products';
import Price from '@/components/Price';
import ProductCard from '@/components/ProductCard';
import AddToCartForm from '@/components/AddToCartForm';

export function generateStaticParams() {
  return products.map((p) => ({ handle: p.handle }));
}

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const product = getProduct(handle);
  return { title: product ? `${product.title} | Royale Designs by Preet` : 'Product' };
}

export default async function ProductPage({ params }) {
  const { handle } = await params;
  const product = getProduct(handle);
  if (!product) notFound();
  const category = getCategory(product.category);
  const related = getProductsByCategory(product.category).filter((p) => p.handle !== product.handle).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-xs text-forest/80 mb-6">
        <Link href="/shop" className="hover:text-gold">Shop</Link>
        {' / '}
        <Link href={`/shop/${product.category}`} className="hover:text-gold">{category?.label}</Link>
        {' / '}
        <span className="text-forest-dark">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="relative aspect-[3/4] rounded-sm overflow-hidden bg-cream-dark">
          <Image
            src={product.image}
            alt={product.title}
            fill
            priority
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
        </div>

        <div>
          <p className="uppercase text-xs tracking-widest text-gold-dark mb-2">{category?.label}</p>
          <h1 className="font-serif text-4xl text-forest-dark leading-tight">{product.title}</h1>
          <p className="mt-3 text-2xl">
            <Price amountAud={product.price} showEstimateNote />
          </p>

          <p className="mt-6 text-forest/80 leading-relaxed">{product.description}</p>

          <div className="flex flex-wrap gap-2 mt-4">
            {product.tags.map((tag) => (
              <span key={tag} className="text-[11px] uppercase tracking-wide border border-forest/20 rounded-full px-3 py-1 text-forest/80">
                {tag}
              </span>
            ))}
          </div>

          <AddToCartForm product={product} />

          <div className="mt-8 border-t border-forest/10 pt-6 text-sm text-forest/80 space-y-1">
            <p>✓ Made to order — please allow processing time before dispatch.</p>
            <p>✓ Thoughtfully customised for you and delivered to Australia, the USA, Canada, the UK, New Zealand and Europe.</p>
            <p>✓ All sales are final — please review sizing &amp; colour details carefully.</p>
            <p>
              ✓ See our <Link href="/shipping-returns" className="underline hover:text-gold">shipping & returns policy</Link> for details.
            </p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-serif text-2xl text-forest-dark mb-6">You may also like</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {related.map((p) => (
              <ProductCard key={p.handle} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
