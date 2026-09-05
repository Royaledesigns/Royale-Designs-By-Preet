import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getProduct } from '@/data/products';

// Countries we ship to, expressed as ISO codes for Stripe's shipping address
// collector. Add/remove as your shipping policy changes.
const EU_COUNTRIES = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'IE', 'PT', 'AT', 'SE', 'DK', 'FI'];
const ALLOWED_COUNTRIES = ['AU', 'US', 'CA', 'GB', 'NZ', ...EU_COUNTRIES];

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

  const { items } = await request.json();

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
  }

  // Re-price every line item from our own product data rather than trusting
  // the client, so the amount actually charged always matches the catalog.
  const line_items = items.map((item) => {
    const product = getProduct(item.handle);
    if (!product) throw new Error(`Unknown product: ${item.handle}`);
    return {
      quantity: item.qty,
      price_data: {
        currency: 'aud',
        unit_amount: Math.round(product.price * 100),
        product_data: {
          name: `${product.title} — Size: ${item.size}`,
          images: [product.image],
          metadata: { handle: product.handle, size: item.size },
        },
      },
    };
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      shipping_address_collection: { allowed_countries: ALLOWED_COUNTRIES },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 1500, currency: 'aud' },
            display_name: 'Standard Shipping — Australia',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 10 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 4500, currency: 'aud' },
            display_name: 'International Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 10 },
              maximum: { unit: 'business_day', value: 21 },
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
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 });
  }
}
