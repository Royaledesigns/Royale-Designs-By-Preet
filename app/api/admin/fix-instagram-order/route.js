import { NextResponse } from 'next/server';
import { kv, isKvConfigured } from '@/lib/kv';
import { getAllProductsAdmin } from '@/lib/catalog';

function productKey(id) {
  return `product:${id}`;
}

// One-time repair for drafts pulled in by earlier "Check Instagram" syncs —
// before the ordering fix, each draft's createdAt was stamped with
// whenever the sync loop happened to reach it, not the post's actual date,
// so a genuinely newer post could end up stamped older than one processed
// a moment before it and sink to the bottom of the Unpublished tab. This
// re-fetches each Instagram-sourced draft's real post timestamp and
// corrects createdAt to match, without touching anything else on the
// product (title, price, category, description are all left exactly as
// they are). Already-published products are skipped — they sort by
// publishedAt, which this bug never affected. Safe to run more than once;
// anything already correct is left alone.
export async function POST() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'INSTAGRAM_ACCESS_TOKEN is not set — can’t look up real post dates.' },
      { status: 500 }
    );
  }
  if (!isKvConfigured()) {
    return NextResponse.json({ error: 'KV is not connected yet.' }, { status: 500 });
  }

  const products = await getAllProductsAdmin();
  const targets = products.filter(
    (p) => p.status === 'draft' && p.source === 'instagram' && p.instagramMediaId
  );

  const fixed = [];
  const skipped = [];

  for (const p of targets) {
    try {
      const res = await fetch(
        `https://graph.instagram.com/${p.instagramMediaId}?fields=timestamp&access_token=${token}`,
        { cache: 'no-store' }
      );
      if (!res.ok) {
        skipped.push({ id: p.id, title: p.title, reason: `Instagram lookup failed (${res.status})` });
        continue;
      }
      const data = await res.json();
      if (!data.timestamp) {
        skipped.push({ id: p.id, title: p.title, reason: 'No timestamp returned' });
        continue;
      }
      const realCreatedAt = new Date(data.timestamp).getTime();
      if (realCreatedAt === p.createdAt) continue; // already correct, nothing to do

      const existing = await kv.get(productKey(p.id));
      if (!existing) {
        skipped.push({ id: p.id, title: p.title, reason: 'Record no longer exists' });
        continue;
      }
      await kv.set(productKey(p.id), { ...existing, createdAt: realCreatedAt });
      fixed.push({ id: p.id, title: p.title, oldCreatedAt: p.createdAt, newCreatedAt: realCreatedAt });
    } catch (err) {
      skipped.push({ id: p.id, title: p.title, reason: err.message || 'Unknown error' });
    }
  }

  return NextResponse.json({ fixed: fixed.length, skipped: skipped.length, details: { fixed, skipped } });
}
