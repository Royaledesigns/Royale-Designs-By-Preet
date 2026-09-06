import Image from 'next/image';
import { products } from '@/data/products';
import siteConfig from '@/components/SiteConfig';

export const metadata = { title: 'About | Royale Designs by Preet' };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-serif text-4xl text-forest-dark mb-6 text-center">Our Story</h1>
      <div className="relative aspect-[16/7] rounded-sm overflow-hidden mb-10">
        <Image src={products[2].image} alt="Royale Designs by Preet" fill className="object-cover" />
      </div>
      <div className="prose prose-lg max-w-none text-forest/80 leading-relaxed space-y-5">
        <p>
          {siteConfig.name} is a premium South Asian bridal and ethnic wear brand based in{' '}
          {siteConfig.location}. Every lehenga, gharara set, sharara set, anarkali and suit is
          thoughtfully customised for you, with a focus on rich embellishment, considered
          detailing, and pieces that feel special enough for the moments that matter — sangeet,
          reception, Karwachauth, Jaggo, and every celebration in between.
        </p>
        <p>
          What started as a close, hands-on operation has grown into a brand our customers
          discover across Instagram, TikTok, Facebook and WhatsApp, and now shop directly through
          this website — with orders shipped from Melbourne to Australia, the USA, Canada, the
          UK, New Zealand and Europe.
        </p>
        <p>
          Alongside our ready-to-order collection, we also offer a dedicated Custom Made For You
          service for customers who want a piece made to their exact measurements or with a
          personal touch — see our{' '}
          <a href="/custom-tailoring" className="underline hover:text-gold">
            Custom Made For You
          </a>{' '}
          page to get started.
        </p>
      </div>
    </div>
  );
}
