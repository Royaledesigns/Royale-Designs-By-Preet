// Same canonical domain as app/layout.js and app/sitemap.js — keep these in
// sync if you ever change NEXT_PUBLIC_SITE_URL.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.royaledesigns.com.au';

// Next.js serves this at /robots.txt automatically. Note: while the
// site-wide password gate (proxy.js) is on, search engines can't get past
// it anyway — this is here so it's already correct the moment you remove
// that gate, not something that takes effect on its own before then.
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Nothing here has SEO value and none of it should show up in search
      // results — your dashboard, API routes, the mid-checkout pages, and
      // /order-details (a link you send directly to a customer, not a page
      // anyone should land on from Google).
      disallow: ['/admin', '/api', '/cart', '/checkout', '/site-login', '/order-details'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
