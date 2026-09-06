/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
