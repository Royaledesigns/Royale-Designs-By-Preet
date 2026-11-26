import { NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';
import { getAllProductsAdmin } from '@/lib/catalog';
import { isBlobConfigured } from '@/lib/blob';

// One-time (and safely re-runnable) cleanup for the duplicate-photo buildup
// that filled up Blob storage: before the sync-instagram lock fix, clicking
// "Check Instagram" more than once while a previous check was still running
// made each overlapping run independently re-host the same not-yet-saved
// post's photo, leaving the earlier copy orphaned in storage forever (see
// lib/blob.js and sync-instagram/route.js for the rest of that fix).
//
// Only ever deletes a file that is BOTH of these:
//   1. Named like an Instagram re-host: "products/<numeric Instagram media
//      id>-<timestamp>.<ext>" — never a manual admin upload ("product-...")
//      or a customer-submitted measurement/reference photo
//      ("custom-order-..."), since those aren't implicated in this bug and
//      could be the only copy of something a customer sent in or an
//      in-progress draft.
//   2. Not the `image` URL of ANY current product (published or draft) —
//      i.e. definitely not what any live or in-progress product page is
//      actually showing.
// Call it with no body. Protected automatically by proxy.js's
// /api/admin/:path* matcher, same as every other admin endpoint.
export const maxDuration = 60;

// Matches "products/<digits>-<rest>" — the filename shape rehostImage()
// produces (see lib/blob.js: `${safeHint}-${Date.now()}.${ext}`, where
// safeHint is the Instagram media id for synced posts).
const INSTAGRAM_REHOST_NAME = /^products\/\d+-/;

export async function POST() {
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: 'Photo storage isn’t connected yet — see README.md.' },
      { status: 400 }
    );
  }

  try {
    const products = await getAllProductsAdmin();
    const inUse = new Set(products.map((p) => p.image).filter(Boolean));

    let cursor;
    let totalScanned = 0;
    let freedBytes = 0;
    const deletedUrls = [];

    do {
      const page = await list({ prefix: 'products/', cursor, limit: 1000 });
      totalScanned += page.blobs.length;

      const orphans = page.blobs.filter(
        (b) => INSTAGRAM_REHOST_NAME.test(b.pathname) && !inUse.has(b.url)
      );

      // Delete in small batches rather than one call per file, and rather
      // than one giant call for the whole store.
      for (let i = 0; i < orphans.length; i += 50) {
        const batch = orphans.slice(i, i + 50);
        await del(batch.map((b) => b.url));
        for (const b of batch) {
          freedBytes += b.size || 0;
          deletedUrls.push(b.url);
        }
      }

      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    return NextResponse.json({
      totalScanned,
      deleted: deletedUrls.length,
      freedBytes,
      deletedUrls,
    });
  } catch (err) {
    console.error('Blob cleanup failed:', err);
    return NextResponse.json({ error: err.message || 'Could not clean up photo storage.' }, { status: 500 });
  }
}
