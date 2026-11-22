import { NextResponse } from 'next/server';
import { appendToSheet } from '@/lib/google-sheet';

// Logs a lightweight "someone clicked through to contact us" moment to the
// same Google Sheet that Contact Form / Newsletter Signup / Measurements
// Form submissions already land in (see app/api/contact/route.js) — so all
// of your "did this visitor try to reach me" signals end up in one place
// you can actually look at, for free.
//
// This exists specifically for the WhatsApp buttons (header, product
// pages, custom-measurements page): clicking one just opens WhatsApp
// directly, so unlike a form submission there's no server request to hang
// this off of — the click itself is the only moment this ever happens, so
// the button fires this in the background without waiting for it or
// blocking the WhatsApp link from opening.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { event, ...details } = body;

  if (!event) {
    return NextResponse.json({ error: 'An event name is required.' }, { status: 400 });
  }

  await appendToSheet({ type: event, details: JSON.stringify(details) });

  return NextResponse.json({ ok: true });
}
