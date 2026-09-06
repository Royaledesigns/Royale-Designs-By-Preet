import siteConfig from '@/components/SiteConfig';

export const metadata = { title: 'Shipping & Returns | Royale Designs by Preet' };

export default function ShippingReturnsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-serif text-4xl text-forest-dark mb-10 text-center">Shipping & Returns</h1>

      <div className="space-y-10 text-forest/80 leading-relaxed">
        <section>
          <h2 className="font-serif text-2xl text-forest-dark mb-3">Shipping</h2>
          <p className="mb-3">
            Each piece is thoughtfully customised for you, with our team based in
            {' '}{siteConfig.location}. We currently deliver to {siteConfig.shipsTo.join(', ')}.
            Every piece is made to order, so please allow processing time before your order is
            dispatched — you&apos;ll receive tracking details by email as soon as it ships.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Standard Shipping (Australia): estimated 5–7 business days from dispatch.</li>
            <li>
              Express Shipping (Australia): estimated 1–4 business days from dispatch — message us
              on{' '}
              <a href={siteConfig.social.whatsapp} target="_blank" rel="noreferrer" className="underline hover:text-gold">
                WhatsApp
              </a>{' '}
              for availability and pricing.
            </li>
            <li>
              International Standard Shipping: estimated 6–9 business days from dispatch, depending on
              destination and customs processing.
            </li>
            <li>
              International Express Shipping: estimated 3–6 business days from dispatch — message us
              on{' '}
              <a href={siteConfig.social.whatsapp} target="_blank" rel="noreferrer" className="underline hover:text-gold">
                WhatsApp
              </a>{' '}
              for availability and pricing.
            </li>
          </ul>
          <p className="mt-3 text-sm text-forest/80">
            International orders may be subject to customs duties or import taxes charged by the
            destination country — these are the responsibility of the customer and are not
            included in the checkout total.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-forest-dark mb-3">Returns & Exchanges</h2>
          <p className="mb-3 font-medium text-forest-dark">
            All sales are final — we do not offer returns, exchanges, or refunds.
          </p>
          <p>
            Because every piece is handcrafted, please check measurements, colours and details
            carefully before ordering, or contact us first if you have any questions. This
            applies to every order, including custom tailoring and made-to-measure pieces.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-forest-dark mb-3">Colour Disclaimer</h2>
          <p>
            Colours may appear slightly different from what you see in our photos or videos.
            This is due to lighting and the video/photo shooting process, and is expected with
            handcrafted fabrics — it is not considered a fault.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-forest-dark mb-3">Damaged Items</h2>
          <p>
            We take great care packaging every order. If your parcel arrives damaged, we require
            a full, uninterrupted video of the parcel being opened from a sealed state in order
            to process a damage claim — claims submitted without a complete opening video cannot
            be accepted. Please contact us with the video and photos as soon as possible after
            delivery.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-forest-dark mb-3">Questions?</h2>
          <p>
            Reach out any time at{' '}
            <a href={`mailto:${siteConfig.email}`} className="underline hover:text-gold">{siteConfig.email}</a>{' '}
            and we&apos;ll be happy to help.
          </p>
        </section>
      </div>
    </div>
  );
}
