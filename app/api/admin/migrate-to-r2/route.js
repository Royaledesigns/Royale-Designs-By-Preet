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
// manually-set external URL is left untouched.
//
// Vercel Blob's free-tier "Limits Exceeded" lockout blocks ALL data
// transfer from the store until it resets (see lib/blob.js's file header) —
// including downloading a photo in order to migrate it. For a product
// whose photo originally came from Instagram (the vast majority of this
// catalog), there's a way around that: Instagram still has the original
// photo, so instead of downloading the (blocked) Vercel Blob copy, this
// re-fetches a fresh, temporary media URL straight from Instagram's own
// API using the post's own media id (stored on the product since the day
// it was synced — see instagramMediaId below) and re-hosts THAT to R2
// instead, never touching the blocked Blob store at all. A product with no
// Instagram media id (an admin's own manual upload, or an Instagram post
// whose media id Instagram no longer recognises) has no such fallback —
// if its only copy is a blocked Blob URL, it's reported in
// `blockedNoFallback` and left untouched rather than retried forever; see
// the pending-list ordering below for why that doesn't stall everything
// else.
export const runtime = 'nodejs';
export const maxDuration = 60;

const BLOB_URL_PATTERN = /\.public\.blob\.vercel-storage\.com\//;
const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 30;

async function freshInstagramUrl(mediaId) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://graph.instagram.com/${mediaId}?fields=media_type,media_url,thumbnail_url&access_token=${token}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data.media_type === 'VIDEO' ? data.thumbnail_url : data.media_url) || null;
  } catch {
    return null;
  }
}

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
    // Items with an Instagram media id (the ones we have a real fallback
    // for) go first, so a run never spends its whole batch re-failing on
    // the same handful of hopeless manual uploads while fixable products
    // further down the list never get a turn.
    const pending = all
      .filter((p) => typeof p.image === 'string' && BLOB_URL_PATTERN.test(p.image))
      .sort((a, b) => (b.instagramMediaId ? 1 : 0) - (a.instagramMediaId ? 1 : 0));

    const batch = pending.slice(0, limit);
    const migrated = [];
    const errors = [];
    const blockedNoFallback = [];

    for (const product of batch) {
      let sourceUrl = product.image;
      let viaInstagram = false;
      try {
        if (product.instagramMediaId) {
          const fresh = await freshInstagramUrl(product.instagramMediaId);
          if (fresh) {
            sourceUrl = fresh;
            viaInstagram = true;
          }
        }

        const newUrl = await rehostImage(sourceUrl, product.id);
        await patchProductFields(product.id, { image: newUrl });
        migrated.push({ id: product.id, from: product.image, to: newUrl, viaInstagram });
      } catch (err) {
        const message = err.message || String(err);
        if (!viaInstagram && !product.instagramMediaId) {
          blockedNoFallback.push({ id: product.id, error: message });
        } else {
          console.error(`Could not migrate photo for product ${product.id}:`, err);
          errors.push({ id: product.id, error: message, triedInstagram: Boolean(product.instagramMediaId) });
        }
      }
    }

    return NextResponse.json({
      totalPending: pending.length,
      migratedThisRun: migrated.length,
      remaining: pending.length - migrated.length,
      migrated,
      errors,
      blockedNoFallback,
    });
  } catch (err) {
    console.error('R2 migration failed:', err);
    return NextResponse.json({ error: err.message || 'Migration failed.' }, { status: 500 });
  }
}
