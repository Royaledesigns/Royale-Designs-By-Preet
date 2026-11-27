import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { appendToSheet } from '@/lib/google-sheet';
import { isKvConfigured, kv } from '@/lib/kv';

// Receives Stripe's "checkout.session.completed" event for every paid
// website order and logs it to your Google Sheet (see lib/google-sheet.js
// and README.md "Google Sheet customer sync") the same way an
// Instagram/WhatsApp order does from app/api/contact/route.js — so every
// sale ends up in one place, however it was made.
//
// Setup: Stripe Dashboard → Developers → Webhooks → Add destination → URL
// = https://www.royaledesigns.com.au/api/webhooks/stripe → event =
// checkout.session.completed → copy the signing secret it gives you into
// STRIPE_WEBHOOK_SECRET in your environment. See README.md for the full
// walkthrough.
export const runtime = 'nodejs';

// A redelivered event (Stripe retries if it doesn't get a fast 200, or you
// manually resend one from the Dashboard) would otherwise create a second
// row for the same order — this remembers which Checkout Session IDs have
// already been logged for a day, long enough to absorb any realistic
// retry, and is skipped gracefully if Redis isn't connected (you'd just
// risk an occasional duplicate row instead of a hard failure).
const PROCESSED_TTL_SECONDS = 60 * 60 * 24;

export async function POST(request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    console.error('Stripe webhook received but STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET is not set yet.');
    return NextResponse.json({ error: 'Stripe is not fully configured yet.' }, { status: 500 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });

  // Stripe signs the EXACT raw request body — parsing it as JSON first
  // (even just to re-stringify) would invalidate the signature, so this
  // reads the raw text rather than request.json().
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      if (isKvConfigured()) {
        const claimed = await kv.set(`stripe-order-logged:${session.id}`, '1', {
          nx: true,
          ex: PROCESSED_TTL_SECONDS,
        });
        if (claimed !== 'OK' && claimed !== true) {
          // Already logged this Checkout Session — Stripe redelivered the event.
          return NextResponse.json({ ok: true, duplicate: true });
        }
      }

      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
      const details = lineItems.data
        .map((li) => `${li.description} × ${li.quantity} — ${formatAmount(li.amount_total, session.currency)}`)
        .join('\n');

      const shipping = session.shipping_details;
      const address = shipping?.address
        ? formatAddress(shipping.name || session.customer_details?.name, shipping.address)
        : 'Local pickup — Tarneit, VIC';

      const totalPayment = (session.amount_total || 0) / 100;
      const shippingCost = (session.shipping_cost?.amount_total || 0) / 100;

      await appendToSheet({
        type: 'Order',
        name: session.customer_details?.name || '',
        email: session.customer_details?.email || '',
        phone: session.customer_details?.phone || '',
        address,
        details,
        paymentStatus: 'Paid (Stripe, website order)',
        totalPayment,
        shippingCost,
        // Stripe Checkout always collects full payment upfront (no partial
        // deposits), so the advance equals the total and Remaining Balance
        // (a formula already sitting in column M) comes out to 0 on its own.
        advancePayment: totalPayment,
        paymentMethod: 'Stripe',
      });
    } catch (err) {
      // Logging to the sheet is best-effort — never make Stripe retry (and
      // risk a duplicate row later) just because the sheet sync hiccuped.
      console.error('Could not log Stripe order to Google Sheet:', err);
    }
  }

  return NextResponse.json({ received: true });
}

function formatAmount(cents, currency) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: (currency || 'aud').toUpperCase(),
  }).format((cents || 0) / 100);
}

function formatAddress(name, address) {
  return [
    name,
    address.line1,
    address.line2,
    [address.city, address.state, address.postal_code].filter(Boolean).join(' '),
    address.country,
  ]
    .filter(Boolean)
    .join('\n');
}
