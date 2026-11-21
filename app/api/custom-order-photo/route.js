import { NextResponse } from 'next/server';
import { isBlobConfigured, uploadImage } from '@/lib/blob';

// Public endpoint (no admin auth) that lets a customer attach a reference
// photo — a screenshot of an outfit they want recreated, a saved Instagram
// post, etc. — from the "Custom Made For You" measurements form. Stored the
// same way product photos are (Vercel Blob), so it needs no extra setup
// beyond what's already connected for the admin dashboard's photo uploads.
//
// Deliberately smaller size cap and no auth, since this is reachable by
// anyone on the public site — large enough for a phone screenshot, small
// enough to discourage abuse.

export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024; // 8MB — comfortably covers a phone screenshot or saved photo

export async function POST(request) {
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: "Photo uploads aren't available right now — please describe the outfit in the notes instead." },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No photo was received.' }, { status: 400 });
    }

    const looksLikeImage =
      (file.type && file.type.startsWith('image/')) || /\.(heic|heif)$/i.test(file.name || '');
    if (!looksLikeImage) {
      return NextResponse.json({ error: 'Please choose an image file.' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'That photo is too large (max 8MB).' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadImage(buffer, file.type, 'custom-order', file.name);
    return NextResponse.json({ url });
  } catch (err) {
    console.error('Custom order photo upload failed:', err);
    return NextResponse.json(
      { error: 'Could not upload that photo — please try again.' },
      { status: 500 }
    );
  }
}
