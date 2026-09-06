import ContactForm from '@/components/ContactForm';
import siteConfig from '@/components/SiteConfig';

export const metadata = { title: 'Contact | Royale Designs by Preet' };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-2 gap-12">
      <div>
        <h1 className="font-serif text-4xl text-forest-dark mb-6">Get in Touch</h1>
        <p className="text-forest/80 leading-relaxed mb-8">
          Questions about a piece, an order, or our Custom Made For You service? Send us a message and
          we&apos;ll reply as soon as we can.
        </p>
        <div className="space-y-2 text-forest-dark text-sm">
          <p>
            <span className="text-forest/80">Email:</span>{' '}
            <a href={`mailto:${siteConfig.email}`} className="underline hover:text-gold">{siteConfig.email}</a>
          </p>
          <p>
            <span className="text-forest/80">WhatsApp:</span>{' '}
            <a href={siteConfig.social.whatsapp} target="_blank" rel="noreferrer" className="underline hover:text-gold">
              {siteConfig.phone}
            </a>
          </p>
          <p>
            <span className="text-forest/80">Location:</span> {siteConfig.location}
          </p>
          <p>
            <span className="text-forest/80">Ships to:</span> {siteConfig.shipsTo.join(', ')}
          </p>
        </div>
      </div>
      <ContactForm />
    </div>
  );
}
