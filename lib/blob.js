// Re-hosts product photos permanently in Vercel Blob storage — both photos
// pulled in from Instagram (whose own image URLs are signed and expire
// after a while) and photos uploaded directly from the admin dashboard
// (e.g. straight from an iPhone). When BLOB_READ_WRITE_TOKEN is set (Vercel
// → Storage → Create Database → Blob, connected to this project), photos
// get stored here permanently. Without it, direct uploads are disabled and
// Instagram drafts just keep pointing at Instagram's temporary URL.

import { put, del } from '@vercel/blob';
import convert from 'heic-convert';
import sharp from 'sharp';

export function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
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

// Vercel Blob's free tier caps monthly *data transfer* (bytes served to
// shoppers, not just upload size) at 10GB — with ~200 products getting real
// site and social traffic, storing photos at their original phone/Instagram
// resolution blew through that in a single month (see the "100% of Blob
// Data Transfer" email, Nov 2026). next.config.js's `images.unoptimized`
// is deliberately left on (see its own comment — Vercel's Image
// Optimization API has its own separate quota that already broke a photo
// once), so this fixes bandwidth at the source instead: every photo is
// capped to a sane web size and re-compressed before it's ever stored,
// cutting what gets served per page view by roughly 70-85% with no
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

  const blob = await put(`products/${safeHint}-${Date.now()}.${ext}`, optimized.buffer, {
    access: 'public',
    contentType: optimized.contentType,
  });
  return blob.url;
}

export async function rehostImage(sourceUrl, filenameHint) {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Could not download image (${res.status}).`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return uploadImage(buffer, contentType, filenameHint);
}

// True for any URL this project's own Blob store actually hosts (as opposed
// to, say, an Instagram CDN URL that hasn't been re-hosted yet, or anything
// else that might end up in a product's `image` field). Used before ever
// deleting a "replaced" photo — never delete something that isn't ours to
// delete.
export function isBlobUrl(url) {
  return typeof url === 'string' && /\.public\.blob\.vercel-storage\.com\//.test(url);
}

// Best-effort delete — called whenever a product's photo is replaced with a
// different one, so the old file doesn't sit in storage forever un-used
// (this is exactly how Storage crept up to 75%+ of the free 1GB limit: nothing
// ever deleted a superseded photo). Never throws — a failed cleanup delete
// should never block the actual save the admin is doing.
export async function deleteImage(url) {
  if (!isBlobUrl(url)) return;
  try {
    await del(url);
  } catch (err) {
    console.error('Could not delete old blob (leaving it in place):', url, err);
  }
}
