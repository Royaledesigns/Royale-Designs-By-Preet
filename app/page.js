import Link from 'next/link';
import Image from 'next/image';
import { categories, products } from '@/data/products';
import ProductCard from '@/components/ProductCard';
import InstagramFeed from '@/components/InstagramFeed';
import siteConfig from '@/components/SiteConfig';

const heroImage = products[0].image;

export default function HomePage() {
  const featured = products.slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section className="relative">
        <div className="relative h-[70vh] min-h-[420px] w-full">
          <Image
            src={heroImage}
            alt="Royale Designs by Preet featured piece"
            fill
            priority
            className="object-cover object-top"
          />
          <div className="absolute inset-0 bg-forest-dark/40" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <p className="uppercase tracking-[0.3em] text-cream/80 text-xs sm:text-sm mb-4">
              {siteConfig.tagline}
            </p>
            <h1 className="font-serif text-4xl sm:text-6xl text-cream max-w-3xl leading-tight">
              Where Heritage Meets Elegance
            </h1>
            <p className="text-cream/80 mt-4 max-w-xl text-sm sm:text-base">
              Lehengas, gharara sets, sharara sets, anarkalis & suits — designed in
              Melbourne, shipped worldwide.
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-block bg-gold text-forest-dark px-8 py-3 uppercase text-sm tracking-widest hover:opacity-90 transition-opacity"
            >
              Shop the Collection
            </Link>
          </div>
        </div>
      </section>

      {/* Category tiles */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-serif text-3xl text-center text-forest-dark mb-10">Shop by Category</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {categories.map((c) => {
            const sample = products.find((p) => p.category === c.slug);
            return (
              <Link key={c.slug} href={`/shop/${c.slug}`} className="group block">
                <div className="relative aspect-square overflow-hidden rounded-sm bg-cream-dark">
                  {sample && (
                    <Image
                      src={sample.image}
                      alt={c.label}
                      fill
                      sizes="20vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-forest-dark/20 group-hover:bg-forest-dark/10 transition-colors" />
                </div>
                <p className="mt-2 text-center font-serif text-lg text-forest-dark">{c.label}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured products */}
      <section className="bg-cream-dark/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <h2 className="font-serif text-3xl text-forest-dark">New & Noteworthy</h2>
            <Link href="/shop" className="text-sm uppercase tracking-wider text-forest hover:text-gold">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {featured.map((p) => (
              <ProductCard key={p.handle} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Live Instagram feed — hides itself until INSTAGRAM_ACCESS_TOKEN is set */}
      <InstagramFeed />

      {/* Brand story + shipping */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="font-serif text-3xl text-forest-dark mb-4">Worldwide Shipping, Melbourne Made</h2>
        <p className="text-forest/70 max-w-2xl mx-auto leading-relaxed">
          Every piece is designed and finished in {siteConfig.location}, and we ship
          internationally to {siteConfig.shipsTo.slice(1).join(', ')}. Prices are shown
          in AUD by default — use the currency switcher in the header to preview an
          estimate in your own currency.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {siteConfig.shipsTo.map((country) => (
            <span
              key={country}
              className="px-4 py-1.5 border border-forest/20 rounded-full text-xs uppercase tracking-wide text-forest-dark"
            >
              {country}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
