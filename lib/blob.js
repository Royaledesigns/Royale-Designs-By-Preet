// Re-hosts product photos permanently in Cloudflare R2 — both photos pulled
// in from Instagram (whose own image URLs are signed and expire after a
// while) and photos uploaded directly from the admin dashboard (e.g.
// straight from an iPhone). When R2_ACCOUNT_ID / R2_ACCESS_KEY_ID /
// R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME are all set (Cloudflare dashboard →
// R2 Object Storage → royale-designs-images bucket → Manage API Tokens),
// photos get stored here permanently and served from R2_PUBLIC_URL (the
// custom domain images.royaledesigns.com.au, connected to the bucket).
// Without those set, direct uploads are disabled and Instagram drafts just
// keep pointing at Instagram's temporary URL.
//
// Previously this stored photos in Vercel Blob instead (see git history —
// `@vercel/blob`'s `put`/`del`). Moved to R2 in Nov 2026: Vercel Blob's free
// tier caps *data transfer* at 10GB/month, and real site + social traffic
// serving ~200 products' photos blew through that in a single month,
// triggering a 30-day store lockout. R2 has the same shape of free tier for
// storage, but its data transfer (egress) is $0, unconditionally, forever —
// so the exact same traffic pattern that broke Blob costs nothing here. The
// one-time migration of already-stored photos from Blob to R2 is
// app/api/admin/migrate-to-r2/route.js; app/api/admin/cleanup-blobs/route.js
// is old Blob-only cleanup tooling, left in place but no longer relevant
// once a product's `image` no longer points at Blob.
import { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import convert from 'heic-convert';
import sharp from 'sharp';

export function isBlobConfigured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
  );
}

// Lazily constructed (and cached) rather than at module load — so importing
// this file never throws just because the env vars aren't set yet (e.g.
// local dev without R2 configured); isBlobConfigured() is what callers are
// expected to check first, same as before.
let _client = null;
function r2() {
  if (_client) return _client;
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  return _client;
}

// The custom domain connected to the bucket (images.royaledesigns.com.au),
// with any trailing slash trimmed so `${publicBase()}/${key}` never ends up
// with a doubled slash.
function publicBase() {
  return (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
}

function isHeic(contentType, filename) {
  const type = (contentType || '').toLowerCase();
  const name = (filename || '').toLowerCase();
  return (
    type.includes('heic') ||
    type.includes('heif') ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

// iPhones save camera photos as HEIC by default. Most browsers other than
// Safari/iOS can't display HEIC in a normal <img>, so anything that looks
// like HEIC gets converted to a regular JPEG here before it's stored —
// otherwise a product photo added straight from an iPhone would show up
// broken for most shoppers.
async function normalizeToJpegIfHeic(buffer, contentType, filename) {
  if (!isHeic(contentType, filename)) {
    return { buffer, contentType: contentType || 'image/jpeg' };
  }
  const output = await convert({ buffer, format: 'JPEG', quality: 0.92 });
  return { buffer: Buffer.from(output), contentType: 'image/jpeg' };
}

function extFromContentType(contentType) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  return 'jpg';
}

// With ~200 products getting real site and social traffic, storing photos
// at their original phone/Instagram resolution served far more bytes per
// page view than needed (see the file header above). next.config.js's
// `images.unoptimized` is deliberately left on (see its own comment —
// Vercel's Image Optimization API has its own separate quota that already
// broke a photo once), so this fixes bandwidth at the source instead: every
// photo is capped to a sane web size and re-compressed before it's ever
// stored, cutting what gets served per page view by roughly 70-85% with no
// visible quality loss. Applies to every upload path — direct admin
// uploads and Instagram re-hosts both go through uploadImage below.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 82;

async function optimizeImage(buffer, contentType) {
  try {
    // .rotate() with no args applies the photo's own EXIF orientation
    // (phones save sideways/upside-down with just a tag) before resizing,
    // then strips it — otherwise a resized photo can come out rotated.
    const resized = sharp(buffer).rotate().resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    });
    if (contentType.includes('png')) {
      return { buffer: await resized.png({ compressionLevel: 9 }).toBuffer(), contentType: 'image/png' };
    }
    if (contentType.includes('webp')) {
      return { buffer: await resized.webp({ quality: WEBP_QUALITY }).toBuffer(), contentType: 'image/webp' };
    }
    return {
      buffer: await resized.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer(),
      contentType: 'image/jpeg',
    };
  } catch (err) {
    // Never let an optimization hiccup block the actual upload — worst
    // case a photo goes up at its original size, same as before this
    // existed.
    console.error('Could not optimize image, storing as-is:', err);
    return { buffer, contentType };
  }
}

export async function uploadImage(buffer, contentType, filenameHint, originalFilename) {
  const normalized = await normalizeToJpegIfHeic(buffer, contentType, originalFilename);
  const optimized = await optimizeImage(normalized.buffer, normalized.contentType);
  const ext = extFromContentType(optimized.contentType);
  const safeHint = (filenameHint || 'product').toString().replace(/[^a-z0-9-]/gi, '-').slice(0, 60);
  const key = `products/${safeHint}-${Date.now()}.${ext}`;

  await r2().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: optimized.buffer,
      ContentType: optimized.contentType,
    })
  );

  return `${publicBase()}/${key}`;
}

// Copies one of this bucket's own objects to a new, fixed key and returns the
// new public URL — entirely inside R2, nothing is downloaded. Used to give a
// site asset (e.g. a homepage hero photo that started life as a product
// photo) its own permanent file, so editing or replacing the original
// product's photo can never delete it out from under the homepage (see
// deleteImage below, which removes a product's old photo when it changes).
export async function copyImage(sourceUrl, destKey) {
  if (!isBlobUrl(sourceUrl)) throw new Error('Source is not one of our own stored images.');
  const srcKey = sourceUrl.slice(publicBase().length + 1).split('?')[0];
  await r2().send(
    new CopyObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: destKey,
      CopySource: `${process.env.R2_BUCKET_NAME}/${srcKey}`,
    })
  );
  return `${publicBase()}/${destKey}`;
}

export async function rehostImage(sourceUrl, filenameHint) {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Could not download image (${res.status}).`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return uploadImage(buffer, contentType, filenameHint);
}

// True for any URL this project's own R2 bucket actually serves (as
// opposed to, say, an Instagram CDN URL that hasn't been re-hosted yet, a
// leftover Vercel Blob URL not yet migrated, or anything else that might
// end up in a product's `image` field). Used before ever deleting a
// "replaced" photo — never delete something that isn't ours to delete.
export function isBlobUrl(url) {
  const base = publicBase();
  return Boolean(base) && typeof url === 'string' && url.startsWith(`${base}/`);
}

// Best-effort delete — called whenever a product's photo is replaced with a
// different one, so the old file doesn't sit in storage forever un-used.
// Never throws — a failed cleanup delete should never block the actual
// save the admin is doing.
export async function deleteImage(url) {
  if (!isBlobUrl(url)) return;
  try {
    const key = url.slice(publicBase().length + 1);
    await r2().send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );
  } catch (err) {
    console.error('Could not delete old R2 object (leaving it in place):', url, err);
  }
}
