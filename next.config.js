/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Vercel's Image Optimization API has a monthly transformation quota on
    // the free (Hobby) plan — once it's used up, any photo that needs a
    // size Vercel hasn't already cached fails outright with a 402 error
    // until the quota resets or the plan is upgraded (this is exactly what
    // broke the "Royal Blue Embroidered Suit" photo in November 2026).
    // Turning optimization off means every photo is served exactly as
    // stored (same JPEGs already re-hosted into Blob storage by the
    // Instagram sync, already reasonably sized) with zero dependency on
    // that quota — a product photo can never fail to load for this reason
    // again. The tradeoff is losing Vercel's automatic resizing/WebP
    // conversion, so pages are a little heavier than the optimized
    // versions would have been. Remove this line (and upgrade to Vercel
    // Pro) if you'd rather keep automatic optimization.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      // Cloudflare R2 — where product photos are permanently re-hosted now
      // (see lib/blob.js's file header for the Nov 2026 move off Vercel
      // Blob). This is the current primary image domain; every migrated
      // product's `image` now points here.
      {
        protocol: 'https',
        hostname: 'images.royaledesigns.com.au',
      },
      // Vercel Blob storage — the old home for re-hosted photos, kept here
      // only so next/image doesn't error on any URL that's somehow still
      // pointing there (nothing in the live catalog should be, post
      // migration). Safe to remove once you're confident nothing's left.
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      // Fallback so product pages don't break if a draft is published
      // before Blob storage is connected — Instagram's own image URLs
      // still load, they just expire after a while.
      {
        protocol: 'https',
        hostname: '*.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: '*.fbcdn.net',
      },
    ],
  },
};

module.exports = nextConfig;
