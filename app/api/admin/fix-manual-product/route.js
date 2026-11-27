import { NextResponse } from 'next/server';
import { getAllProductsAdmin, patchProductFields } from '@/lib/catalog';
import { rehostImage } from '@/lib/blob';

// One-off helper for recovering the handful of manually-uploaded products
// that have no `instagramMediaId` on file (so the batch migrate-to-r2
// endpoint has no fallback for them) but whose original photo IS still up
// on Instagram. Give it a product id and a short, distinctive snippet of
// that Instagram post's caption; it pages through the account's own media
// via the Instagram Graph API (same call shape as sync-instagram), finds
// the post whose caption contains that snippet, re-hosts its photo to R2,
// and — like the main migration — records the matched media id on the
// product so future tooling can use the same fallback.
//
// POST /api/admin/fix-manual-product
// body: { "productId": "waterfall-necklace-set-with-heavy-passa", "captionIncludes": "Big Passa" }
//
// If more than one post matches the snippet, nothing is changed and every
// match is returned (narrow the snippet and try again). If none match,
// nothing is changed either.
//
// Alternatively, when the photo isn't on Instagram at all but is sitting
// somewhere else publicly reachable (e.g. one of this same site's own
// /images/*.jpg static assets, used elsewhere like the homepage hero),
// pass `sourceUrl` instead of `captionIncludes` to skip the Instagram
// search and just re-host that URL directly:
// body: { "productId": "hot-pink-embellished-punjabi-jutti", "sourceUrl": "https://www.royaledesigns.com.au/images/hero-pink-jutti-accent.jpg" }
export const runtime = 'nodejs';
export const maxDuration = 60;

const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
const PAGE_SIZE = 50;
const MAX_PAGES = 10; // up to 500 posts of history

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const { productId, captionIncludes, sourceUrl: directSourceUrl } = body || {};
  if (!productId || (!captionIncludes && !directSourceUrl)) {
    return NextResponse.json(
      { error: 'Both "productId" and either "captionIncludes" or "sourceUrl" are required.' },
      { status: 400 }
    );
  }

  // Direct-URL path: no Instagram search, no instagramMediaId recorded —
  // just re-host whatever's at that URL as this product's photo.
  if (directSourceUrl) {
    try {
      const all = await getAllProductsAdmin();
      const product = all.find((p) => p.id === productId);
      if (!product) {
        return NextResponse.json({ error: `No product with id "${productId}".` }, { status: 404 });
      }
      const newUrl = await rehostImage(directSourceUrl, productId);
      await patchProductFields(productId, { image: newUrl });
      return NextResponse.json({ applied: true, productId, sourceUrl: directSourceUrl, newUrl });
    } catch (err) {
      console.error('fix-manual-product (direct URL) failed:', err);
      return NextResponse.json({ error: err.message || 'Failed.' }, { status: 500 });
    }
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'INSTAGRAM_ACCESS_TOKEN isn’t configured.' }, { status: 400 });
  }

  const needle = String(captionIncludes).toLowerCase();
  const matches = [];

  try {
    let url = `https://graph.instagram.com/me/media?fields=${FIELDS}&limit=${PAGE_SIZE}&access_token=${token}`;
    let pages = 0;

    while (url && pages < MAX_PAGES) {
      const res = await fetch(url);
      if (!res.ok) {
        return NextResponse.json(
          { error: `Instagram API error (${res.status}) while paging media.` },
          { status: 502 }
        );
      }
      const data = await res.json();
      for (const item of data.data || []) {
        if ((item.caption || '').toLowerCase().includes(needle)) {
          matches.push({
            id: item.id,
            caption: (item.caption || '').slice(0, 140),
            permalink: item.permalink,
            timestamp: item.timestamp,
            media_type: item.media_type,
          });
        }
      }
      url = data.paging && data.paging.next ? data.paging.next : null;
      pages += 1;
    }

    if (matches.length === 0) {
      return NextResponse.json({ matchesFound: 0, applied: false, matches: [] });
    }
    if (matches.length > 1) {
      return NextResponse.json({ matchesFound: matches.length, applied: false, matches });
    }

    // Exactly one match — fetch its fresh media_url/thumbnail_url directly
    // (same single-item call the migration route uses) rather than trusting
    // the possibly-stale url from the listing page above.
    const matchId = matches[0].id;
    const freshRes = await fetch(
      `https://graph.instagram.com/${matchId}?fields=media_type,media_url,thumbnail_url&access_token=${token}`
    );
    if (!freshRes.ok) {
      return NextResponse.json(
        { error: `Instagram API error (${freshRes.status}) fetching matched media.`, matches },
        { status: 502 }
      );
    }
    const fresh = await freshRes.json();
    const sourceUrl = fresh.media_type === 'VIDEO' ? fresh.thumbnail_url : fresh.media_url;
    if (!sourceUrl) {
      return NextResponse.json(
        { error: 'Matched post has no usable image URL.', matches },
        { status: 502 }
      );
    }

    const all = await getAllProductsAdmin();
    const product = all.find((p) => p.id === productId);
    if (!product) {
      return NextResponse.json({ error: `No product with id "${productId}".`, matches }, { status: 404 });
    }

    const newUrl = await rehostImage(sourceUrl, productId);
    await patchProductFields(productId, { image: newUrl, instagramMediaId: matchId });

    return NextResponse.json({
      matchesFound: 1,
      applied: true,
      matches,
      productId,
      newUrl,
    });
  } catch (err) {
    console.error('fix-manual-product failed:', err);
    return NextResponse.json({ error: err.message || 'Failed.' }, { status: 500 });
  }
}
