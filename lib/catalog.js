// Single source of truth for the product catalog.
//
// Until KV is connected (see lib/kv.js), everything here quietly falls back
// to the static catalog in data/products.js, so the storefront works exactly
// as before with zero setup. Once KV is connected, the static list is
// seeded into KV once (as published/manual products) and from then on KV is
// the live catalog — new products added through /admin/products (including
// ones pulled in from Instagram) show up immediately, no redeploy needed.
//
// Storage shape: every product record lives in ONE JSON array under a
// single Redis key (CATALOG_KEY) — so reading the whole catalog is always
// exactly one Redis command, and so is saving it. Until September 2026 this
// instead kept one Redis key per product plus a separate index set, which
// meant a single page view (home, shop, a category, a product) cost
// 1 + (one per product) Redis commands just to read the catalog — on a
// catalog of any real size, with pages set to refresh every 30 seconds,
// that's enough commands to blow through Upstash's free-tier monthly quota
// in a single busy day (which is exactly what happened: a page needing a
// quota reset, happened to take off right when Google started crawling the
// freshly-submitted sitemap). This file migrates that old layout into the
// new one automatically, the first time it runs after the change — see
// migrateFromLegacyIfNeeded below — so nothing already in KV is lost.

import { kv, isKvConfigured } from './kv';
import {
  categories as staticCategories,
  products as staticProducts,
  ALL_SIZES,
} from '@/data/products';

const CATALOG_KEY = 'products:catalog';

// Instagram media ids the admin has explicitly deleted as a draft, kept
// here forever — independent of whether a product record still exists —
// so a later "Check Instagram" sync doesn't quietly pull the same post
// back in as a "new" draft just because it's no longer in the catalog to
// be recognised as already-seen. See deleteProduct below and
// sync-instagram/route.js's seenIds check.
const DISMISSED_INSTAGRAM_IDS_KEY = 'instagram:dismissed-ids';

// Pre-migration layout — read from only once, to pull existing data into
// the new single-key layout. Never written to again after that.
const LEGACY_INDEX_KEY = 'products:index';
const LEGACY_SEEDED_KEY = 'catalog:seeded';
function legacyProductKey(id) {
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

// Many Instagram captions start with the same boilerplate ordering notice
// before any text that actually names the piece (or have no distinguishing
// text before it at all), so slugify(title) alone regularly produces the
// exact same id for genuinely different products — this is what caused ~80
// products across the catalog to silently share an id with one or more
// other, unrelated products (found and repaired November 2026). When that
// happens this appends "-2", "-3", etc. until it finds an id nothing else in
// the catalog is already using, so two different products can never again
// be forced to share one id — and share-one-id is a real bug, not a cosmetic
// one: every record sharing an id gets silently overwritten with whichever
// one of them was edited most recently (see the comment on `next` below).
function dedupeId(all, candidateId) {
  if (!all.some((p) => p.id === candidateId)) return candidateId;
  let i = 2;
  while (all.some((p) => p.id === `${candidateId}-${i}`)) i += 1;
  return `${candidateId}-${i}`;
}

// The timestamp "newest first" ordering is sorted by everywhere: when a
// product actually went live, falling back to when it was created for
// drafts (which have no publishedAt yet). This is what makes a piece
// published today show up before one drafted last month but published
// weeks ago.
export function publishRank(product) {
  return product.publishedAt || product.createdAt || 0;
}

// Storefront ordering — "Shop the Collection", the homepage's "New &
// Noteworthy" row, and every category page — always reflects when a piece
// actually went up on Instagram (createdAt carries the post's own
// timestamp, set once at sync time and never touched again), never when an
// admin happened to get around to clicking Publish. That matters because
// products get published out of order while working through a backlog: an
// Instagram post from months ago, published today, should settle into its
// true place in the lineup rather than jumping to the very front ahead of
// genuinely newer posts. A manually-added (non-Instagram) piece has no real
// "upload date" to speak of, so it just falls back to publishedAt/0 same as
// before.
export function storefrontRank(product) {
  return product.createdAt || product.publishedAt || 0;
}

function recordFromStatic(p, i, now) {
  return {
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
    // is preserved once sorted newest-first. publishedAt matches
    // createdAt here since these were all "published" the moment they
    // were seeded.
    createdAt: now - (staticProducts.length - i) * 1000,
    publishedAt: now - (staticProducts.length - i) * 1000,
    updatedAt: now,
  };
}

function staticAsRecords() {
  const now = Date.now();
  return staticProducts.map((p, i) => recordFromStatic(p, i, now));
}

// Only ever runs the first time readAllFromKv() finds nothing yet at
// CATALOG_KEY — reads whatever existed under the pre-migration layout
// (if anything), folds it into a plain array, and leaves the legacy keys
// alone (they're dead weight after this, not worth spending a command to
// clean up). A store that was never seeded at all just starts fresh from
// the static catalog, same as before.
async function migrateFromLegacyIfNeeded() {
  const alreadySeeded = await kv.get(LEGACY_SEEDED_KEY);
  if (!alreadySeeded) return staticAsRecords();

  const ids = await kv.smembers(LEGACY_INDEX_KEY);
  if (!ids || ids.length === 0) return staticAsRecords();

  const records = await Promise.all(ids.map((id) => kv.get(legacyProductKey(id))));
  return records.filter(Boolean);
}

// The one place that ever touches Redis to read the catalog — always
// exactly one GET once migration has happened (which, after the first
// deploy of this change, is every time).
async function readAllFromKv() {
  const cached = await kv.get(CATALOG_KEY);
  if (cached) return cached;
  const migrated = await migrateFromLegacyIfNeeded();
  await kv.set(CATALOG_KEY, migrated);
  return migrated;
}

// Returns EVERY product (drafts included) — used by the admin dashboard.
export async function getAllProductsAdmin() {
  if (!isKvConfigured()) return staticAsRecords();
  try {
    const all = await readAllFromKv();
    return [...all].sort((a, b) => publishRank(b) - publishRank(a));
  } catch (err) {
    console.error('KV read failed, falling back to static catalog:', err);
    return staticAsRecords();
  }
}

// Returns only published products — used by the public storefront.
export async function getAllProducts() {
  const all = await getAllProductsAdmin();
  return all
    .filter((p) => p.status === 'published')
    .sort((a, b) => storefrontRank(b) - storefrontRank(a));
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
  const all = await readAllFromKv();
  const now = Date.now();
  const isNew = !input.id;
  // A caller editing an existing product always passes its real id, so that
  // id is used exactly as given — if `existing` then comes back null (the
  // id was deleted from under it, say), it's treated as a fresh insert under
  // that same id rather than silently dropped. A caller creating a product
  // with no id yet (a brand-new manual product, or every Instagram-sourced
  // draft) only ever supplies a title — see dedupeId above for why that
  // title-derived id can collide with an unrelated, already-existing
  // product, and why that collision has to be resolved by picking a
  // different id for the new product, never by quietly merging into (and
  // overwriting) whatever else already holds that id.
  const id = input.id || dedupeId(all, slugify(input.title || `piece-${now}`));
  const existing = all.find((p) => p.id === id) || null;
  const nextStatus = input.status || existing?.status || 'draft';
  // Set the moment a product actually goes live — the first time (or any
  // later time, if it's ever unpublished and republished) its status
  // becomes 'published'. Kept unchanged on every other save (editing the
  // price, say) so it doesn't drift, and this — not createdAt, which can be
  // long before a draft is actually published — is what "newest published"
  // ordering is sorted by everywhere on the site.
  const isNewlyPublished = nextStatus === 'published' && existing?.status !== 'published';
  const publishedAt = isNewlyPublished ? now : existing?.publishedAt || null;

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
    status: nextStatus,
    publishedAt,
    source: input.source || existing?.source || 'manual',
    instagramMediaId: input.instagramMediaId ?? existing?.instagramMediaId ?? null,
    instagramPermalink: input.instagramPermalink ?? existing?.instagramPermalink ?? null,
    // Instagram's API occasionally hands back the wrong post's permalink
    // (seen with collab/repost posts) — rather than trust it blindly, the
    // storefront only deep-links to a specific post once someone in the
    // admin dashboard has actually opened it and confirmed it's right.
    // Until then it safely falls back to the main Instagram profile link.
    instagramLinkVerified: Boolean(input.instagramLinkVerified),
    // Normally just "now" — but the Instagram sync processes posts one at a
    // time in a loop (newest post first), and each upsert's own Date.now()
    // creeps forward as the loop runs, which would make a post processed
    // later in the same sync look "created" after one processed earlier,
    // even though it's actually older. Instagram sync passes the post's own
    // timestamp explicitly so ordering reflects real chronology instead of
    // processing order.
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now,
  };

  // Replaces a single element by position (findIndex + one splice) rather
  // than `all.map((p) => (p.id === id ? record : p))` — .map() would quietly
  // overwrite EVERY element sharing this id with this one new record, which
  // is exactly how one duplicate-id product (see dedupeId above) turned into
  // two identical copies the moment either one was ever saved again. Now
  // that dedupeId stops new duplicates from being created, this is really a
  // second, independent safety net — it means even a product some other bug
  // manages to duplicate in the future can still be edited one copy at a
  // time instead of all copies fusing into one on the next save.
  let next;
  if (existing) {
    const idx = all.findIndex((p) => p.id === id);
    next = [...all];
    next[idx] = record;
  } else {
    next = [record, ...all];
  }
  await kv.set(CATALOG_KEY, next);
  return record;
}

// Updates only the given fields on an existing product, leaving everything
// else (title, price, description, …) exactly as it is. Used by one-off
// admin repair jobs (see app/api/admin/fix-instagram-order) that need to
// correct a single field without re-running the full upsertProduct rules.
export async function patchProductFields(id, patch) {
  if (!isKvConfigured()) return null;
  const all = await readAllFromKv();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated = { ...all[idx], ...patch, updatedAt: Date.now() };
  const next = [...all];
  next[idx] = updated;
  await kv.set(CATALOG_KEY, next);
  return updated;
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
    const all = await readAllFromKv();
    const idx = all.findIndex((p) => p.id === handle);
    if (idx === -1) return;
    const existing = all[idx];
    const stock = existing.availableSizes;
    if (!stock || Array.isArray(stock) || !(size in stock)) return;
    const current = Number(stock[size]) || 0;
    if (current <= 0) return;
    const nextQty = Math.max(0, current - (Number(qty) || 1));
    const next = [...all];
    next[idx] = { ...existing, availableSizes: { ...stock, [size]: nextQty }, updatedAt: Date.now() };
    await kv.set(CATALOG_KEY, next);
  } catch (err) {
    console.error('Could not decrement size stock:', handle, size, err);
  }
}

export async function deleteProduct(id) {
  if (!isKvConfigured()) {
    throw new Error('KV is not connected yet — see README for setup steps.');
  }
  const all = await readAllFromKv();
  const removed = all.find((p) => p.id === id);
  const next = all.filter((p) => p.id !== id);
  await kv.set(CATALOG_KEY, next);

  // Deleting a draft that came from Instagram should mean "I don't want
  // this," not "ask me again next sync" — record its media id so it's
  // never re-added, whether this was a single delete or part of
  // "Delete all unpublished."
  if (removed?.source === 'instagram' && removed.instagramMediaId) {
    try {
      await kv.sadd(DISMISSED_INSTAGRAM_IDS_KEY, removed.instagramMediaId);
    } catch (err) {
      console.error(
        'Could not record dismissed Instagram id (it may come back on next sync):',
        removed.instagramMediaId,
        err
      );
    }
  }
}

// Every Instagram media id that's either already in the catalog (as any
// status) or was explicitly deleted before — i.e. every post that should
// be left alone on the next sync. Used by sync-instagram/route.js.
export async function getSeenInstagramIds() {
  const existing = await getAllProductsAdmin();
  const seen = new Set(existing.map((p) => p.instagramMediaId).filter(Boolean));
  if (!isKvConfigured()) return seen;
  try {
    const dismissed = await kv.smembers(DISMISSED_INSTAGRAM_IDS_KEY);
    for (const id of dismissed || []) seen.add(id);
  } catch (err) {
    console.error('Could not read dismissed Instagram ids:', err);
  }
  return seen;
}
