import Link from 'next/link';
import Image from 'next/image';
import { categories } from '@/data/products';
import { getAllProducts, storefrontRank } from '@/lib/catalog';
import ProductCard from '@/components/ProductCard';
import InstagramFeed from '@/components/InstagramFeed';
import Testimonials from '@/components/Testimonials';
import siteConfig from '@/components/SiteConfig';

// 5 minutes, not 30 seconds — every regeneration re-reads the catalog from
// the database, and the old 30-second interval across every page was
// enough regeneration traffic on its own to blow through the database's
// free monthly command quota in a single busy day.
export const revalidate = 300;

// Title and description are already inherited from the site-wide default in
// app/layout.js — this just adds the homepage's canonical URL, so search
// engines treat it as the one true version instead of bare-domain/www
// variants getting indexed as separate pages.
export const metadata = {
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const products = await getAllProducts();
  // Curated hero: one dominant lifestyle shot (real bride, real piece) paired
  // with two smaller styled accents (jewellery + jutti), all from the same
  // shoot — a deliberate, editorial trio instead of a wide stitched collage.
  const heroPrimary = '/images/hero-bride-red-lehenga.jpg';
  // Generously-margined crops of the full flat-lay shots (earrings + tikka
  // + necklace; both juttis) — see the accent-panel sizing note below for
  // why these need wider panels rather than a tighter crop.
  const heroAccentTop = '/images/hero-jewellery-accent.jpg';
  const heroAccentBottom = '/images/hero-pink-jutti-accent.jpg';
  // Most-recently uploaded to Instagram first — see storefrontRank in
  // lib/catalog.js. getAllProducts() already returns products in this
  // order, so this re-sort is just a defensive guarantee for this row
  // specifically.
  const featured = [...products].sort((a, b) => storefrontRank(b) - storefrontRank(a)).slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section className="bg-cream-dark/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center lg:items-start">
          {/* Text — aligned to the top of the row (not centered against the
              much-taller image column) so it sits right under the nav
              instead of floating in the middle of a tall gap. */}
          <div className="text-center lg:text-left order-2 lg:order-1 lg:pt-4">
            <p className="uppercase tracking-[0.3em] text-forest/70 text-xs sm:text-sm mb-4">
              {siteConfig.tagline}
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-forest-dark leading-tight">
              Where Heritage Meets Elegance
            </h1>
            <p className="text-forest/80 mt-5 max-w-xl mx-auto lg:mx-0 text-sm sm:text-base leading-relaxed">
              Bridal wear, lehengas, gharara, sharara, anarkalis &amp; suits — thoughtfully
              customised for you, with our home based in Melbourne.
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-block bg-gold text-forest-dark px-8 py-3 uppercase text-sm tracking-widest hover:opacity-90 transition-opacity"
            >
              Shop the Collection
            </Link>
          </div>

          {/* Image composition: one dominant shot + two smaller accents.
              The accent thumbnails are noticeably wider than before (w-40/
              w-52/w-60, up from w-24/w-32/w-40) because a necklace-and-tikka
              set and a pair of juttis are naturally wide, roughly-square
              subjects — the old narrow vertical strip could never show one
              whole without slicing through it. Matching the panel's shape to
              the subject's shape is what actually fixes that, not another
              crop tweak. */}
          <div className="relative order-1 lg:order-2 h-[440px] sm:h-[560px] lg:h-[640px]">
            <div className="absolute inset-y-0 left-0 right-44 sm:right-56 lg:right-64 rounded-sm overflow-hidden shadow-lg">
              <Image
                src={heroPrimary}
                alt="A Royale Designs by Preet bride wearing a hand-embroidered red bridal lehenga"
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 80vw"
                className="object-cover object-top"
              />
            </div>
            <div className="absolute top-0 right-0 w-40 sm:w-52 lg:w-60 h-[47%] rounded-sm overflow-hidden shadow-lg ring-4 ring-cream-dark/60">
              <Image
                src={heroAccentTop}
                alt="Gold kundan bridal necklace and pendant set"
                fill
                sizes="(min-width: 1024px) 15vw, 35vw"
                className="object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-40 sm:w-52 lg:w-60 h-[47%] rounded-sm overflow-hidden shadow-lg ring-4 ring-cream-dark/60">
              <Image
                src={heroAccentBottom}
                alt="Hand-embroidered pink bridal juttis with gold thread work"
                fill
                sizes="(min-width: 1024px) 15vw, 35vw"
                className="object-cover"
              />
            </div>
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
          {/* flex-col on mobile, side-by-side from sm up — without this, the
              heading and "View all" link were forced into one row on every
              screen size, squeezing the heading into a narrow strip on
              phones and wrapping it onto multiple lines. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-8">
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

      {/* Customer testimonials — curated from real Google reviews */}
      <Testimonials />

      {/* Brand story + shipping */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="font-serif text-3xl text-forest-dark mb-4">Thoughtfully Customised, Based in Melbourne</h2>
        <p className="text-forest/80 max-w-2xl mx-auto leading-relaxed">
          Every piece is thoughtfully customised for you, with our home based in
          {' '}{siteConfig.location}. We currently deliver to {siteConfig.shipsTo.join(', ')}.
          Prices are shown in AUD by default — use the currency switcher in the header to
          preview an estimate in your own currency.
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
