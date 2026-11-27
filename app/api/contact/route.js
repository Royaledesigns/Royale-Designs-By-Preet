import { NextResponse } from 'next/server';
import { addSubscriber } from '@/lib/subscribers';
import { appendToSheet } from '@/lib/google-sheet';

// Handles the Contact page form, the footer newsletter signup, the
// custom-measurements form on the Custom Tailoring page, and the Order
// Details form (for a customer who's already agreed to buy something over
// Instagram/WhatsApp DMs and just needs to hand over delivery details).
// If RESEND_API_KEY is set, emails are sent via Resend (https://resend.com).
// Otherwise submissions are just logged server-side so nothing is lost while
// you're still setting email delivery up — wire in your preferred provider
// (Resend, SendGrid, Postmark, etc.) here when you're ready.
//
// Newsletter signups are additionally saved to the customer database (see
// lib/subscribers.js + /admin/subscribers) — that's the one submission type
// here that represents someone you'll want to look back up later, rather
// than a one-off message. Newsletter signups, contact messages, measurements,
// and order details are also synced to your Google Sheet if
// GOOGLE_SHEET_WEBHOOK_URL is set (see README.md "Google Sheet customer
// sync") — completed orders sync there too, from
// app/api/webhooks/stripe/route.js.
export async function POST(request) {
  const body = await request.json();
  const {
    type = 'contact',
    name = '',
    email = '',
    message,
    phone = '',
    address = '',
    channel = '',
    item = '',
    notes = '',
  } = body;

  // Every other submission type needs an email to reply to — but someone
  // confirming an order they already agreed to over DM may not have (or
  // want to share) one just to give you their shipping address.
  if (!email && type !== 'order-details') {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  if (type === 'newsletter') {
    try {
      await addSubscriber({ email, name });
    } catch (err) {
      // Don't let a database hiccup block the signup confirmation — the
      // email notification below is still the fallback record.
      console.error('Could not save newsletter subscriber:', err);
    }
    await appendToSheet({ type: 'Newsletter Signup', name, email });
  } else if (type === 'contact') {
    await appendToSheet({ type: 'Contact Form', name, email, details: message });
  } else if (type === 'measurements') {
    // This is a real custom order taking shape (measurements + delivery
    // address), not just a page view — log it as an order row with phone
    // and address filled in, under whichever Type the customer picked
    // (WhatsApp Order / Instagram / Walk-in / Other) so it sits in the
    // Orders sheet alongside everything else, ready for you to add
    // pricing and payment status once that's agreed.
    await appendToSheet({ type: channel || 'Measurements Form', name, email, phone, address, details: message });
  } else if (type === 'order-details') {
    // A sale already agreed in chat — just delivery details and what was
    // ordered, logged under whichever Type the customer picked so it sits
    // in the Orders sheet ready for you to add pricing and payment status.
    const details = [item ? `Order: ${item}` : null, notes ? `Notes: ${notes}` : null]
      .filter((line) => line !== null)
      .join('\n\n');
    await appendToSheet({ type: channel || 'Order Details', name, email, phone, address, details });
  }

  const toEmail = process.env.CONTACT_TO_EMAIL || 'prabhpreet.maan@yahoo.com';
  const apiKey = process.env.RESEND_API_KEY;

  let subject;
  let text;
  if (type === 'newsletter') {
    subject = 'New newsletter signup';
    text = `New newsletter signup: ${email}`;
  } else if (type === 'measurements') {
    subject = `New custom measurements from ${name || email}`;
    text = `From: ${name} <${email}>\n\n${message}`;
  } else if (type === 'order-details') {
    subject = `New order confirmation from ${name}`;
    text = [
      `Name: ${name}`,
      `Phone: ${phone}`,
      email ? `Email: ${email}` : null,
      `Delivery Address: ${address}`,
      '',
      `Order: ${item}`,
      notes ? `Notes: ${notes}` : null,
    ]
      .filter((line) => line !== null)
      .join('\n');
  } else {
    subject = `New contact form message from ${name || email}`;
    text = `From: ${name} <${email}>\n\n${message}`;
  }

  if (!apiKey) {
    console.log(`[contact route] ${subject}\n${text}`);
    return NextResponse.json({ ok: true, delivered: false });
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Royale Designs Website <noreply@royaledesigns.com.au>',
        to: toEmail,
        ...(email ? { reply_to: email } : {}),
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Resend error:', errText);
      return NextResponse.json({ error: 'Could not send message.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, delivered: true });
  } catch (err) {
    console.error('Contact route error:', err);
    return NextResponse.json({ error: 'Could not send message.' }, { status: 500 });
  }
}
