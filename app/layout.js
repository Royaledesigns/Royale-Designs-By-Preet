import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import { CartProvider } from '@/lib/cart-context';
import { CurrencyProvider } from '@/lib/currency-context';
import SiteChrome from '@/components/SiteChrome';
import siteConfig from '@/components/SiteConfig';

// Every page's canonical URL, sitemap entries, and Open Graph/Twitter image
// URLs are resolved against this. If NEXT_PUBLIC_SITE_URL isn't already set
// in Vercel (Settings -> Environment Variables), set it to
// https://www.royaledesigns.com.au (the www version — the bare domain
// redirects to it, and search engines/social previews don't follow
// redirects reliably) so this always matches the live site exactly.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.royaledesigns.com.au';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  // Every page below sets its own short title (e.g. "About", a product
  // name) and this template appends the brand name automatically — one
  // place to change it instead of editing every page.
  title: {
    default: `${siteConfig.name} | ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description:
    'Premium South Asian bridal & ethnic wear from our Melbourne-based boutique, thoughtfully customised for you and delivered to Australia, the USA, Canada, the United Kingdom, New Zealand and Europe.',
  // Fallback social-share preview (link unfurls on Instagram, WhatsApp,
  // iMessage, Facebook, etc). Pages like the product page set their own
  // more specific image; everything else — home, about, contact — uses
  // this one automatically.
  openGraph: {
    siteName: siteConfig.name,
    type: 'website',
    locale: 'en_AU',
    images: [{ url: '/images/hero-collage.jpg', width: 2560, height: 1440, alt: siteConfig.name }],
  },
  twitter: {
    card: 'summary_large_image',
  },
};

// ClothingStore is a schema.org subtype of LocalBusiness — it carries
// everything Organization did, plus the address/phone/area-served fields
// that help Google tie this site to the "Royale Designs" Google Business
// Profile (Tarneit, 4.9★) for Maps and local-pack results. Deliberately
// suburb-level only (no street address/postcode) to match what's already
// public on the Contact page — the exact street address lives only on the
// Google Business Profile itself, which the owner manages separately.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ClothingStore',
  name: siteConfig.name,
  url: SITE_URL,
  // No dedicated square logo file exists yet (the hero image is a photo
  // collage, not a wordmark/icon) — add a `logo` field here once you have
  // one; Google uses it for brand knowledge panels.
  sameAs: Object.values(siteConfig.social),
  telephone: siteConfig.phone,
  email: siteConfig.email,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Tarneit',
    addressRegion: 'VIC',
    addressCountry: 'AU',
  },
  areaServed: siteConfig.shipsTo,
  priceRange: '$$',
  // Real rating + a sample of real reviews from the Google Business Profile
  // (https://g.page/r/CUU2rADipqhWEBE/review — snapshot checked 27 Nov 2026).
  // Deliberately placed on the business (here) rather than copy-pasted onto
  // every individual Product page: these reviews are about the business as
  // a whole, not any one specific piece, and Google's structured-data
  // guidelines treat marking up a generic store review as a "product
  // review" on many different products as a policy violation that can get
  // a site's rich results disabled entirely. This is the policy-safe way to
  // get the same real rating/reviews showing in search.
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: siteConfig.googleRating.value,
    reviewCount: siteConfig.googleRating.count,
    bestRating: 5,
  },
  review: [
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Vijeta' },
      reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5 },
      reviewBody:
        "It was my first experience n it's really good ..suit looks beautiful with good quality..Highly recommended!!",
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Shweta Mudaliar' },
      reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5 },
      reviewBody:
        "Just received my outfits from Royale Designs by Preet today and I'm honestly in LOVE! The outfits are absolutely gorgeous, beautifully designed and even more stunning in person. The detailing, colours and overall finish are just perfect! You can truly see the effort and love that has gone into every piece. Everything fits beautifully and looks so elegant and classy. Definitely exceeded my expectations! Thank you Royale Designs by Preet for making such beautiful outfits. I can't wait to wear them! Highly recommend!",
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Raj Kaur' },
      reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5 },
      reviewBody:
        'I got best customer service and my beautiful customize lehnga from Royale Designs. They are very friendly, welcoming and explain me different options for my big event. I will definetely be back in future. Good luck and keep growing.',
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Daljeet Kaur' },
      reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5 },
      reviewBody:
        "I absolutely loved my suit from Royale Design by Preet. I got a beautiful Sardari suit, and I received so many compliments everyone loved it. The design, quality, and detailing were simply gorgeous. I highly recommend Royale Design by Preet if you're looking for a beautiful suit for your special events. You'll definitely feel confident and special wearing their outfits!",
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Harman Aujla' },
      reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5 },
      reviewBody:
        'I ordered suit from Preet designs. The team is really good and help you with choosing best outfits. The tailoring is done perfectly and loved their services. Would definitely order again.',
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Jashan Nain' },
      reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5 },
      reviewBody:
        "Absolutely loved my suits from Royal Designs by Preet! The quality and fabric are really good, and the suits look exactly as expected. Beautiful designs, great stuff, and I'm really happy with my purchase! Highly recommended!",
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Rashmeet Kaur' },
      reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5 },
      reviewBody:
        'I had the most amazing experience with Royale Design by Preet for my lehenga! From the very first consultation to the final fitting, everything was absolutely perfect. The detailing on my lehenga was beyond my expectations — the embroidery, fabric quality, finishing, and overall design were just stunning. Every tiny element was crafted so beautifully, and you can truly see the passion and hard work behind the work. Highly, highly recommended for anyone looking for elegance, perfection, and exceptional craftsmanship. Thank you for making my lehenga a dream come true!',
    },
    {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Riya' },
      reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5 },
      reviewBody:
        'I recently purchased a beautiful suit from this store, and I absolutely loved it! They had a wide variety of lovely suits, and they also offer customization. I had a wonderful shopping experience. Highly recommend!',
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Poppins:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="font-sans text-forest-dark antialiased">
        <CurrencyProvider>
          <CartProvider>
            <SiteChrome>{children}</SiteChrome>
          </CartProvider>
        </CurrencyProvider>
        {/* Free, built into the Vercel plan already in use — shows visitor
            counts, page views, referrers and countries under the project's
            Analytics tab. No separate account/sign-up needed. */}
        <Analytics />
        {/* Cloudflare Web Analytics — free, unlimited (no monthly event cap,
            unlike Vercel Analytics' Hobby-plan quota). Added as a plain
            manual snippet rather than turning on Cloudflare's proxy for the
            domain (DNS stays "DNS only"/grey-cloud — see lib/blob.js's file
            header for why that's deliberate), so this has zero effect on
            how the site is served or crawled; it's just a deferred
            client-side beacon, same as Vercel's <Analytics /> above. Site
            registered under Cloudflare dashboard -> Web Analytics. */}
        <script
          type="module"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "71539d60f19e4aa4a297896146d18818"}'
        />
      </body>
    </html>
  );
}
