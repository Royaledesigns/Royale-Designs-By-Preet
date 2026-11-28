import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAllProductsAdmin, upsertProduct, publishRank } from '@/lib/catalog';
import { deleteImage } from '@/lib/blob';

export async function GET() {
  const products = await getAllProductsAdmin();
  // Most-recently published on top (drafts fall back to when they were
  // created, since they have no publishedAt yet).
  products.sort((a, b) => publishRank(b) - publishRank(a));
  return NextResponse.json({ products });
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.title || !body.image) {
      return NextResponse.json({ error: 'A title and image are required.' }, { status: 400 });
    }
    if (body.status === 'published' && (body.price === '' || body.price == null || !body.category)) {
      return NextResponse.json(
        { error: 'A price and category are required before publishing.' },
        { status: 400 }
      );
    }
    const hasSizes = Array.isArray(body.availableSizes)
      ? body.availableSizes.length > 0
      : Boolean(
          body.availableSizes &&
            typeof body.availableSizes === 'object' &&
            Object.values(body.availableSizes).some((qty) => Number(qty) > 0)
        );
    if (body.status === 'published' && !body.soldOut && !hasSizes && body.customStitch === false) {
      return NextResponse.json(
        {
          error:
            'Mark at least one size as available, or leave custom stitch on, before publishing.',
        },
        { status: 400 }
      );
    }
    // Grabbed before the upsert so there's something to compare the new
    // photos against — upsertProduct itself only ever sees the new values.
    // Covers the main photo and any extras.
    const previous = body.id ? (await getAllProductsAdmin()).find((p) => p.id === body.id) : null;
    const previousImages = previous ? [previous.image, ...(previous.extraImages || [])] : [];

    const record = await upsertProduct(body);
    // Pages are cached for 5 minutes (see app/page.js etc.) to keep database
    // reads down — without this, a price/title/photo edit here wouldn't show
    // up on the live site until that cache window happened to expire. This
    // forces an immediate refresh of just the pages this product can appear
    // on, right when it's actually saved, instead of waiting on the timer.
    revalidatePath('/', 'layout');

    // A photo was swapped or removed — the old file is no longer used by
    // anything, so delete it rather than leaving it in storage forever
    // (previously nothing ever did this, which is the main reason storage
    // usage crept up over time). Anything still in use on this product
    // (e.g. an old main photo that was just moved into the extras) is kept.
    // Done after the save succeeds, and never allowed to fail the request
    // itself.
    const stillUsed = new Set([record.image, ...(record.extraImages || [])]);
    for (const url of previousImages) {
      if (url && !stillUsed.has(url)) {
        // deleteImage never throws (see lib/blob.js) — awaited so the
        // delete actually runs before this serverless function exits, not
        // left as a dangling promise.
        await deleteImage(url);
      }
    }

    return NextResponse.json({ product: record });
  } catch (err) {
    console.error('Product save failed:', err);
    return NextResponse.json({ error: err.message || 'Could not save product.' }, { status: 500 });
  }
}
