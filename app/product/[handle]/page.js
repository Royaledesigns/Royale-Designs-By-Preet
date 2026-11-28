import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategory, getProduct, getProductsByCategory } from '@/lib/catalog';
import Price from '@/components/Price';
import ProductCard from '@/components/ProductCard';
import ProductGallery from '@/components/ProductGallery';
import AddToCartForm from '@/components/AddToCartForm';
import siteConfig from '@/components/SiteConfig';
import { buildShippingDetails, shippingCountries } from '@/lib/shipping';
import { createHash } from 'crypto';

// Same canonical domain as app/layout.js — used below for the Product
// structured data's absolute URL.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.royaledesigns.com.au';

// Products can be added at any time from the admin dashboard (including
// ones pulled in from Instagram), so this page is rendered on demand rather
// than pre-built at deploy time — revalidate keeps it cached briefly for
// speed without needing a redeploy for new products to appear. 5 minutes
// (not 30 seconds) because every regeneration re-reads the catalog from the
// database — the 30-second interval across every product/category/shop
// page was enough regeneration traffic on its own to blow through the
// database's free monthly command quota in a single busy day.
export const revalidate = 300;

// Search-result snippets get cut off around 155-160 characters, so a
// meta description longer than that just gets truncated by Google anyway —
// this trims it ourselves, on a clean word boundary, instead.
function truncate(text, max) {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

// Products pulled in from Instagram carry their original caption as
// `description` — including the standing "only order through our official
// account" trust notice. That notice is useful on the page itself, but
// because it's long and sits right at the start of the caption, it eats the
// entire ~155-character budget search engines show before any real
// description of the piece ever appears. This strips that notice (and
// anything after it) back out for search/share snippets only — the full
// caption, notice included, still shows on the product page itself.
function stripOrderingNotice(text) {
  if (!text) return '';
  const cut = text.search(/dear\s+customers?\b/i);
  const trimmed = cut === -1 ? text : text.slice(0, cut);
  // Drop a dangling emoji/punctuation left right at the cut point.
  return trimmed.replace(/[^\p{L}\p{N}]+$/u, '').trim();
}

// Google Merchant Center's `id`/`sku` field (schema.org Product.sku) is
// capped at 50 characters — see
// https://support.google.com/merchants/answer/6324405 — but a handle can
// run up to ~82 (slugify() in lib/catalog.js caps the title slug at 80,
// plus a "-2"/"-3" suffix for rare title collisions), which is what was
// tripping Search Console's "Invalid string length in field 'sku'" warning.
// Most handles are well under 50 and pass through unchanged; a long one is
// cut down to fit with a short hash of the FULL handle appended, so two
// different long handles that happen to share their first ~40 characters
// still end up with different (and always the same, build to build) skus
// instead of silently colliding once truncated.
function buildSku(handle) {
  if (handle.length <= 50) return handle;
  const hash = createHash('md5').update(handle).digest('hex').slice(0, 8);
  return `${handle.slice(0, 50 - hash.length - 1)}-${hash}`;
}

function buildSeoDescription(product) {
  const brandLine = `premium South Asian bridal & ethnic wear from ${siteConfig.name}, thoughtfully customised for you.`;
  const cleaned = stripOrderingNotice(product.description);
  // A caption that's just the colour/piece name before the notice kicks in
  // ("Pastel Pink Gharara") is too thin to stand alone as a search snippet —
  // pair it with the usual brand line instead of showing it bare.
  const combined = cleaned && cleaned.length < 100 ? `${cleaned} — ${brandLine}` : cleaned;
  return truncate(combined, 155) || `${product.title} — ${brandLine}`;
}

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return { title: 'Product' };

  const description = buildSeoDescription(product);

  return {
    title: product.title,
    description,
    alternates: { canonical: `/product/${product.handle}` },
    // Overrides the site-wide default share image (see app/layout.js) with
    // this specific product's photo, so sharing a product link on
    // Instagram/WhatsApp/iMessage shows the actual piece, not the homepage
    // hero.
    openGraph: {
      title: product.title,
      description,
      images: [product.image, ...(product.extraImages || [])].map((url) => ({ url, alt: product.title })),
    },
  };
}

export default async function ProductPage({ params }) {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) notFound();
  const category = getCategory(product.category);
  const related = (await getProductsByCategory(product.category))
    .filter((p) => p.handle !== product.handle)
    .slice(0, 4);

  // Lets Google show price/stock status directly in search results instead
  // of just a plain blue link. See https://schema.org/Product.
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: [product.image, ...(product.extraImages || [])],
    description: buildSeoDescription(product),
    sku: buildSku(product.handle),
    brand: { '@type': 'Brand', name: siteConfig.name },
    // The business's real Google rating (see components/SiteConfig.js) —
    // this is one rating for the whole brand, not a per-product figure
    // (there's no real per-product review data), but Google explicitly
    // allows and expects a brand-level aggregateRating to be repeated
    // across every Product on the site this way.
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: siteConfig.googleRating.value,
      reviewCount: siteConfig.googleRating.count,
      bestRating: 5,
    },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/product/${product.handle}`,
      priceCurrency: 'AUD',
      price: product.price,
      availability: product.soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      // Real cost/time to Australia, NZ, and everywhere else we ship
      // (see lib/shipping.js) — without this, Google has no idea this
      // product ships outside Australia at all, which works against
      // showing up for searches from the USA, Canada, and the UK.
      shippingDetails: buildShippingDetails(),
      // "All sales are final — we do not offer returns, exchanges, or
      // refunds" (see app/shipping-returns/page.js) — stated accurately
      // here rather than left out, which Google would otherwise just
      // treat as unknown.
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
        // Which countries this no-returns policy applies to — the same
        // list we actually ship to (see shippingDetails above), so Google
        // isn't left guessing whether it covers international orders too.
        applicableCountry: shippingCountries(),
      },
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <nav className="text-xs text-forest/80 mb-6">
        <Link href="/shop" className="hover:text-gold">Shop</Link>
        {' / '}
        <Link href={`/shop/${product.category}`} className="hover:text-gold">{category?.label}</Link>
        {' / '}
        <span className="text-forest-dark">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <ProductGallery images={[product.image, ...(product.extraImages || [])]} title={product.title} />

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

          <a
            href={
              product.instagramLinkVerified && product.instagramPermalink
                ? product.instagramPermalink
                : siteConfig.social.instagram
            }
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-sm text-forest hover:text-gold underline underline-offset-2"
          >
            See the full look on Instagram →
          </a>

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
