// Single source of truth for the product catalog.
//
// Until KV is connected (see lib/kv.js), everything here quietly falls back
// to the static catalog in data/products.js, so the storefront works exactly
// as before with zero setup. Once KV is connected, the static list is
// seeded into KV once (as published/manual products) and from then on KV is
// the live catalog — new products added through /admin/products (including
// ones pulled in from Instagram) show up immediately, no redeploy needed.

import { kv, isKvConfigured } from './kv';
import {
  categories as staticCategories,
  products as staticProducts,
  ALL_SIZES,
} from '@/data/products';

const INDEX_KEY = 'products:index';
const SEEDED_KEY = 'catalog:seeded';

function productKey(id) {
  return `product:${id}`;
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

// One-time migration of the hand-written catalog into KV, so existing
// products keep working once you connect KV — you never have to re-enter
// them by hand.
async function seedIfNeeded() {
  const alreadySeeded = await kv.get(SEEDED_KEY);
  if (alreadySeeded) return;

  const now = Date.now();
  for (let i = 0; i < staticProducts.length; i++) {
    const p = staticProducts[i];
    const record = {
      id: p.handle,
      handle: p.handle,
      title: p.title,
      category: p.category,
      price: p.price,
      currency: p.currency || 'AUD',
      description: p.description,
      image: p.image,
      tags: p.tags || [],
      occasion: p.occasion || [],
      customStitch: true,
      availableSizes: p.availableSizes || ALL_SIZES,
      soldOut: p.soldOut || false,
      status: 'published',
      source: 'manual',
      instagramMediaId: null,
      instagramPermalink: null,
      // Spread seed timestamps out, oldest first, so original catalog order
      // is preserved once sorted by createdAt.
      createdAt: now - (staticProducts.length - i) * 1000,
      updatedAt: now,
    };
    await kv.set(productKey(record.id), record);
    await kv.sadd(INDEX_KEY, record.id);
  }
  await kv.set(SEEDED_KEY, '1');
}

async function readAllFromKv() {
  await seedIfNeeded();
  const ids = await kv.smembers(INDEX_KEY);
  if (!ids || ids.length === 0) return [];
  const records = await Promise.all(ids.map((id) => kv.get(productKey(id))));
  return records.filter(Boolean).sort((a, b) => a.createdAt - b.createdAt);
}

function staticAsRecords() {
  const now = Date.now();
  return staticProducts.map((p, i) => ({
    id: p.handle,
    handle: p.handle,
    title: p.title,
    category: p.category,
    price: p.price,
    currency: p.currency || 'AUD',
    description: p.description,
    image: p.image,
    tags: p.tags || [],
    occasion: p.occasion || [],
    customStitch: true,
    availableSizes: p.availableSizes || ALL_SIZES,
    soldOut: p.soldOut || false,
    status: 'published',
    source: 'manual',
    instagramMediaId: null,
    instagramPermalink: null,
    createdAt: now - (staticProducts.length - i) * 1000,
    updatedAt: now,
  }));
}

// Returns EVERY product (drafts included) — used by the admin dashboard.
export async function getAllProductsAdmin() {
  if (!isKvConfigured()) return staticAsRecords();
  try {
    return await readAllFromKv();
  } catch (err) {
    console.error('KV read failed, falling back to static catalog:', err);
    return staticAsRecords();
  }
}

// Returns only published products — used by the public storefront.
export async function getAllProducts() {
  const all = await getAllProductsAdmin();
  return all.filter((p) => p.status === 'published');
}

export async function getProduct(handle) {
  const all = await getAllProducts();
  return all.find((p) => p.handle === handle) || null;
}

export async function getProductsByCategory(slug) {
  const all = await getAllProducts();
  return all.filter((p) => p.category === slug);
}

export function getCategory(slug) {
  return staticCategories.find((c) => c.slug === slug);
}

export function getCategories() {
  return staticCategories;
}

// --- Admin write operations (require KV) ---

export async function upsertProduct(input) {
  if (!isKvConfigured()) {
    throw new Error('KV is not connected yet — see README for setup steps.');
  }
  const now = Date.now();
  const isNew = !input.id;
  const id = input.id || slugify(input.title || `piece-${now}`);
  const existing = isNew ? null : await kv.get(productKey(id));

  const record = {
    id,
    handle: id,
    title: input.title,
    category: input.category || null,
    price: input.price === '' || input.price == null ? null : Number(input.price),
    currency: 'AUD',
    description: input.description || '',
    image: input.image,
    tags: input.tags || existing?.tags || [],
    occasion: input.occasion || existing?.occasion || [],
    customStitch: input.customStitch !== undefined ? Boolean(input.customStitch) : true,
    // Which sizes are actually made/in stock for this piece, and how many.
    // Shape is { size: quantity }, e.g. { M: 2, L: 3 } — the rest fall back
    // to a custom stitch automatically. (Older records may still have this
    // as a plain array of size strings with no quantity — see
    // data/products.js's getSizeStock, which reads either shape.) Defaults
    // to none — most pieces are only made in 1-2 sizes, so the admin enters
    // the real ready-made counts explicitly rather than everything showing
    // as available by default.
    availableSizes:
      input.availableSizes && typeof input.availableSizes === 'object'
        ? input.availableSizes
        : existing?.availableSizes || {},
    soldOut: input.soldOut !== undefined ? Boolean(input.soldOut) : existing?.soldOut || false,
    status: input.status || existing?.status || 'draft',
    source: input.source || existing?.source || 'manual',
    instagramMediaId: input.instagramMediaId ?? existing?.instagramMediaId ?? null,
    instagramPermalink: input.instagramPermalink ?? existing?.instagramPermalink ?? null,
    // Instagram's API occasionally hands back the wrong post's permalink
    // (seen with collab/repost posts) — rather than trust it blindly, the
    // storefront only deep-links to a specific post once someone in the
    // admin dashboard has actually opened it and confirmed it's right.
    // Until then it safely falls back to the main Instagram profile link.
    instagramLinkVerified: Boolean(input.instagramLinkVerified),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await kv.set(productKey(id), record);
  await kv.sadd(INDEX_KEY, id);
  return record;
}

// Called once a Stripe payment actually succeeds (from the webhook) to take
// one size's ready-made stock down by however many were bought. Quietly
// does nothing if KV isn't connected, the product can't be found, or that
// size isn't stock-tracked (a legacy "unlimited" array, or a size like
// "Custom (contact us for measurements)" / "One Size" that was never in the
// stock map to begin with) — none of those are errors, just nothing to
// decrement. This is a plain read-then-write rather than an atomic Redis
// decrement, which is fine at this shop's order volume, but in theory two
// orders for the very last piece in a size, seconds apart, could both go
// through before either write lands.
export async function decrementSizeStock(handle, size, qty) {
  if (!isKvConfigured() || !handle || !size) return;
  try {
    const existing = await kv.get(productKey(handle));
    if (!existing) return;
    const stock = existing.availableSizes;
    if (!stock || Array.isArray(stock) || !(size in stock)) return;
    const current = Number(stock[size]) || 0;
    if (current <= 0) return;
    const next = Math.max(0, current - (Number(qty) || 1));
    await kv.set(productKey(handle), {
      ...existing,
      availableSizes: { ...stock, [size]: next },
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error('Could not decrement size stock:', handle, size, err);
  }
}

export async function deleteProduct(id) {
  if (!isKvConfigured()) {
    throw new Error('KV is not connected yet — see README for setup steps.');
  }
  await kv.del(productKey(id));
  await kv.srem(INDEX_KEY, id);
}
