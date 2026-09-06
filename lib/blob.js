// Re-hosts an Instagram image permanently in Vercel Blob storage.
//
// Instagram's own media URLs are signed and expire after a while — fine for
// the temporary "Shop the Feed" section, but not for a product photo you
// intend to keep live for weeks. When BLOB_READ_WRITE_TOKEN is set (Vercel
// → Storage → Create Database → Blob, connected to this project), new
// Instagram drafts get their photo copied here permanently. Without it,
// drafts still work — they just keep pointing at Instagram's temporary URL.

import { put } from '@vercel/blob';

export function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function rehostImage(sourceUrl, filenameHint) {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Could not download image (${res.status}).`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const safeHint = (filenameHint || 'product').toString().slice(0, 60);

  const blob = await put(`products/${safeHint}-${Date.now()}.${ext}`, buffer, {
    access: 'public',
    contentType,
  });
  return blob.url;
}
