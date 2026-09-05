import siteConfig from '@/components/SiteConfig';

export const metadata = { title: 'FAQ | Royale Designs by Preet' };

const faqs = [
  {
    q: 'Where are your pieces made?',
    a: `Every piece is designed and finished by ${siteConfig.name}, based in ${siteConfig.location}.`,
  },
  {
    q: 'Do you ship internationally?',
    a: `Yes — we ship to ${siteConfig.shipsTo.join(', ')}. Select your country at checkout to see shipping options.`,
  },
  {
    q: 'What currency am I charged in?',
    a: 'All orders are charged in Australian Dollars (AUD). You can preview an estimated price in USD, GBP, CAD, EUR or NZD using the currency switcher, but the amount charged by your bank or card will be in AUD.',
  },
  {
    q: 'Can I get a piece custom made or altered?',
    a: 'Yes — choose "Custom" as your size on any product page, or visit our Custom Tailoring page to start a bespoke order.',
  },
  {
    q: 'How long will my order take?',
    a: 'Every piece is made to order, so please allow processing time before dispatch. Once shipped, Australian orders typically arrive in 5–10 business days and international orders in 10–21 business days.',
  },
  {
    q: 'What is your returns policy?',
    a: 'All sales are final — we do not offer returns, exchanges, or refunds. Please check measurements and colours carefully before ordering. See our Shipping & Returns page for full details.',
  },
  {
    q: 'My order arrived damaged — what do I do?',
    a: 'Contact us with a full, uninterrupted video of the parcel being opened from a sealed state, along with photos of the damage. This unboxing video is required to process any damage claim.',
  },
  {
    q: 'Why does the colour look different to the photos?',
    a: 'Colours can appear slightly different in person due to lighting and the video/photo shooting process. This is expected with handcrafted fabrics and is not considered a fault.',
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-serif text-4xl text-forest-dark mb-10 text-center">Frequently Asked Questions</h1>
      <div className="space-y-8">
        {faqs.map((item) => (
          <div key={item.q} className="border-b border-forest/10 pb-6">
            <h2 className="font-serif text-xl text-forest-dark mb-2">{item.q}</h2>
            <p className="text-forest/70 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
