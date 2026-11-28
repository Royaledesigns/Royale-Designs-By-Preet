'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { categories, getSizesForCategory, isUnsizedCategory } from '@/data/products';

// Normalizes availableSizes into the { size: quantity } shape this form
// edits, whatever shape the stored product actually has. A legacy array
// (from before quantities existed — just a list of sizes marked "ready,
// unlimited") seeds each of those sizes with a starting quantity of 1
// rather than 0, so re-saving a product you haven't touched in a while
// doesn't silently zero out sizes that were previously available — just
// double-check the real count before saving.
function normalizeSizeStock(availableSizes) {
  if (!availableSizes) return {};
  if (Array.isArray(availableSizes)) {
    return availableSizes.reduce((acc, s) => ({ ...acc, [s]: 1 }), {});
  }
  return { ...availableSizes };
}

// Main photo + up to 3 extras shown on the product page.
const MAX_PHOTOS = 4;

// Shrinks a phone photo in the browser before it's sent. A full-resolution
// iPhone photo can be 4–10MB, and Vercel rejects any upload over ~4.5MB
// outright (the request never even reaches our upload route) — which is
// exactly how photos could silently fail to appear. The server resizes to
// 1600px anyway, so nothing is lost by doing it here first; it also makes
// uploads far quicker on mobile data. Falls back to the original file if
// the browser can't decode it (the server then handles it as before).
async function shrinkPhoto(file) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const MAX = 1600;
    const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return file;
    const name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

// Uploads one photo (shrunk first) and returns its stored URL, or throws an
// error with a plain-English message. Reads the response as text first so a
// non-JSON failure page (e.g. Vercel's "too large") becomes a readable
// message instead of "Unexpected token…".
async function uploadPhoto(file) {
  const small = await shrinkPhoto(file);
  const body = new FormData();
  body.append('file', small);
  const res = await fetch('/api/admin/upload', { method: 'POST', body });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    // not JSON — handled below
  }
  if (!res.ok || !data?.url) {
    if (res.status === 413) throw new Error('That photo is too large to upload — try a smaller one.');
    throw new Error(data?.error || `Upload failed (${res.status}). Please try again.`);
  }
  return data.url;
}

function emptyForm(product) {
  return {
    id: product.id,
    title: product.title || '',
    category: product.category || '',
    price: product.price ?? '',
    description: product.description || '',
    customStitch: product.customStitch !== false,
    // How many ready-made pieces you actually have in each size — e.g.
    // { M: 2, L: 3 }. Starts empty so you enter real counts yourself;
    // any size left at 0 (or not listed) shows greyed out on the site,
    // with Custom left as the fallback.
    availableSizes: normalizeSizeStock(product.availableSizes),
    soldOut: product.soldOut || false,
    image: product.image,
    // Up to 3 extra photos (4 in total with the main one) — see MAX_PHOTOS.
    extraImages: Array.isArray(product.extraImages) ? product.extraImages : [],
    status: product.status,
    source: product.source,
    instagramMediaId: product.instagramMediaId,
    instagramPermalink: product.instagramPermalink,
    instagramLinkVerified: product.instagramLinkVerified || false,
  };
}

// A brand-new, not-yet-saved product added via "Add new product". It has
// no real id yet — that's assigned once it's actually saved — so it's
// tracked locally by _localKey instead until then.
function blankProduct(image = null) {
  return {
    _localKey: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: null,
    title: '',
    category: '',
    price: '',
    description: '',
    customStitch: true,
    availableSizes: {},
    soldOut: false,
    // Pre-filled when a card is created from a bulk photo upload (see
    // handleBulkPhotos); null for a plain "+" card, where the photo is
    // added from the card itself.
    image,
    status: 'draft',
    source: 'manual',
    instagramMediaId: null,
    instagramPermalink: null,
    instagramLinkVerified: false,
    isNew: true,
  };
}

function ProductCard({ product, onSaved, onDeleted }) {
  const [form, setForm] = useState(emptyForm(product));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const fileInputRef = useRef(null);
  const extraInputRef = useRef(null);
  const [uploadingExtras, setUploadingExtras] = useState(false);
  // Photo-upload problems show right under the photos (not down with the
  // form-level error at the bottom of the card, where they were missed).
  const [photoError, setPhotoError] = useState('');
  const [channelCopied, setChannelCopied] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailNote, setEmailNote] = useState('');
  // Deliberately reads product.status (the live prop), not form.status —
  // that way the Publish/Unpublish buttons update immediately once the
  // parent swaps in the saved record, without disturbing the rest of the
  // form (which stays as whatever the user has typed).
  const isDraft = product.status === 'draft';
  const isUnsized = isUnsizedCategory(form.category);
  const sizeOptions = getSizesForCategory(form.category);
  const isUnsavedNew = product.isNew && !product.id;

  function set(field, value) {
    if (field === 'category') {
      // Clothing sizes and EU shoe sizes don't overlap — clear whatever was
      // set so a stale size from the old category can't stick around.
      setForm((f) => ({ ...f, category: value, availableSizes: {} }));
      return;
    }
    if (field === 'instagramPermalink') {
      // A changed link hasn't been checked yet, so it goes back to
      // unverified until someone confirms the new one is correct.
      setForm((f) => ({ ...f, instagramPermalink: value, instagramLinkVerified: false }));
      return;
    }
    setForm((f) => ({ ...f, [field]: value }));
  }

  // "Mark sold out" needs to stick right away — it was previously just
  // local form state, so if you toggled it and then navigated off (e.g.
  // tapped "View post") without also hitting Save/Publish, it silently
  // reverted. This saves the toggle on its own, straight to the server,
  // built from the last-saved product record (not the in-progress form) so
  // it can't accidentally push other half-edited fields live.
  async function toggleSoldOut() {
    const nextSoldOut = !form.soldOut;
    setForm((f) => ({ ...f, soldOut: nextSoldOut }));
    if (!product.id) return; // not saved yet — will go out with the next save
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          title: product.title,
          category: product.category,
          price: product.price,
          description: product.description,
          customStitch: product.customStitch,
          availableSizes: product.availableSizes,
          soldOut: nextSoldOut,
          image: product.image,
          status: product.status,
          source: product.source,
          instagramMediaId: product.instagramMediaId,
          instagramPermalink: product.instagramPermalink,
          instagramLinkVerified: product.instagramLinkVerified,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update.');
      onSaved(data.product, product._localKey);
    } catch (err) {
      setError(err.message);
      // Didn't actually save — put the button back the way it was.
      setForm((f) => ({ ...f, soldOut: !nextSoldOut }));
    } finally {
      setSaving(false);
    }
  }

  // Share a published piece to the WhatsApp Channel. WhatsApp has no way to
  // post to a channel automatically, so this copies a ready-made caption
  // (name and link, no price) and opens the channel — paste it, add the photo or
  // video, and send.
  async function shareToChannel() {
    const url = `${window.location.origin}/product/${product.id}`;
    // No price on purpose — the channel gets just the post/reel and a link.
    const caption = `New arrival at Royale Designs by Preet\n${product.title}\n${url}`;
    try {
      await navigator.clipboard.writeText(caption);
      setChannelCopied(true);
      setTimeout(() => setChannelCopied(false), 4000);
    } catch {
      window.prompt('Copy this caption, then paste it in the channel:', caption);
    }
    window.open('https://whatsapp.com/channel/0029Vb7qGPoAO7RHDqvJVt2I', '_blank', 'noreferrer');
  }

  // Emails this product to everyone on the newsletter list. Checks the
  // list size first and asks before sending; a product that was already
  // emailed asks again so it can't go out twice by accident.
  async function emailSubscribers() {
    setEmailing(true);
    setEmailNote('');
    setError('');
    try {
      const check = await fetch(`/api/admin/notify-subscribers?id=${encodeURIComponent(product.id)}`);
      const info = await check.json();
      if (!check.ok) throw new Error(info.error || 'Could not check your subscriber list.');
      if (!info.emailReady) throw new Error('Email sending is not set up yet — add RESEND_API_KEY in Vercel.');
      if (info.count === 0) throw new Error('You have no email subscribers yet.');

      const again = info.alreadySentAt
        ? `\n\nNote: this piece was already emailed on ${new Date(info.alreadySentAt).toLocaleDateString('en-AU')}.`
        : '';
      if (!window.confirm(`Email "${product.title}" to ${info.count} subscriber${info.count === 1 ? '' : 's'} now? This cannot be undone.${again}`)) {
        return;
      }

      const res = await fetch('/api/admin/notify-subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, force: Boolean(info.alreadySentAt) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send the emails.');
      setEmailNote(`Emailed ${data.sent} subscriber${data.sent === 1 ? '' : 's'}${data.failed ? ` (${data.failed} failed)` : ''}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setEmailing(false);
    }
  }

  function setSizeQty(size, rawValue) {
    const qty = Math.max(0, parseInt(rawValue, 10) || 0);
    setForm((f) => ({ ...f, availableSizes: { ...f.availableSizes, [size]: qty } }));
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPhotoError('');
    try {
      set('image', await uploadPhoto(file));
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setUploading(false);
      // Reset so choosing the same file again still fires a change event.
      e.target.value = '';
    }
  }

  // Adds more photos to this one product (back view, details, …). Picks as
  // many as fit in the remaining slots, uploads them one at a time, and
  // appends each as soon as it lands. The first photo ever added to an
  // empty card becomes the main one.
  async function handleExtraPhotos(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (picked.length === 0) return;
    const used = (form.image ? 1 : 0) + form.extraImages.length;
    const room = MAX_PHOTOS - used;
    if (room <= 0) {
      setPhotoError(`A product can have up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const files = picked.slice(0, room);
    setUploadingExtras(true);
    setPhotoError(
      picked.length > room ? `Only ${room} more photo${room === 1 ? '' : 's'} fit — added the first ${room}.` : ''
    );
    try {
      for (const file of files) {
        const url = await uploadPhoto(file);
        setForm((f) =>
          f.image ? { ...f, extraImages: [...f.extraImages, url] } : { ...f, image: url }
        );
      }
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setUploadingExtras(false);
    }
  }

  function removeExtra(url) {
    setForm((f) => ({ ...f, extraImages: f.extraImages.filter((u) => u !== url) }));
  }

  // Swaps a thumbnail with the main photo — the main one is what shows in
  // the shop grid, cart and Google, so this is how you pick the best front shot.
  function makeMain(url) {
    setForm((f) => ({
      ...f,
      image: url,
      extraImages: f.extraImages.map((u) => (u === url ? f.image : u)),
    }));
  }

  async function save(nextStatus) {
    if (!form.image) {
      setError('Add a photo first.');
      return;
    }
    if (!form.title || form.title.trim() === '') {
      setError('Please add a title.');
      return;
    }
    if (nextStatus === 'published' && (form.price === '' || form.price == null)) {
      setError('Add a price before publishing.');
      return;
    }
    if (nextStatus === 'published' && !form.category) {
      setError('Choose a category before publishing.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Explicitly send null (never the local-only placeholder key) so a
        // brand-new product gets a real id slugified from its title,
        // instead of accidentally using the temporary key as its id.
        body: JSON.stringify({ ...form, id: form.id || null, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      onSaved(data.product, product._localKey);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function generateTitle() {
    if (!form.image) return;
    setGeneratingTitle(true);
    setError('');
    try {
      const res = await fetch('/api/admin/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: form.image, category: form.category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate a title.');
      set('title', data.title);
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingTitle(false);
    }
  }

  async function remove() {
    if (isUnsavedNew) {
      // Never saved — nothing to delete server-side, just drop it.
      onDeleted(product._localKey, true);
      return;
    }
    if (!confirm(`${isDraft ? 'Discard' : 'Delete'} "${form.title}"? This can't be undone.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete.');
      onDeleted(product.id);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="border border-forest/15 rounded-sm bg-white p-4 flex flex-col sm:flex-row gap-4">
      <div className="w-full sm:w-32 flex-none">
      <div className="relative w-full aspect-[3/4] sm:aspect-square rounded-sm overflow-hidden bg-cream-dark">
        {form.image ? (
          <Image src={form.image} alt={form.title || 'Product photo'} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-center text-[11px] text-forest/50 px-2">
            No photo yet
          </div>
        )}
        {form.soldOut && (
          <div className="absolute inset-0 bg-forest-dark/50 flex items-center justify-center">
            <span className="text-cream text-xs uppercase tracking-widest border border-cream px-2 py-1">
              Sold Out
            </span>
          </div>
        )}
        <label className="absolute inset-x-0 bottom-0 bg-forest-dark/85 text-cream text-[10px] uppercase tracking-wide text-center py-1.5 cursor-pointer hover:bg-forest-dark">
          {uploading ? 'Uploading…' : form.image ? 'Change photo' : 'Upload photo'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handlePhotoChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Extra photos: thumbnails of the 2nd–4th shots, each removable or
          promotable to main, plus an add tile while there's room. */}
      <div className="mt-2 grid grid-cols-3 sm:grid-cols-2 gap-2">
        {form.extraImages.map((url) => (
          <div key={url} className="relative aspect-square rounded-sm overflow-hidden bg-cream-dark">
            <Image src={url} alt="Extra product photo" fill className="object-cover" unoptimized />
            <button
              type="button"
              onClick={() => removeExtra(url)}
              aria-label="Remove this photo"
              className="absolute top-0.5 right-0.5 w-6 h-6 rounded-full bg-forest-dark/85 text-cream text-xs leading-none"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={() => makeMain(url)}
              className="absolute inset-x-0 bottom-0 bg-forest-dark/80 text-cream text-[9px] uppercase tracking-wide py-1"
            >
              Make main
            </button>
          </div>
        ))}
        {(form.image ? 1 : 0) + form.extraImages.length < MAX_PHOTOS && (
          <label className="aspect-square rounded-sm border border-dashed border-forest/30 flex flex-col items-center justify-center text-center text-[10px] uppercase tracking-wide text-forest/70 cursor-pointer hover:bg-cream-dark px-1">
            {uploadingExtras ? 'Uploading…' : form.image ? '+ More photos' : '+ Photos'}
            <input
              ref={extraInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              onChange={handleExtraPhotos}
              disabled={uploadingExtras || uploading}
              className="hidden"
            />
          </label>
        )}
      </div>
      {photoError && <p className="mt-2 text-xs text-red-700">{photoError}</p>}
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] uppercase tracking-widest text-gold-dark">
            {product.source === 'instagram' ? 'From Instagram' : isUnsavedNew ? 'New product' : 'Manual'} ·{' '}
            {product.status}
          </span>
          <div className="flex items-center gap-3">
            {product.instagramPermalink && (
              <a
                href={product.instagramPermalink}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] underline text-forest/80 hover:text-gold"
              >
                View post
              </a>
            )}
            <button
              type="button"
              onClick={toggleSoldOut}
              disabled={saving}
              className={`text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-sm border transition-colors disabled:opacity-60 ${
                form.soldOut
                  ? 'bg-red-700 text-cream border-red-700'
                  : 'border-forest/20 text-forest/70 hover:bg-cream-dark'
              }`}
            >
              {form.soldOut ? 'Sold out' : 'Mark sold out'}
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs uppercase tracking-wide text-forest/80">Title</label>
            <button
              type="button"
              onClick={generateTitle}
              disabled={generatingTitle || !form.image}
              className="text-[11px] uppercase tracking-wide text-gold-dark hover:text-gold disabled:opacity-50 disabled:hover:text-gold-dark"
            >
              {generatingTitle ? 'Generating…' : '✦ Generate title with AI'}
            </button>
          </div>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder={isUnsavedNew ? 'e.g. Emerald Green Embellished Lehenga' : ''}
            className="w-full border border-forest/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1">Category</label>
            <select
              value={form.category || ''}
              onChange={(e) => set('category', e.target.value)}
              className="w-full border border-forest/20 rounded-sm px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gold"
            >
              <option value="">Choose…</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1">Price (AUD)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              placeholder="e.g. 450"
              className="w-full border border-forest/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            className="w-full border border-forest/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>

        {product.source === 'instagram' && (
          <div>
            <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1">
              Instagram link
            </label>
            <input
              value={form.instagramPermalink || ''}
              onChange={(e) => set('instagramPermalink', e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              className="w-full border border-forest/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
            />
            <p className="text-[11px] text-forest/60 mt-1.5">
              Auto-filled when a post syncs from Instagram — occasionally wrong for collab/repost
              posts. Click it below to check it opens the right video, then tick the box — until
              you do, the product page safely links to your Instagram profile instead of this post.
            </p>
            {form.instagramPermalink && (
              <a
                href={form.instagramPermalink}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs underline text-forest/80 hover:text-gold mt-1.5"
              >
                Open this link to check it →
              </a>
            )}
            <label className="flex items-center gap-2 text-sm text-forest-dark mt-2">
              <input
                type="checkbox"
                checked={form.instagramLinkVerified}
                disabled={!form.instagramPermalink}
                onChange={(e) => set('instagramLinkVerified', e.target.checked)}
              />
              I checked this link and it opens the correct video
            </label>
          </div>
        )}

        {!isUnsized && (
          <div>
            <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">
              Ready-made stock by size
            </label>
            <div className="flex flex-wrap gap-3">
              {sizeOptions.map((s) => {
                const qty = form.availableSizes[s] || 0;
                return (
                  <div key={s} className="flex flex-col items-center gap-1">
                    <span className="text-[11px] uppercase tracking-wide text-forest/70">{s}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={qty === 0 ? '' : qty}
                      onChange={(e) => setSizeQty(s, e.target.value)}
                      placeholder="0"
                      className={`w-14 text-center border rounded-sm px-1 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gold ${
                        qty > 0 ? 'border-forest bg-forest/5' : 'border-forest/20'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-forest/60 mt-1.5">
              Enter how many you actually have ready to ship in each size — e.g. 2 in M, 3 in L.
              Leave a size at 0 to keep it as custom stitch only. As orders come in for a size,
              this count goes down on its own, and once it hits 0 that size drops back to custom
              automatically.
            </p>
          </div>
        )}

        {!isUnsized && (
          <label className="flex items-center gap-2 text-sm text-forest-dark">
            <input
              type="checkbox"
              checked={form.customStitch}
              onChange={(e) => set('customStitch', e.target.checked)}
            />
            Custom stitch available for this piece
          </label>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}
        {emailNote && <p className="text-sm text-forest-dark">{emailNote}</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          {isDraft ? (
            <>
              <button
                onClick={() => save('published')}
                disabled={saving}
                className="bg-gold text-forest-dark px-4 py-2 text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-60"
              >
                {saving ? 'Publishing…' : 'Publish'}
              </button>
              <button
                onClick={() => save('draft')}
                disabled={saving}
                className="border border-forest/30 text-forest-dark px-4 py-2 text-xs uppercase tracking-widest hover:bg-cream-dark disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
            </>
          ) : (
            <button
              onClick={() => save('published')}
              disabled={saving}
              className="border border-forest text-forest-dark px-4 py-2 text-xs uppercase tracking-widest hover:bg-forest hover:text-cream disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
          {!isDraft && (
            <button
              onClick={() => save('draft')}
              disabled={saving}
              className="border border-forest/30 text-forest-dark px-4 py-2 text-xs uppercase tracking-widest hover:bg-cream-dark disabled:opacity-60"
            >
              Unpublish
            </button>
          )}
          {!isDraft && (
            <button
              onClick={shareToChannel}
              className="border border-forest/30 text-forest-dark px-4 py-2 text-xs uppercase tracking-widest hover:bg-cream-dark"
            >
              {channelCopied ? 'Caption copied — paste in channel' : 'Share to WhatsApp Channel'}
            </button>
          )}
          {!isDraft && (
            <button
              onClick={emailSubscribers}
              disabled={emailing}
              className="border border-forest/30 text-forest-dark px-4 py-2 text-xs uppercase tracking-widest hover:bg-cream-dark disabled:opacity-60"
            >
              {emailing ? 'Sending…' : 'Email subscribers'}
            </button>
          )}
          <button
            onClick={remove}
            disabled={saving}
            className="text-red-700 px-4 py-2 text-xs uppercase tracking-widest hover:underline disabled:opacity-60"
          >
            {isDraft ? 'Discard' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState(null);
  const bulkInputRef = useRef(null);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [fixingOrder, setFixingOrder] = useState(false);
  const [fixMessage, setFixMessage] = useState('');
  const [clearingDrafts, setClearingDrafts] = useState(false);
  const [clearMessage, setClearMessage] = useState('');
  const [settingCutoff, setSettingCutoff] = useState(false);
  const [cutoffMessage, setCutoffMessage] = useState('');
  // Which tab is showing — starts on Unpublished since that's usually the
  // "needs action" inbox (new Instagram drafts, pieces you haven't priced
  // yet), with Published as the other tab rather than both lists stacked.
  const [activeTab, setActiveTab] = useState('unpublished');
  // Lets a long Instagram-sync backlog (100+ drafts) be narrowed down by
  // typing instead of scrolled through — matches against title,
  // description, and category on whichever tab is active.
  const [search, setSearch] = useState('');
  // 'all', a category slug, or 'sold' (sold-out pieces only) — narrows the
  // list so marking something sold out doesn't mean scrolling the whole catalogue.
  const [categoryFilter, setCategoryFilter] = useState('all');
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/products');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      setLoadError('Could not load products.');
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function checkInstagram() {
    setSyncing(true);
    setSyncMessage('');
    try {
      const res = await fetch('/api/admin/sync-instagram', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not check Instagram.');
      setSyncMessage(
        data.added > 0
          ? `Found ${data.added} new post${data.added === 1 ? '' : 's'} — added below as draft${data.added === 1 ? '' : 's'}.`
          : 'No new posts since last check.'
      );
      if (data.added > 0) setActiveTab('unpublished');
      await load();
    } catch (err) {
      setSyncMessage(err.message);
    } finally {
      setSyncing(false);
    }
  }

  // One-time repair for drafts pulled in by "Check Instagram" before the
  // ordering fix — re-stamps each one with its real Instagram post date so
  // the Unpublished tab actually sorts newest-first. Safe to click more
  // than once; anything already correct is left alone, and nothing about
  // the product itself (title, price, category, description) changes.
  async function fixInstagramOrder() {
    setFixingOrder(true);
    setFixMessage('');
    try {
      const res = await fetch('/api/admin/fix-instagram-order', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not fix the order.');
      setFixMessage(
        data.fixed > 0
          ? `Fixed the order for ${data.fixed} draft${data.fixed === 1 ? '' : 's'}.`
          : 'Everything was already in the right order.'
      );
      await load();
    } catch (err) {
      setFixMessage(err.message);
    } finally {
      setFixingOrder(false);
    }
  }

  // Wipes the entire Unpublished backlog in one go — for when it's faster
  // to clear a big pile of old Instagram-sync drafts than to go through
  // them one at a time. Published products are never touched. A deleted
  // Instagram-sourced draft is remembered (see lib/catalog.js) so a future
  // "Check Instagram" sync won't pull the same post back in.
  async function deleteAllUnpublished() {
    const count = (products || []).filter((p) => p.status !== 'published').length;
    if (count === 0) return;
    if (
      !confirm(
        `Delete all ${count} unpublished draft${count === 1 ? '' : 's'}? This can't be undone, and any that came from Instagram won't come back on a future "Check Instagram" sync.`
      )
    ) {
      return;
    }
    setClearingDrafts(true);
    setClearMessage('');
    try {
      const res = await fetch('/api/admin/products/delete-unpublished', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not clear the unpublished drafts.');
      setClearMessage(`Deleted ${data.deleted} draft${data.deleted === 1 ? '' : 's'}.`);
      await load();
    } catch (err) {
      setClearMessage(err.message);
    } finally {
      setClearingDrafts(false);
    }
  }

  // For an account with years of Instagram history: stops "Check Instagram"
  // from ever importing anything posted before right now, so it only ever
  // brings in genuinely new posts instead of trickling in another batch of
  // old backlog every time it's clicked. Doesn't touch any existing draft
  // or published product.
  async function ignoreInstagramBacklog() {
    if (
      !confirm(
        'Stop importing old Instagram posts? Every post currently on Instagram will be treated as already seen — future "Check Instagram" checks will only pull in posts made from now on. This won’t change anything already in your dashboard.'
      )
    ) {
      return;
    }
    setSettingCutoff(true);
    setCutoffMessage('');
    try {
      const res = await fetch('/api/admin/instagram-ignore-backlog', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save that setting.');
      setCutoffMessage('Done — future checks will only pull in new posts from now on.');
    } catch (err) {
      setCutoffMessage(err.message);
    } finally {
      setSettingCutoff(false);
    }
  }

  async function signOut() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  function addNewProduct() {
    setProducts((prev) => [blankProduct(), ...(prev || [])]);
    setActiveTab('unpublished');
    // Clear any active search — otherwise the new blank card (no title yet)
    // wouldn't match and would silently fail to appear.
    setSearch('');
  }

  // "Add several photos": pick or shoot a batch of photos and get one new
  // draft card per photo, each already holding its uploaded picture, ready
  // for a title/category/price. Uploads run one at a time (a batch of
  // full-size phone photos in parallel can choke a mobile connection), and
  // a card appears the moment its own photo lands, so you can start filling
  // in the first while the rest are still uploading. The cards are local
  // until you save each one (same as the "+" button) — its web address is
  // built from the title you give it, so nothing is saved early under a
  // placeholder name.
  async function handleBulkPhotos(e) {
    const files = Array.from(e.target.files || []);
    // Reset so picking the same photos again still fires a change event.
    e.target.value = '';
    if (files.length === 0) return;
    setBulkBusy(true);
    setActiveTab('unpublished');
    setSearch('');
    let done = 0;
    const failed = [];
    for (let i = 0; i < files.length; i++) {
      setBulkStatus(`Uploading photo ${i + 1} of ${files.length}…`);
      try {
        const url = await uploadPhoto(files[i]);
        setProducts((prev) => [blankProduct(url), ...(prev || [])]);
        done++;
      } catch (err) {
        failed.push(`${files[i].name || `photo ${i + 1}`}: ${err.message}`);
      }
    }
    setBulkBusy(false);
    setBulkStatus(
      failed.length === 0
        ? `Added ${done} photo${done === 1 ? '' : 's'} as new drafts. Fill in each title, then Save — photos not saved are lost if you reload this page.`
        : `Added ${done} of ${files.length}. Couldn't upload: ${failed.join('; ')}`
    );
  }

  function handleSaved(updated, localKey) {
    // Stay on whatever tab you're already on — publishing a draft just
    // drops it off the Unpublished list rather than jumping you over to
    // Published, so you can keep publishing the next one without
    // switching tabs back and forth.
    setProducts((prev) =>
      prev.map((p) => {
        const matches = localKey ? p._localKey === localKey : p.id === updated.id;
        return matches ? updated : p;
      })
    );
  }

  function handleDeleted(key, isLocalOnly) {
    setProducts((prev) => prev.filter((p) => (isLocalOnly ? p._localKey !== key : p.id !== key)));
  }

  if (loadError) {
    return <p className="mx-auto max-w-3xl px-4 py-16 text-red-700">{loadError}</p>;
  }

  if (!products) {
    return <p className="mx-auto max-w-3xl px-4 py-16 text-forest/80">Loading…</p>;
  }

  const allDrafts = products.filter((p) => p.status === 'draft');
  const allPublished = products.filter((p) => p.status === 'published');

  // A text filter over whichever tab is open — matches title, description,
  // or category so "153 drafts" becomes "type a few letters" instead of
  // "scroll past 140 of them to find the one you want."
  const query = search.trim().toLowerCase();
  function textMatches(p) {
    if (!query) return true;
    return (
      (p.title || '').toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query) ||
      (p.category || '').toLowerCase().includes(query)
    );
  }
  function filterMatches(p) {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'sold') return Boolean(p.soldOut);
    return p.category === categoryFilter;
  }
  function matches(p) {
    return textMatches(p) && filterMatches(p);
  }
  const drafts = allDrafts.filter(matches);
  const published = allPublished.filter(matches);
  // Counts shown on the filter chips — for whichever tab is open, narrowed
  // by the search box but not by the chip itself.
  const chipBase = (activeTab === 'unpublished' ? allDrafts : allPublished).filter(textMatches);
  const chipCounts = chipBase.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  const soldCount = chipBase.filter((p) => p.soldOut).length;
  const filtering = Boolean(query) || categoryFilter !== 'all';
  const visibleCount = activeTab === 'unpublished' ? drafts.length : published.length;
  const totalCount = activeTab === 'unpublished' ? allDrafts.length : allPublished.length;

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-serif text-3xl text-forest-dark">Products</h1>
          <div className="flex items-center gap-4">
            <Link href="/admin/subscribers" className="text-xs uppercase tracking-widest text-forest/80 hover:text-gold">
              Subscribers
            </Link>
            <button onClick={signOut} className="text-xs uppercase tracking-widest text-forest/80 hover:text-gold">
              Sign out
            </button>
          </div>
        </div>
        <p className="text-sm text-forest/80 mb-4">
          {allDrafts.length} draft{allDrafts.length === 1 ? '' : 's'} · {allPublished.length} live on the site
        </p>

        {/* Sticky so the tabs and search stay reachable while scrolled deep
            into a long draft list — no more scrolling back to the top just
            to switch tabs or clear a search. Sits right at the top of the
            viewport since /admin no longer shares the storefront's own
            sticky header (see components/SiteChrome.js). */}
        <div className="sticky top-0 z-20 bg-cream -mx-4 px-4 sm:-mx-6 sm:px-6 pt-1 pb-3 border-b border-forest/15">
          <div className="flex gap-1 mb-3">
            <button
              type="button"
              onClick={() => { setActiveTab('unpublished'); setCategoryFilter('all'); }}
              aria-current={activeTab === 'unpublished'}
              className={`px-4 py-2.5 text-sm uppercase tracking-wide border-b-2 -mb-px transition-colors ${
                activeTab === 'unpublished'
                  ? 'border-forest text-forest-dark'
                  : 'border-transparent text-forest/50 hover:text-forest-dark'
              }`}
            >
              Unpublished {allDrafts.length > 0 && `(${allDrafts.length})`}
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('published'); setCategoryFilter('all'); }}
              aria-current={activeTab === 'published'}
              className={`px-4 py-2.5 text-sm uppercase tracking-wide border-b-2 -mb-px transition-colors ${
                activeTab === 'published'
                  ? 'border-forest text-forest-dark'
                  : 'border-transparent text-forest/50 hover:text-forest-dark'
              }`}
            >
              Published {allPublished.length > 0 && `(${allPublished.length})`}
            </button>
          </div>
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab === 'unpublished' ? 'drafts' : 'published products'} by name, category…`}
              className="w-full border border-forest/20 rounded-sm pl-9 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gold"
            />
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-forest/40"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { value: 'all', label: 'All', count: chipBase.length },
              ...categories
                .filter((c) => chipCounts[c.slug])
                .map((c) => ({ value: c.slug, label: c.label, count: chipCounts[c.slug] })),
              ...(soldCount > 0 ? [{ value: 'sold', label: 'Sold out', count: soldCount }] : []),
            ].map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setCategoryFilter(chip.value)}
                aria-pressed={categoryFilter === chip.value}
                className={`rounded-full border px-3.5 py-1.5 text-xs tracking-wide transition-colors ${
                  categoryFilter === chip.value
                    ? 'bg-forest text-cream border-forest'
                    : 'border-forest/25 text-forest-dark hover:bg-cream-dark'
                }`}
              >
                {chip.label} <span className="opacity-60">{chip.count}</span>
              </button>
            ))}
          </div>
          {filtering && (
            <p className="text-[11px] text-forest/60 mt-2">
              Showing {visibleCount} of {totalCount}
              {query ? <> matching &quot;{search}&quot;</> : null}
            </p>
          )}
        </div>

        <div className="pt-4">
          {activeTab === 'unpublished' ? (
            <section>
              {allDrafts.length === 0 ? (
                <p className="text-sm text-forest/80">
                  No drafts right now. Tap the + button to add one, or check Instagram for new
                  posts below.
                </p>
              ) : drafts.length === 0 ? (
                <p className="text-sm text-forest/80">No drafts match this search or filter.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-forest/60">
                      {drafts.length} draft{drafts.length === 1 ? '' : 's'} waiting
                    </p>
                    <button
                      type="button"
                      onClick={deleteAllUnpublished}
                      disabled={clearingDrafts}
                      className="text-xs uppercase tracking-widest text-red-700/80 hover:text-red-700 disabled:opacity-60"
                    >
                      {clearingDrafts ? 'Deleting…' : 'Delete all unpublished'}
                    </button>
                  </div>
                  {clearMessage && <p className="text-sm text-forest/80 mb-4">{clearMessage}</p>}
                  <div className="space-y-4">
                    {drafts.map((p) => (
                      <ProductCard key={p._localKey || p.id} product={p} onSaved={handleSaved} onDeleted={handleDeleted} />
                    ))}
                  </div>
                </>
              )}
            </section>
          ) : (
            <section>
              {allPublished.length === 0 ? (
                <p className="text-sm text-forest/80">Nothing published yet.</p>
              ) : published.length === 0 ? (
                <p className="text-sm text-forest/80">No published products match this search or filter.</p>
              ) : (
                <div className="space-y-4">
                  {published.map((p) => (
                    <ProductCard key={p._localKey || p.id} product={p} onSaved={handleSaved} onDeleted={handleDeleted} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Instagram sync tools — used occasionally, not every visit, so
            they sit below the main list rather than competing with Add
            Product / search / tabs for attention at the top of the page. */}
        <div className="mt-12 pt-6 border-t border-forest/10">
          <p className="text-[11px] uppercase tracking-widest text-forest/50 mb-3">Instagram sync</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={checkInstagram}
              disabled={syncing}
              className="border border-forest/30 text-forest-dark px-4 py-2.5 text-xs uppercase tracking-widest hover:bg-forest/10 disabled:opacity-60"
            >
              {syncing ? 'Checking…' : 'Check Instagram for new posts'}
            </button>
            <button
              onClick={fixInstagramOrder}
              disabled={fixingOrder}
              className="border border-forest/20 text-forest-dark/60 px-4 py-2.5 text-xs uppercase tracking-widest hover:bg-forest/10 disabled:opacity-60"
            >
              {fixingOrder ? 'Fixing order…' : 'Fix Instagram draft order'}
            </button>
            <button
              onClick={ignoreInstagramBacklog}
              disabled={settingCutoff}
              className="border border-forest/20 text-forest-dark/60 px-4 py-2.5 text-xs uppercase tracking-widest hover:bg-forest/10 disabled:opacity-60"
            >
              {settingCutoff ? 'Saving…' : 'Only sync new posts from now on'}
            </button>
          </div>
          {syncMessage && <p className="text-sm text-forest/80 mt-3">{syncMessage}</p>}
          {fixMessage && <p className="text-sm text-forest/80 mt-2">{fixMessage}</p>}
          {cutoffMessage && <p className="text-sm text-forest/80 mt-2">{cutoffMessage}</p>}
        </div>
      </div>

      {/* Always reachable, no matter how far you've scrolled into a long
          draft list or which tab you're on — this was the specific
          complaint ("Add New Product is buried"), so it's now a floating
          button rather than one more item in a row of buttons at the top. */}
      {/* Hidden multi-select input behind the "several photos" button.
          Without `capture`, iPhones offer Photo Library (multi-select),
          Take Photo and Choose Files in the picker. */}
      <input
        ref={bulkInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        onChange={handleBulkPhotos}
        className="hidden"
      />
      {bulkStatus && (
        <div className="fixed bottom-44 left-4 right-4 sm:left-auto sm:right-8 sm:max-w-sm z-30 bg-forest-dark text-cream text-xs leading-relaxed rounded-sm shadow-lg px-4 py-3 flex items-start gap-3">
          <p className="flex-1">{bulkStatus}</p>
          {!bulkBusy && (
            <button type="button" onClick={() => setBulkStatus('')} aria-label="Dismiss" className="text-cream/70 hover:text-cream">
              ✕
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => bulkInputRef.current?.click()}
        disabled={bulkBusy}
        aria-label="Add several photos at once"
        className="fixed bottom-[5.5rem] right-5 sm:right-8 z-30 flex items-center gap-2 bg-forest-dark text-cream rounded-full shadow-lg px-5 py-4 text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-transform disabled:opacity-60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="6" width="14" height="14" rx="1.5" />
          <path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3H20a1 1 0 0 1 1 1v11.5a1.5 1.5 0 0 1-1.5 1.5H17" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">{bulkBusy ? 'Uploading…' : 'Several photos'}</span>
      </button>
      <button
        type="button"
        onClick={addNewProduct}
        aria-label="Add new product"
        className="fixed bottom-6 right-5 sm:right-8 z-30 flex items-center gap-2 bg-gold text-forest-dark rounded-full shadow-lg px-5 py-4 text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-transform"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Add Product</span>
      </button>
    </>
  );
}
