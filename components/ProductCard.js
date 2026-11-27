import Link from 'next/link';
import Image from 'next/image';
import Price from './Price';

export default function ProductCard({ product, priority = false }) {
  return (
    <Link href={`/product/${product.handle}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-cream-dark rounded-sm">
        <Image
          src={product.image}
          alt={product.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          // Grid pages (shop, shop/[category]) pass priority for the first
          // handful of cards — one of those images IS the page's Largest
          // Contentful Paint element, and without this next/image lazy-loads
          // it by default, which is exactly what was showing up as
          // "Needs Improvement"/"Poor" LCP for /shop in Cloudflare Web
          // Analytics (27 Nov 2026) while product pages — which already set
          // `priority` on their one main image — stayed green.
          priority={priority}
        />
        {product.soldOut && (
          <span className="absolute top-2 left-2 bg-forest-dark text-cream text-[10px] uppercase tracking-widest px-2.5 py-1">
            Sold Out
          </span>
        )}
      </div>
      <div className="mt-3">
        <h3 className="font-serif text-lg text-forest-dark leading-snug">{product.title}</h3>
        <p className="text-sm text-forest/80 mt-0.5">
          <Price amountAud={product.price} />
        </p>
      </div>
    </Link>
  );
}
