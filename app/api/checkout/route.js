import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getProduct } from '@/lib/catalog';
import { getExchangeRates } from '@/lib/exchange-rates-server';
import { formatMoney, SUPPORTED_CURRENCIES } from '@/lib/currency-shared';
import { getSizeStock, getSizesForCategory } from '@/data/products';
// Shared with the Product structured data on each product page (see
// lib/shipping.js) so the rates/countries Google sees in search results
// can never drift out of sync with what's actually charged here.
import { SHIPPING_REGIONS } from '@/lib/shipping';
import siteConfig from '@/components/SiteConfig';

export async function POST(request) {
  // Online payments are switched off for now (see siteConfig.onlineCheckout)
  // — refuse here too, not just in the UI, so nothing can reach Stripe.
  if (!siteConfig.onlineCheckout) {
    return NextResponse.json(
      { error: 'Online checkout is coming soon — please order via WhatsApp.' },
      { status: 503 }
    );
  }

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
        // Re-check ready-made stock for this exact size at the moment of
        // checkout (not just when it was added to the cart) — someone else
        // may have bought the last one in between. Custom-stitch and
        // one-size items aren't stock-limited, so they're skipped here.
        const stock = getSizeStock(product.availableSizes, getSizesForCategory(product.category));
        const available = stock[item.size];
        if (available !== undefined && Number.isFinite(available) && item.qty > available) {
          throw new Error(
            available > 0
              ? `Only ${available} left in size ${item.size} for "${product.title}" — please update the quantity in your cart.`
              : `Size ${item.size} for "${product.title}" just sold out — please choose a different size or remove it from your cart.`
          );
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
    // site. For a pickup order, add a reminder alongside it (or on its own)
    // that this is a collect-in-person order.
    const totalAud = subtotalAud + region.amount / 100;
    const submitMessageParts = [];
    if (displayCurrency && displayCurrency !== 'AUD' && SUPPORTED_CURRENCIES.includes(displayCurrency)) {
      const { rates } = await getExchangeRates();
      const rate = rates[displayCurrency];
      if (rate) {
        const estimate = totalAud * rate;
        submitMessageParts.push(
          `Approx. ${formatMoney(estimate, displayCurrency)} at today's rate — you'll be charged ${formatMoney(totalAud, 'AUD')} (AUD).`
        );
      }
    }
    if (region.pickup) {
      submitMessageParts.push("Local pickup — we'll email you to arrange a time to collect your order from Tarneit, VIC.");
    }
    // Shown as a required checkbox on the Checkout page itself (not just
    // buried on the Shipping & Returns page) — "all sales are final" only
    // protects you in a card-network dispute if the buyer can be shown to
    // have actually agreed to it before paying, and `consent_collection`
    // below is what makes Stripe require and timestamp that agreement on
    // the Checkout Session.
    const custom_text = {
      terms_of_service_acceptance: {
        message: `I agree to the [Shipping & Returns policy](${siteUrl}/shipping-returns) — all sales are final; no refunds, returns, or exchanges once an order is placed.`,
      },
      ...(submitMessageParts.length && { submit: { message: submitMessageParts.join(' ') } }),
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Requires the checkbox above to be ticked before the customer can
      // pay — without this, the message would just be decorative text.
      consent_collection: { terms_of_service: 'required' },
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
      // Pickup orders skip the shipping section of Stripe Checkout
      // entirely — no address form, no shipping line — rather than just
      // charging $0 for shipping. Everyone else only sees the one rate (and
      // matching countries) for the destination they picked on the cart
      // page, so there's nothing to choose (and nothing to get wrong) at
      // checkout.
      ...(!region.pickup && {
        shipping_address_collection: { allowed_countries: region.countries },
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
      }),
      phone_number_collection: { enabled: true },
      // Always save a Customer record in Stripe for every order (not just
      // when Stripe would otherwise need one) — this is what makes every
      // buyer show up, searchable, in your Stripe Dashboard → Customers,
      // with their full order history attached.
      customer_creation: 'always',
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancel`,
      custom_text,
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
