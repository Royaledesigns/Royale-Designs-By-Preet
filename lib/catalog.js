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
    // Which sizes are actually made/in stock for this piece. Defaults to
    // none — most pieces are only made in 1-2 sizes, with the rest ordered
    // as a custom stitch, so the admin picks the ready sizes explicitly
    // rather than everything showing as available by default.
    availableSizes: Array.isArray(input.availableSizes)
      ? input.availableSizes
      : existing?.availableSizes || [],
    soldOut: input.soldOut !== undefined ? Boolean(input.soldOut) : existing?.soldOut || false,
    status: input.status || existing?.status || 'draft',
    source: input.source || existing?.source || 'manual',
    instagramMediaId: input.instagramMediaId ?? existing?.instagramMediaId ?? null,
    instagramPermalink: input.instagramPermalink ?? existing?.instagramPermalink ?? null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await kv.set(productKey(id), record);
  await kv.sadd(INDEX_KEY, id);
  return record;
}

export async function deleteProduct(id) {
  if (!isKvConfigured()) {
    throw new Error('KV is not connected yet — see README for setup steps.');
  }
  await kv.del(productKey(id));
  await kv.srem(INDEX_KEY, id);
}
