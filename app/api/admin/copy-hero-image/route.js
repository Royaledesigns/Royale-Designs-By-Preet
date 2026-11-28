import { NextResponse } from 'next/server';
import { copyImage } from '@/lib/blob';

// One-off helper: gives a photo already in our image storage its own
// permanent copy under site/ (a fixed, human-readable key), so it can be
// used as a homepage/site asset without being tied to a product — a
// product's photo is deleted from storage whenever it's replaced or removed
// (see app/api/admin/products/route.js), which would otherwise break
// anything else pointing at it. The copy happens inside storage; nothing is
// downloaded or re-encoded.
//
// POST /api/admin/copy-hero-image
// body: { "sourceUrl": "https://images.royaledesigns.com.au/products/....jpg",
//         "destKey": "site/hero-jewellery.jpg" }   // destKey optional, must start with "site/"
//
// Protected by proxy.js's /api/admin/:path* matcher like every admin route.
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { sourceUrl, destKey = 'site/hero-jewellery.jpg' } = await request.json();
    if (typeof sourceUrl !== 'string' || !sourceUrl) {
      return NextResponse.json({ error: 'sourceUrl is required.' }, { status: 400 });
    }
    if (!/^site\/[a-z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(destKey)) {
      return NextResponse.json(
        { error: 'destKey must look like site/some-name.jpg.' },
        { status: 400 }
      );
    }
    const url = await copyImage(sourceUrl, destKey);
    return NextResponse.json({ url });
  } catch (err) {
    console.error('copy-hero-image failed:', err);
    return NextResponse.json({ error: err.message || 'Could not copy that image.' }, { status: 500 });
  }
}
