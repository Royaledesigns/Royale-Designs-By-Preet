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
function blankProduct() {
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
    image: null,
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

  function setSizeQty(size, rawValue) {
    const qty = Math.max(0, parseInt(rawValue, 10) || 0);
    setForm((f) => ({ ...f, availableSizes: { ...f.availableSizes, [size]: qty } }));
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not upload that photo.');
      set('image', data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      // Reset so choosing the same file again still fires a change event.
      e.target.value = '';
    }
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
      <div className="relative w-full sm:w-32 aspect-[3/4] sm:aspect-square flex-none rounded-sm overflow-hidden bg-cream-dark">
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
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [fixingOrder, setFixingOrder] = useState(false);
  const [fixMessage, setFixMessage] = useState('');
  // Which tab is showing — starts on Unpublished since that's usually the
  // "needs action" inbox (new Instagram drafts, pieces you haven't priced
  // yet), with Published as the other tab rather than both lists stacked.
  const [activeTab, setActiveTab] = useState('unpublished');
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

  async function signOut() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  function addNewProduct() {
    setProducts((prev) => [blankProduct(), ...(prev || [])]);
    setActiveTab('unpublished');
  }

  function handleSaved(updated, localKey) {
    // Follow a product across tabs when its status actually changed —
    // hitting Publish moves it to the Published tab, Unpublish moves it
    // back — rather than leaving it to seemingly vanish from the tab
    // you're looking at.
    const previous = (products || []).find((p) => (localKey ? p._localKey === localKey : p.id === updated.id));
    if (previous && previous.status !== updated.status) {
      setActiveTab(updated.status === 'published' ? 'published' : 'unpublished');
    }
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

  const drafts = products.filter((p) => p.status === 'draft');
  const published = products.filter((p) => p.status === 'published');

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
      <div className="flex items-center justify-between mb-2">
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
      <p className="text-sm text-forest/80 mb-6">
        {drafts.length} draft{drafts.length === 1 ? '' : 's'} · {published.length} live on the site
      </p>

      <div className="flex flex-wrap gap-2 mb-2">
        <button
          onClick={addNewProduct}
          className="w-full sm:w-auto border border-forest text-forest-dark px-6 py-3 uppercase text-sm tracking-widest hover:bg-forest hover:text-cream"
        >
          + Add New Product
        </button>
        <button
          onClick={checkInstagram}
          disabled={syncing}
          className="w-full sm:w-auto bg-forest text-cream px-6 py-3 uppercase text-sm tracking-widest hover:bg-forest-dark disabled:opacity-60"
        >
          {syncing ? 'Checking…' : 'Check Instagram for new posts'}
        </button>
        <button
          onClick={fixInstagramOrder}
          disabled={fixingOrder}
          className="w-full sm:w-auto border border-forest/30 text-forest-dark/70 px-6 py-3 uppercase text-xs tracking-widest hover:bg-forest/10 disabled:opacity-60"
        >
          {fixingOrder ? 'Fixing order…' : 'Fix Instagram draft order'}
        </button>
      </div>
      <p className="text-[11px] text-forest/60 mb-6">
        Adding a new product? Tap &quot;Upload photo&quot; on the blank card below — on your
        iPhone this opens the option to take a photo or choose one from your library, no need to
        post it to Instagram first.
      </p>
      {syncMessage && <p className="text-sm text-forest/80 mb-2">{syncMessage}</p>}
      {fixMessage && <p className="text-sm text-forest/80 mb-8">{fixMessage}</p>}

      <div className="flex gap-1 border-b border-forest/15 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('unpublished')}
          aria-current={activeTab === 'unpublished'}
          className={`px-4 py-2.5 text-sm uppercase tracking-wide border-b-2 -mb-px transition-colors ${
            activeTab === 'unpublished'
              ? 'border-forest text-forest-dark'
              : 'border-transparent text-forest/50 hover:text-forest-dark'
          }`}
        >
          Unpublished {drafts.length > 0 && `(${drafts.length})`}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('published')}
          aria-current={activeTab === 'published'}
          className={`px-4 py-2.5 text-sm uppercase tracking-wide border-b-2 -mb-px transition-colors ${
            activeTab === 'published'
              ? 'border-forest text-forest-dark'
              : 'border-transparent text-forest/50 hover:text-forest-dark'
          }`}
        >
          Published {published.length > 0 && `(${published.length})`}
        </button>
      </div>

      {activeTab === 'unpublished' ? (
        <section>
          {drafts.length === 0 ? (
            <p className="text-sm text-forest/80">
              No drafts right now. Add one with the button above, or check Instagram for new posts.
            </p>
          ) : (
            <div className="space-y-4">
              {drafts.map((p) => (
                <ProductCard key={p._localKey || p.id} product={p} onSaved={handleSaved} onDeleted={handleDeleted} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section>
          {published.length === 0 ? (
            <p className="text-sm text-forest/80">Nothing published yet.</p>
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
  );
}
