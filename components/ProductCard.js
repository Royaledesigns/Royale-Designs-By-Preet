import Link from 'next/link';
import Image from 'next/image';
import Price from './Price';

export default function ProductCard({ product }) {
  return (
    <Link href={`/product/${product.handle}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-cream-dark rounded-sm">
        <Image
          src={product.image}
          alt={product.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
            product.soldOut ? 'grayscale opacity-70' : ''
          }`}
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
