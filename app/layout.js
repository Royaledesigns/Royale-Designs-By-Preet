import './globals.css';
import { CartProvider } from '@/lib/cart-context';
import { CurrencyProvider } from '@/lib/currency-context';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ChatWidget from '@/components/ChatWidget';
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
    'Premium South Asian bridal & ethnic wear, thoughtfully customised for you and delivered to Australia, the USA, Canada, the United Kingdom, New Zealand and Europe.',
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

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteConfig.name,
  url: SITE_URL,
  // No dedicated square logo file exists yet (the hero image is a photo
  // collage, not a wordmark/icon) — add a `logo` field here once you have
  // one; Google uses it for brand knowledge panels.
  sameAs: Object.values(siteConfig.social),
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
            <Header />
            <main className="min-h-[60vh]">{children}</main>
            <Footer />
            <ChatWidget />
          </CartProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
