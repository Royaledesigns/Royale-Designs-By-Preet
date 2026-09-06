import { NextResponse } from 'next/server';
import { getAllProductsAdmin, upsertProduct } from '@/lib/catalog';
import { isKvConfigured } from '@/lib/kv';
import { isBlobConfigured, rehostImage } from '@/lib/blob';

// Pulls your most recent Instagram posts (photos and videos) and creates a
// draft product for any that aren't already in the catalog. Nothing here
// goes live — drafts sit in the dashboard until you add a price and hit
// Publish. Call this from the admin dashboard's "Check Instagram" button
// (there's no live push from Instagram — this is a manual/on-open check).
export async function POST() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: 'INSTAGRAM_ACCESS_TOKEN is not set yet — see README for setup steps.' },
      { status: 500 }
    );
  }
  if (!isKvConfigured()) {
    return NextResponse.json(
      { error: 'The product database isn’t connected yet — connect KV in Vercel first.' },
      { status: 500 }
    );
  }

  try {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    const url = `https://graph.instagram.com/me/media?fields=${fields}&limit=15&access_token=${token}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Instagram sync error:', res.status, errBody);
      return NextResponse.json({ error: 'Could not reach Instagram right now.' }, { status: 502 });
    }

    const data = await res.json();
    const posts = data.data || [];

    const existing = await getAllProductsAdmin();
    const seenIds = new Set(existing.map((p) => p.instagramMediaId).filter(Boolean));

    const added = [];
    for (const item of posts) {
      if (seenIds.has(item.id)) continue;
      const image = item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url;
      if (!image) continue;

      const captionFirstLine = (item.caption || '').split('\n')[0].trim();
      const title = captionFirstLine
        ? captionFirstLine.slice(0, 70)
        : `New piece — ${new Date(item.timestamp).toLocaleDateString('en-AU')}`;

      // Copy the photo into permanent storage when available, so it doesn't
      // stop loading once Instagram's signed URL expires. If Blob isn't
      // connected yet, fall back to Instagram's URL rather than failing.
      let finalImage = image;
      if (isBlobConfigured()) {
        try {
          finalImage = await rehostImage(image, item.id);
        } catch (err) {
          console.error('Image re-host failed, using Instagram URL for now:', err);
        }
      }

      const record = await upsertProduct({
        title,
        description: item.caption || '',
        image: finalImage,
        category: null,
        price: null,
        customStitch: true,
        status: 'draft',
        source: 'instagram',
        instagramMediaId: item.id,
        instagramPermalink: item.permalink,
      });
      added.push(record);
    }

    return NextResponse.json({ added: added.length, products: added });
  } catch (err) {
    console.error('Instagram sync failed:', err);
    return NextResponse.json({ error: 'Could not sync Instagram posts.' }, { status: 500 });
  }
}
