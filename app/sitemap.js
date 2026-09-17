import { getAllProducts, getCategories } from '@/lib/catalog';

// Same canonical domain as app/layout.js and app/robots.js — keep these in
// sync if you ever change NEXT_PUBLIC_SITE_URL.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.royaledesigns.com.au';

// Next.js serves whatever this returns at /sitemap.xml automatically — no
// separate route file needed. `revalidate` re-runs it periodically so newly
// added products (including ones pulled in from Instagram) show up here
// without a redeploy.
export const revalidate = 3600;

const STATIC_PAGES = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/shop', priority: 0.9, changeFrequency: 'daily' },
  { path: '/custom-tailoring', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/shipping-returns', priority: 0.4, changeFrequency: 'monthly' },
];

export default async function sitemap() {
  const [products, categories] = await Promise.all([getAllProducts(), getCategories()]);

  const staticEntries = STATIC_PAGES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));

  const categoryEntries = categories.map((c) => ({
    url: `${SITE_URL}/shop/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const productEntries = products.map((p) => ({
    url: `${SITE_URL}/product/${p.handle}`,
    lastModified: new Date(p.updatedAt || Date.now()),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
