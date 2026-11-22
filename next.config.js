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
      // Vercel Blob storage — where Instagram-sourced product photos get
      // permanently re-hosted (see lib/blob.js) once BLOB_READ_WRITE_TOKEN
      // is set.
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
