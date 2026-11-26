// Re-hosts product photos permanently in Vercel Blob storage — both photos
// pulled in from Instagram (whose own image URLs are signed and expire
// after a while) and photos uploaded directly from the admin dashboard
// (e.g. straight from an iPhone). When BLOB_READ_WRITE_TOKEN is set (Vercel
// → Storage → Create Database → Blob, connected to this project), photos
// get stored here permanently. Without it, direct uploads are disabled and
// Instagram drafts just keep pointing at Instagram's temporary URL.

import { put, del } from '@vercel/blob';
import convert from 'heic-convert';

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

export async function uploadImage(buffer, contentType, filenameHint, originalFilename) {
  const normalized = await normalizeToJpegIfHeic(buffer, contentType, originalFilename);
  const ext = extFromContentType(normalized.contentType);
  const safeHint = (filenameHint || 'product').toString().replace(/[^a-z0-9-]/gi, '-').slice(0, 60);

  const blob = await put(`products/${safeHint}-${Date.now()}.${ext}`, normalized.buffer, {
    access: 'public',
    contentType: normalized.contentType,
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
