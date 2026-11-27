import { NextResponse } from 'next/server';
import { getAllProductsAdmin, patchProductFields } from '@/lib/catalog';
import { isBlobConfigured, rehostImage } from '@/lib/blob';

// One-time (and safely re-runnable) migration of product photos from
// Vercel Blob to Cloudflare R2 — see lib/blob.js's file header for why.
// Processes a bounded batch of not-yet-migrated products per call (so one
// invocation comfortably fits inside the function time limit) instead of
// everything in a single request. Call it repeatedly until `remaining` is
// 0 — e.g. from the browser console on an already-authenticated /admin
// page:
//   let r; do { r = await (await fetch('/api/admin/migrate-to-r2', { method: 'POST' })).json(); console.log(r); } while (r.remaining > 0);
//
// Only ever touches a product whose `image` is still a Vercel Blob URL —
// anything already on R2, still an un-rehosted Instagram CDN URL, or a
// manually-set external URL is left untouched. A product that fails to
// migrate (source photo no longer reachable, say) is reported in `errors`
// and simply retried on the next call, since its `image` field hasn't
// changed.
export const runtime = 'nodejs';
export const maxDuration = 60;

const BLOB_URL_PATTERN = /\.public\.blob\.vercel-storage\.com\//;
const DEFAULT_BATCH_SIZE = 12;
const MAX_BATCH_SIZE = 50;

export async function POST(request) {
  if (!isBlobConfigured()) {
    return NextResponse.json(
      {
        error:
          'R2 isn’t configured yet — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME and R2_PUBLIC_URL in Vercel, then redeploy.',
      },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get('limit'));
  const limit = Math.min(requested > 0 ? requested : DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE);

  try {
    const all = await getAllProductsAdmin();
    const pending = all.filter(
      (p) => typeof p.image === 'string' && BLOB_URL_PATTERN.test(p.image)
    );

    const batch = pending.slice(0, limit);
    const migrated = [];
    const errors = [];

    for (const product of batch) {
      try {
        const newUrl = await rehostImage(product.image, product.id);
        await patchProductFields(product.id, { image: newUrl });
        migrated.push({ id: product.id, from: product.image, to: newUrl });
      } catch (err) {
        console.error(`Could not migrate photo for product ${product.id}:`, err);
        errors.push({ id: product.id, error: err.message || String(err) });
      }
    }

    return NextResponse.json({
      totalPending: pending.length,
      migratedThisRun: migrated.length,
      remaining: pending.length - migrated.length,
      migrated,
      errors,
    });
  } catch (err) {
    console.error('R2 migration failed:', err);
    return NextResponse.json({ error: err.message || 'Migration failed.' }, { status: 500 });
  }
}
