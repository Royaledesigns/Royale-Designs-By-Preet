// Single source of truth for where this store actually ships and what it
// costs. Used by the checkout flow (Stripe's allowed countries + rate) AND
// by the Product structured data on each product page — pulling both from
// the same place means the "ships to / costs this much" info Google sees
// in search results can never drift out of sync with what a customer is
// actually charged at checkout.

// The EU countries we've actually configured a shipping rate for, not
// every EU member state.
export const EU_COUNTRIES = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'IE', 'PT', 'AT', 'SE', 'DK', 'FI'];

export const SHIPPING_REGIONS = {
  AU: {
    countries: ['AU'],
    amount: 2000,
    display_name: 'Standard Shipping — Australia',
    delivery: { min: 5, max: 7 },
  },
  NZ: {
    countries: ['NZ'],
    amount: 3000,
    display_name: 'Standard Shipping — New Zealand',
    delivery: { min: 5, max: 8 },
  },
  INTL: {
    countries: ['US', 'CA', 'GB', ...EU_COUNTRIES],
    amount: 6000,
    display_name: 'International Shipping',
    delivery: { min: 6, max: 9 },
  },
  // Free, no shipping address collected at all — for a local customer
  // paying online and collecting the order in person. Excluded from the
  // Product structured data below (see buildShippingDetails) since it
  // isn't a real shipping option Google should advertise.
  PICKUP: {
    pickup: true,
    amount: 0,
    display_name: 'Local Pickup — Tarneit, VIC',
  },
};

// Builds the `shippingDetails` array for a Product's JSON-LD (see
// app/product/[handle]/page.js) — lets Google show real delivery cost and
// time directly in search results instead of nothing. Handling/processing
// time is deliberately left out: every piece is made to order and there's
// no single confirmed number for that anywhere on the site yet (the
// Shipping & Returns page just says "please allow processing time") —
// add `handlingTime` here once there's an actual figure to quote, rather
// than guessing one.
export function buildShippingDetails(currency = 'AUD') {
  return Object.values(SHIPPING_REGIONS)
    .filter((region) => !region.pickup)
    .map((region) => ({
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: (region.amount / 100).toFixed(2),
        currency,
      },
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: region.countries,
      },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        transitTime: {
          '@type': 'QuantitativeValue',
          minValue: region.delivery.min,
          maxValue: region.delivery.max,
        },
      },
    }));
}
