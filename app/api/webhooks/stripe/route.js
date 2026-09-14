import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { appendToSheet } from '@/lib/google-sheet';

// Stripe calls this endpoint directly (server-to-server) the moment an
// order is actually paid — this is what lets a completed order sync to
// the Google Sheet reliably, unlike hooking into the success page, which
// only runs if the shopper's browser actually finishes loading it. See
// README.md "Google Sheet customer sync" for how to point Stripe at this
// URL and get the signing secret.
export async function POST(request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    console.error('Stripe webhook received but STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET is not set.');
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });

  // Signature verification needs the exact raw request body — reading it
  // as text (not request.json()) keeps it byte-for-byte as Stripe sent it.
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
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
      const itemsSummary = lineItems.data.map((li) => `${li.quantity}× ${li.description}`).join(', ');

      const details = session.customer_details || {};
      const addr = details.address || {};
      const address = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country]
        .filter(Boolean)
        .join(', ');

      await appendToSheet({
        type: 'Order',
        name: details.name || '',
        email: details.email || '',
        phone: details.phone || '',
        address,
        details: `${itemsSummary} — total ${((session.amount_total || 0) / 100).toFixed(2)} ${(session.currency || 'aud').toUpperCase()}`,
      });
    } catch (err) {
      // Never fail the webhook response over a sheet-sync issue — Stripe
      // retries failed webhooks, which would just resend the same order
      // repeatedly for a problem that has nothing to do with the payment.
      console.error('Could not sync completed order to Google Sheet:', err);
    }
  }

  return NextResponse.json({ received: true });
}
