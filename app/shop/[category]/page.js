import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categories } from '@/data/products';
import { getCategory, getProductsByCategory } from '@/lib/catalog';
import ProductCard from '@/components/ProductCard';
import siteConfig from '@/components/SiteConfig';

// 5 minutes, not 30 seconds — every regeneration re-reads the catalog from
// the database, and the old 30-second interval across every page was
// enough regeneration traffic on its own to blow through the database's
// free monthly command quota in a single busy day.
export const revalidate = 300;

// Melbourne-qualified title/description per category, aimed at local search
// intent ("lehenga shop melbourne", "punjabi suits online australia", etc) —
// competitor research showed India-wide catalogs own the generic keyword,
// but none of them can claim a real Melbourne presence, which is our edge.
// A category not listed here (a newly added one before this is updated)
// falls back to the original generic copy below.
//
// Every title also ends in "| Worldwide Shipping": the Melbourne part is
// deliberately kept (it's still the edge against India-wide catalogs for
// local/Australian search intent), but on its own it reads as a
// Melbourne-only shop to a USA/Canada/UK searcher — this one phrase is
// what tells them, right in the title, that they can order too.
const CATEGORY_SEO = {
  'bridal-wear-outfits': {
    title: 'Bridal Wear Melbourne | Worldwide Shipping',
    description:
      'Indian & Pakistani bridal wear from our Melbourne boutique — lehengas, ghararas and sharara sets for engagements, sangeets and wedding day, custom stitched to your measurements and delivered worldwide.',
  },
  lehengas: {
    title: 'Lehengas Melbourne | Worldwide Shipping',
    description:
      'Bridal and party lehengas from our Melbourne-based boutique — embellished, embroidered styles custom stitched to your measurements and delivered to Australia, the USA, Canada, the UK, New Zealand and Europe.',
  },
  'gharara-sets': {
    title: 'Gharara Suits Melbourne | Worldwide Shipping',
    description:
      'Shop gharara suits online from Royale Designs by Preet in Melbourne — richly embellished sets custom tailored for weddings, sangeets and festive occasions, delivered to Australia, the USA, Canada, the UK, New Zealand and Europe.',
  },
  'sharara-sets': {
    title: 'Sharara Suits Melbourne | Worldwide Shipping',
    description:
      'Sharara sets from our Melbourne boutique — flowing, embellished silhouettes custom stitched to your measurements for weddings and festive wear, delivered to Australia, the USA, Canada, the UK, New Zealand and Europe.',
  },
  anarkalis: {
    title: 'Anarkali Suits Melbourne | Worldwide Shipping',
    description:
      'Shop Anarkali suits online from our Melbourne-based boutique — elegant floor-length silhouettes custom stitched to your measurements for weddings, parties and festive occasions, delivered to Australia, the USA, Canada, the UK, New Zealand and Europe.',
  },
  suits: {
    title: 'Punjabi Partywear Suits Melbourne | Worldwide Shipping',
    description:
      'Punjabi partywear suits online from our Melbourne boutique — custom stitched to your measurements and delivered to Australia, the USA, Canada, the UK, New Zealand and Europe.',
  },
  'casual-wear-suits': {
    title: 'Casual Wear Suits Melbourne | Worldwide Shipping',
    description:
      'Everyday Indian suits from our Melbourne-based boutique — comfortable, custom-stitched casual wear delivered to Australia, the USA, Canada, the UK, New Zealand and Europe.',
  },
  'pakistani-mirror-dupattas': {
    title: 'Pakistani Mirror Dupattas Melbourne | Worldwide Shipping',
    description:
      'Shop Pakistani mirror-work dupattas online from our Melbourne boutique — statement pieces to complete any outfit, delivered to Australia, the USA, Canada, the UK, New Zealand and Europe.',
  },
  'heels-punjabi-jutti': {
    title: 'Punjabi Jutti & Heels Melbourne | Worldwide Shipping',
    description:
      'Punjabi jutti and heels online from our Melbourne-based boutique — the finishing touch for any bridal or festive outfit, delivered to Australia, the USA, Canada, the UK, New Zealand and Europe.',
  },
  'kids-wear': {
    title: 'Kids Indian Wear Melbourne | Worldwide Shipping',
    description:
      'Kids ethnic wear online from our Melbourne boutique — festive and wedding outfits for the little ones, delivered to Australia, the USA, Canada, the UK, New Zealand and Europe.',
  },
  jewellery: {
    title: 'Indian Jewellery Melbourne | Worldwide Shipping',
    description:
      'Bridal and party jewellery sets online from our Melbourne-based boutique — the finishing touch for any ethnic outfit, delivered to Australia, the USA, Canada, the UK, New Zealand and Europe.',
  },
};

export async function generateMetadata({ params }) {
  const { category: categorySlug } = await params;
  const category = getCategory(categorySlug);
  if (!category) return { title: 'Shop' };
  const seo = CATEGORY_SEO[categorySlug];
  return {
    title: seo?.title || category.label,
    description:
      seo?.description ||
      `Shop ${category.label.toLowerCase()} — premium South Asian bridal & ethnic wear, thoughtfully customised for you and delivered worldwide.`,
    alternates: { canonical: `/shop/${categorySlug}` },
  };
}

// Short on-page intro under each category heading — gives Google and
// shoppers the same local, plain-language context the page title carries.
const CATEGORY_INTRO = {
  'bridal-wear-outfits':
    'Bridal lehengas, ghararas and sharara sets for engagements, sangeets and your wedding day',
  lehengas: 'Embellished bridal and party lehengas',
  'gharara-sets': 'Richly embellished gharara suits for weddings, sangeets and festive occasions',
  'sharara-sets': 'Flowing sharara sets for weddings and festive wear',
  anarkalis: 'Elegant floor-length Anarkali suits for weddings, parties and festive occasions',
  suits: 'Punjabi partywear suits for weddings and celebrations',
  'casual-wear-suits': 'Comfortable everyday Indian and Pakistani suits',
  'pakistani-mirror-dupattas': 'Pakistani mirror-work dupattas to complete any outfit',
  'heels-punjabi-jutti': 'Punjabi jutti and heels, the finishing touch for any bridal or festive outfit',
  'kids-wear': 'Festive and wedding outfits for the little ones',
  jewellery: 'Bridal and party jewellery sets to finish any ethnic outfit',
};

export default async function CategoryPage({ params }) {
  const { category: categorySlug } = await params;
  const category = getCategory(categorySlug);
  if (!category) notFound();
  const items = await getProductsByCategory(categorySlug);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
      <h1 className="font-serif text-4xl text-forest-dark mb-2">{category.label}</h1>
      <p className="text-forest/80 mb-3">{items.length} piece{items.length === 1 ? '' : 's'}</p>
      <p className="text-forest/80 max-w-3xl mb-8 leading-relaxed">
        {CATEGORY_INTRO[categorySlug] || `Shop ${category.label.toLowerCase()}`} from Royale Designs by
        Preet, an Indian and Pakistani clothing boutique in Tarneit, Melbourne. Every piece is
        thoughtfully customised for you and delivered to {siteConfig.shipsTo.join(', ')}.
      </p>

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
        <p className="text-forest/80">No pieces in this category yet — check back soon.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          {items.map((p, i) => (
            // See app/shop/page.js — same LCP fix, same reasoning.
            <ProductCard key={p.handle} product={p} priority={i < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
