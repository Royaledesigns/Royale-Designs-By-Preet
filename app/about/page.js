import Image from 'next/image';
import siteConfig from '@/components/SiteConfig';

export const metadata = { title: 'About | Royale Designs by Preet' };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-serif text-4xl text-forest-dark mb-6 text-center">Our Story</h1>
      <div className="relative aspect-[16/7] rounded-sm overflow-hidden mb-10">
        <Image
          src="/images/about-story-artisan.jpg"
          alt="A Royale Designs by Preet lehenga being hand-finished at the loom, surrounded by design sketches and fabric"
          fill
          className="object-cover"
        />
      </div>
      <div className="prose prose-lg max-w-none text-forest/80 leading-relaxed space-y-5">
        <p>
          {siteConfig.name} began with a simple belief: the clothes you wear for life&rsquo;s
          most cherished moments should feel like they were made just for you. From our home in{' '}
          {siteConfig.location}, every lehenga, gharara, sharara, anarkali and suit is
          thoughtfully customised by hand — rich embellishment, considered detailing, and a fit
          shaped around you, never off a rack. Whether it&rsquo;s a sangeet, a reception,
          Karwachauth, Jaggo, or any celebration close to your heart, we want you to feel like the
          most elegant version of yourself in it.
        </p>
        <p>
          What began as a close, hands-on labour of love has grown into a brand our community
          discovers across Instagram, TikTok, Facebook and WhatsApp — and now, right here on our
          own home. From Melbourne, we now send that same warmth and craftsmanship to doorsteps
          across Australia, the USA, Canada, the UK, New Zealand and Europe.
        </p>
        <p>
          Beyond our ready-to-order collection, we offer a dedicated Custom Made For You service
          for anyone dreaming of a piece made to their exact measurements, or with a personal
          touch that makes it truly theirs — visit our{' '}
          <a href="/custom-tailoring" className="underline hover:text-gold">
            Custom Made For You
          </a>{' '}
          page to begin that journey with us.
        </p>
      </div>
    </div>
  );
}
