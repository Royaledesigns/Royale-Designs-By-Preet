import { NextResponse } from 'next/server';
import { isBlobConfigured, uploadImage } from '@/lib/blob';

// Lets the admin dashboard's "Upload photo" button (used for adding a
// product straight from a photo on your phone or computer) store the image
// permanently. Protected automatically by proxy.js's /api/admin/:path*
// matcher, same as every other admin endpoint.

export const runtime = 'nodejs';

const MAX_BYTES = 20 * 1024 * 1024; // 20MB — comfortably covers a full-res iPhone photo

export async function POST(request) {
  if (!isBlobConfigured()) {
    return NextResponse.json(
      {
        error:
          "Photo storage isn't connected yet. In Vercel: Storage → Create Database → Blob, then connect it to this project — see README.md.",
      },
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
      return NextResponse.json({ error: 'That photo is too large (max 20MB).' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadImage(buffer, file.type, 'product', file.name);
    return NextResponse.json({ url });
  } catch (err) {
    console.error('Photo upload failed:', err);
    return NextResponse.json(
      { error: 'Could not upload that photo — please try again.' },
      { status: 500 }
    );
  }
}
