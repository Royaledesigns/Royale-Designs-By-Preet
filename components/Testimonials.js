// Static, hand-curated selection of real Google reviews for Royale Designs by
// Preet. These are complete, verbatim quotes (nothing truncated or invented) —
// when adding more later, only pull ones where you can see the full review
// text, not the "...View full review" previews Google shows in the list.
const testimonials = [
  {
    name: 'Amar Singh',
    quote: 'Amazing service. Great communication. Top tier products. Thank you!',
    when: '3 weeks ago',
  },
  {
    name: 'Manpreet Chouhan',
    quote:
      'My very first suit from Royale Designs by Preet was a stunning red outfit, and it was absolutely amazing! I would love to shop for more beautiful suits from Royale Designs by Preet.',
    when: '6 weeks ago',
  },
  {
    name: 'Preeti Kumar',
    quote:
      'I ordered 2 suits. Beautifully stitched with perfection and details. The quality of suits is high. Very good customer service too. If you love perfection with suits, just buy from Royale Designs. Lovely collections.',
    when: '34 weeks ago',
    tag: 'Local Guide · 11 reviews',
  },
  {
    name: 'Simran Jeetkaur',
    quote:
      "Preet has beautiful suit and jewellery collection, she made my suit available on time, the suit was stitched perfectly, happy with my purchase.",
    when: '31 weeks ago',
  },
  {
    name: 'Neeta',
    quote: 'Beautiful stunning ready stitched outfits! Gharara and jewellery set was perfectly matched.',
    when: '22 weeks ago',
  },
  {
    name: 'Honey Naneer',
    quote: 'It was my first visit and purchase with Preet and a great experience as well, must recommend.',
    when: '43 weeks ago',
  },
];

function StarRow() {
  return (
    <div className="flex gap-0.5 text-gold-dark" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10 1.5l2.59 5.25 5.79.84-4.19 4.09.99 5.77L10 14.9l-5.18 2.55.99-5.77L1.62 7.6l5.79-.84L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <p className="uppercase tracking-[0.3em] text-gold-dark text-xs mb-3">Customer Love</p>
        <h2 className="font-serif text-3xl text-forest-dark">What Our Customers Are Saying</h2>
        <p className="text-sm text-forest/80 mt-2">Real reviews from real customers on Google.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((t) => (
          <figure
            key={t.name}
            className="bg-cream-dark/50 border border-forest/10 rounded-sm p-6 flex flex-col"
          >
            <StarRow />
            <blockquote className="mt-4 text-forest-dark/90 leading-relaxed text-sm flex-1">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-5 pt-4 border-t border-forest/10">
              <p className="font-serif text-lg text-forest-dark">{t.name}</p>
              <p className="text-xs text-forest/80 mt-0.5">
                {t.when}
                {t.tag ? ` · ${t.tag}` : ''}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
