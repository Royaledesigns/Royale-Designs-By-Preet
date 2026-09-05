import { NextResponse } from 'next/server';

// Handles the Contact page form, the footer newsletter signup, and the
// custom-measurements form on the Custom Tailoring page.
// If RESEND_API_KEY is set, emails are sent via Resend (https://resend.com).
// Otherwise submissions are just logged server-side so nothing is lost while
// you're still setting email delivery up — wire in your preferred provider
// (Resend, SendGrid, Postmark, etc.) here when you're ready.
export async function POST(request) {
  const body = await request.json();
  const { type = 'contact', name = '', email, message } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const toEmail = process.env.CONTACT_TO_EMAIL || 'prabhpreet.maan@yahoo.com';
  const apiKey = process.env.RESEND_API_KEY;

  const subject =
    type === 'newsletter'
      ? 'New newsletter signup'
      : type === 'measurements'
        ? `New custom measurements from ${name || email}`
        : `New contact form message from ${name || email}`;
  const text =
    type === 'newsletter'
      ? `New newsletter signup: ${email}`
      : `From: ${name} <${email}>\n\n${message}`;

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
        from: 'Royale Designs Website <onboarding@resend.dev>',
        to: toEmail,
        reply_to: email,
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
