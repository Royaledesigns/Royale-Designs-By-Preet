import { NextResponse } from 'next/server';
import { getAllProductsAdmin, upsertProduct, publishRank } from '@/lib/catalog';

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
    const record = await upsertProduct(body);
    return NextResponse.json({ product: record });
  } catch (err) {
    console.error('Product save failed:', err);
    return NextResponse.json({ error: err.message || 'Could not save product.' }, { status: 500 });
  }
}
