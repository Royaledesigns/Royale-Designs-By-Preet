// Central place for details that are easy to get wrong by hand-editing HTML.
// Update these once and they flow through the whole site.
const siteConfig = {
  name: 'Royale Designs by Preet',
  shortName: 'Royale Designs',
  tagline: 'Premium South Asian bridal & ethnic wear',
  // Short brand motto shown directly under the wordmark in the header & footer.
  motto: 'A Place Of True Elegance',
  location: 'Tarneit, Melbourne, Australia',
  email: 'prabhpreet.maan@yahoo.com',
  // Shown on the Contact page and used to build the WhatsApp link below.
  phone: '+61 450 525 154',
  shipsTo: ['Australia', 'USA', 'Canada', 'United Kingdom', 'New Zealand', 'Europe'],
  social: {
    instagram: 'https://www.instagram.com/royale_designs_by_preet?igsh=cDB3cWtpbHJ0YWFj&utm_source=qr',
    tiktok: 'https://www.tiktok.com/@royale_designs_by_preet?_r=1&_t=ZS-98SPHaSbmpZ',
    facebook: 'https://www.facebook.com/share/1LokEECYeb/?mibextid=wwXIfr',
    // WhatsApp click-to-chat link for the business.
    whatsapp: 'https://wa.me/message/3Z23IAKTZMNRJ1',
  },
  // Public WhatsApp Channel — followers get every new arrival you post there.
  // Kept out of `social` on purpose: that list is also rendered as the header
  // links and the site's structured data, which this shouldn't join.
  whatsappChannel: 'https://whatsapp.com/channel/0029Vb7qGPoAO7RHDqvJVt2I',
  // Shown as the handle under the homepage Instagram feed.
  instagramHandle: '@royale_designs_by_preet',
  // Real rating from the business's Google Business Profile
  // (https://g.page/r/CUU2rADipqhWEBE/review) — powers the "aggregateRating"
  // on every Product's structured data so star ratings can show up in
  // Google search results. This is a snapshot, not live-fetched: update
  // these two numbers by hand every so often as new reviews come in
  // (checked 27 Nov 2026 — 4.9 stars, 39 reviews).
  googleRating: { value: 4.9, count: 39 },
  // Master switch for paying online (Stripe). While false, product pages
  // show "Order on WhatsApp" (size + quantity prefilled into the message)
  // instead of Add to Cart / Buy Now, the cart page offers WhatsApp instead
  // of Proceed to Checkout, and /api/checkout refuses requests. Flip to
  // true once Stripe is set up (a real sk_live_ key in STRIPE_SECRET_KEY on
  // Vercel) and each outfit's available sizes are marked in the admin.
  onlineCheckout: false,
};

export default siteConfig;
