import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getProduct } from '@/lib/catalog';

const EU_COUNTRIES = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'IE', 'PT', 'AT', 'SE', 'DK', 'FI'];

// The cart page asks the shopper to pick a shipping destination before
// checkout, and we use that to charge the right rate automatically — Stripe
// Checkout can't recalculate shipping live from the address someone types in
// at payment time, so this is what gives an "it just knows" experience:
// only the one matching rate (and matching countries) reaches the Stripe
// session, instead of showing every rate and hoping the shopper picks the
// right one themselves.
const SHIPPING_REGIONS = {
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
};

export async function POST(request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      {
        error:
          'Payments are not configured yet. Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment (see .env.example) to enable checkout.',
      },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || 'http://localhost:3000';

  const { items, shippingRegion } = await request.json();

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
  }

  const region = SHIPPING_REGIONS[shippingRegion];
  if (!region) {
    return NextResponse.json({ error: 'Please select a shipping destination.' }, { status: 400 });
  }

  try {
    // Re-price every line item from our own live catalog (Redis-backed,
    // including products added through /admin/products) rather than
    // trusting the client, so the amount actually charged always matches
    // what's on the site right now.
    const line_items = await Promise.all(
      items.map(async (item) => {
        const product = await getProduct(item.handle);
        if (!product) {
          throw new Error(`"${item.title || item.handle}" is no longer available — please remove it from your cart.`);
        }
        return {
          quantity: item.qty,
          price_data: {
            currency: 'aud',
            unit_amount: Math.round(product.price * 100),
            product_data: {
              name: item.size === 'One Size' ? product.title : `${product.title} — Size: ${item.size}`,
              images: [product.image],
              metadata: { handle: product.handle, size: item.size },
            },
          },
        };
      })
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      // Only the countries for the chosen destination are offered, so a
      // shopper can't accidentally enter an address that doesn't match the
      // shipping rate they were charged.
      shipping_address_collection: { allowed_countries: region.countries },
      // Only one rate — the one for the destination picked on the cart page
      // — so nothing to choose (and nothing to get wrong) at checkout.
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: region.amount, currency: 'aud' },
            display_name: region.display_name,
            delivery_estimate: {
              minimum: { unit: 'business_day', value: region.delivery.min },
              maximum: { unit: 'business_day', value: region.delivery.max },
            },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json(
      { error: err.message || 'Could not start checkout. Please try again.' },
      { status: 500 }
    );
  }
}
