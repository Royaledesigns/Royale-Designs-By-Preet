// Real catalog data pulled from the Royale Designs Shopify store
// (royale-designs-5517.myshopify.com) on 2026-09-05.
// Add new pieces here as you create them — each object is one product.

// The full set of sizes the storefront offers. A product's own
// `availableSizes` is the subset currently made/in stock for that piece —
// the rest show up greyed out on the product page, with only "Custom" left
// selectable so shoppers know to order those sizes as a custom stitch.
export const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// Heels & Punjabi Jutti use European shoe sizing instead of clothing sizes.
export const SHOE_SIZES = ['34', '35', '36', '37', '38', '39', '40', '41', '42'];

// Jewellery categories aren't sized at all — no size picker shows for these.
export const JEWELLERY_CATEGORIES = ['jewellery'];

export function isJewelleryCategory(category) {
  return JEWELLERY_CATEGORIES.includes(category);
}

// Which size set applies to a given product category — clothing sizes
// everywhere except footwear, which uses EU shoe sizes.
export function getSizesForCategory(category) {
  return category === 'heels-punjabi-jutti' ? SHOE_SIZES : ALL_SIZES;
}

export const categories = [
  { slug: 'bridal-wear-outfits', label: 'Bridal Wear' },
  { slug: 'lehengas', label: 'Lehengas' },
  { slug: 'gharara-sets', label: 'Gharara' },
  { slug: 'sharara-sets', label: 'Sharara' },
  { slug: 'anarkalis', label: 'Anarkalis' },
  { slug: 'suits', label: 'Partywear Suits' },
  { slug: 'casual-wear-suits', label: 'Casual Wear Suits' },
  { slug: 'pakistani-mirror-dupattas', label: 'Pakistani Mirror Dupattas' },
  { slug: 'heels-punjabi-jutti', label: 'Heels & Punjabi Jutti' },
  { slug: 'jewellery', label: 'Jewellery' },
];

export const products = [
  {
    handle: 'multi-coloured-embellished-lehenga',
    title: 'Multi-Coloured Embellished Lehenga',
    category: 'lehengas',
    price: 595.0,
    currency: 'AUD',
    occasion: ['Bridal', 'Sangeet'],
    description:
      "A rich multi-coloured lehenga with heavy embroidered detailing, paired with a contrasting green dupatta. Perfect for Jaggo, Sangeet, or Karwachauth.",
    image:
      'https://cdn.shopify.com/s/files/1/0993/2344/5526/files/multi-coloured-lehenga.jpg?v=1786778596',
    tags: ['Bridal', 'Embellished', 'Lehenga', 'Sangeet'],
  },
  {
    handle: 'purplish-pink-embellished-gharara',
    title: 'Purplish Pink Embellished Gharara',
    category: 'gharara-sets',
    price: 460.0,
    currency: 'AUD',
    occasion: ['Semi-Formal'],
    description:
      'A stunning purplish-pink gharara set with heavy silver embellishment throughout, including a richly detailed dupatta — a striking statement piece for any celebration.',
    image:
      'https://cdn.shopify.com/s/files/1/0993/2344/5526/files/purplish-pink-gharara_b12ec8f0-e8b3-4406-ba8d-6cf425b6036c.jpg?v=1786778651',
    tags: ['Embellished', 'Gharara', 'Semi-Formal'],
  },
  {
    handle: 'metallic-bronze-gharara',
    title: 'Metallic Bronze Gharara',
    category: 'gharara-sets',
    price: 440.0,
    currency: 'AUD',
    occasion: ['Semi-Formal'],
    description:
      'A metallic bronze gharara set with heavy embellishment throughout, including a richly detailed dupatta. A glamorous choice for evening functions.',
    image:
      'https://cdn.shopify.com/s/files/1/0993/2344/5526/files/metallic-bronze-gharara.jpg?v=1786778374',
    tags: ['Embellished', 'Gharara', 'Semi-Formal'],
  },
  {
    handle: 'golden-beige-embellished-sharara',
    title: 'Golden Beige Embellished Sharara',
    category: 'sharara-sets',
    price: 450.0,
    currency: 'AUD',
    occasion: ['Bridal', 'Semi-Formal'],
    description:
      'A stunning golden-beige sharara set, heavily embellished with crystal and stonework throughout the dupatta and kurti — elegant and statement-making for your next big function.',
    image:
      'https://cdn.shopify.com/s/files/1/0993/2344/5526/files/golden-beige-sharara.jpg?v=1786778677',
    tags: ['Bridal', 'Embellished', 'Semi-Formal', 'Sharara'],
  },
  {
    handle: 'sea-green-anarkali',
    title: 'Sea Green Anarkali',
    category: 'anarkalis',
    price: 460.0,
    currency: 'AUD',
    occasion: ['Semi-Formal'],
    description:
      'A beautiful sea green Anarkali with golden embroidery throughout. Can be customised to any size — colour may vary slightly depending on lighting.',
    image:
      'https://cdn.shopify.com/s/files/1/0993/2344/5526/files/sea-green-anarkali_aace09f7-74c9-4c40-a49c-7a7d3b58656e.jpg?v=1786778503',
    tags: ['Anarkali', 'Customisable', 'Embellished', 'Semi-Formal'],
  },
  {
    handle: 'metallic-gold-silk-suit',
    title: 'Metallic Gold Silk Suit',
    category: 'suits',
    price: 285.0,
    currency: 'AUD',
    occasion: ['Semi-Formal'],
    description:
      'Pure raw silk suit in metallic gold, hand embroidered with delicate detailing. Paired with a vibrant magenta dupatta for a striking contrast.',
    image:
      'https://cdn.shopify.com/s/files/1/0993/2344/5526/files/metallic-gold-silk-suit.jpg?v=1786778556',
    tags: ['Hand Embroidered', 'Semi-Formal', 'Silk', 'Suit'],
  },
  {
    handle: 'dark-maroon-embellished-suit',
    title: 'Dark Maroon Embellished Suit',
    category: 'suits',
    price: 410.0,
    currency: 'AUD',
    occasion: ['Bridal'],
    description:
      'A stunning dark maroon suit with heavy salwar, finished with intricate gold and cream embroidery along the borders and dupatta.',
    image:
      'https://cdn.shopify.com/s/files/1/0993/2344/5526/files/dark-maroon-suit.jpg?v=1786778530',
    tags: ['Bridal', 'Embellished', 'Suit'],
  },
];

export function getProduct(handle) {
  return products.find((p) => p.handle === handle);
}

export function getProductsByCategory(slug) {
  return products.filter((p) => p.category === slug);
}

export function getCategory(slug) {
  return categories.find((c) => c.slug === slug);
}
