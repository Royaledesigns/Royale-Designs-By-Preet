import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getProduct } from '@/lib/catalog';
import { getExchangeRates } from '@/lib/exchange-rates-server';
import { formatMoney, SUPPORTED_CURRENCIES } from '@/lib/currency-shared';

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

  const { items, shippingRegion, displayCurrency } = await request.json();

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
    const priced = await Promise.all(
      items.map(async (item) => {
        const product = await getProduct(item.handle);
        if (!product) {
          throw new Error(`"${item.title || item.handle}" is no longer available — please remove it from your cart.`);
        }
        return { item, product };
      })
    );

    const subtotalAud = priced.reduce((sum, { item, product }) => sum + product.price * item.qty, 0);

    const line_items = priced.map(({ item, product }) => ({
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
    }));

    // The cart page shows shoppers an estimated total in whatever currency
    // they picked (display only — the real charge is always AUD). Carry
    // that same estimate onto the Stripe-hosted payment page itself, right
    // above the Pay button, so it doesn't disappear once they leave the
    // site.
    let custom_text;
    if (displayCurrency && displayCurrency !== 'AUD' && SUPPORTED_CURRENCIES.includes(displayCurrency)) {
      const totalAud = subtotalAud + region.amount / 100;
      const { rates } = await getExchangeRates();
      const rate = rates[displayCurrency];
      if (rate) {
        const estimate = totalAud * rate;
        custom_text = {
          submit: {
            message: `Approx. ${formatMoney(estimate, displayCurrency)} at today's rate — you'll be charged ${formatMoney(totalAud, 'AUD')} (AUD).`,
          },
        };
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Card only. Without this, Stripe can auto-detect a returning "Link"
      // user by email and skip straight to Link's own saved-card screen
      // instead of your checkout's normal card form — jarring for a
      // customer who's never used Link on your site before. Pinning this to
      // card keeps the payment step consistent for everyone (drop 'card'
      // into an array with 'klarna' / 'afterpay_clearpay' etc. later if you
      // want to bring those back — just make sure they're enabled in your
      // Stripe Dashboard first).
      payment_method_types: ['card'],
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
      // Always save a Customer record in Stripe for every order (not just
      // when Stripe would otherwise need one) — this is what makes every
      // buyer show up, searchable, in your Stripe Dashboard → Customers,
      // with their full order history attached.
      customer_creation: 'always',
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancel`,
      ...(custom_text && { custom_text }),
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
