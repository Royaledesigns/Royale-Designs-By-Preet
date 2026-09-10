'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { categories, getSizesForCategory, isUnsizedCategory } from '@/data/products';

function emptyForm(product) {
  return {
    id: product.id,
    title: product.title || '',
    category: product.category || '',
    price: product.price ?? '',
    description: product.description || '',
    customStitch: product.customStitch !== false,
    // Which sizes are actually made for this piece — starts empty so you
    // choose the 1-2 ready sizes yourself; anything left unchecked shows
    // greyed out on the site, with Custom left as the fallback.
    availableSizes: Array.isArray(product.availableSizes) ? product.availableSizes : [],
    soldOut: product.soldOut || false,
    image: product.image,
    status: product.status,
    source: product.source,
    instagramMediaId: product.instagramMediaId,
    instagramPermalink: product.instagramPermalink,
    instagramLinkVerified: product.instagramLinkVerified || false,
  };
}

function ProductCard({ product, onSaved, onDeleted }) {
  const [form, setForm] = useState(emptyForm(product));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const isDraft = product.status === 'draft';
  const isUnsized = isUnsizedCategory(form.category);
  const sizeOptions = getSizesForCategory(form.category);

  function set(field, value) {
    if (field === 'category') {
      // Clothing sizes and EU shoe sizes don't overlap — clear whatever was
      // ticked so a stale size from the old category can't stick around.
      setForm((f) => ({ ...f, category: value, availableSizes: [] }));
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

  function toggleSize(size) {
    setForm((f) => {
      const isActive = f.availableSizes.includes(size);
      const availableSizes = isActive
        ? f.availableSizes.filter((s) => s !== size)
        : [...f.availableSizes, size];
      return { ...f, availableSizes };
    });
  }

  async function save(nextStatus) {
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
        body: JSON.stringify({ ...form, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      onSaved(data.product);
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
        {form.image && <Image src={form.image} alt={form.title} fill className="object-cover" unoptimized />}
        {form.soldOut && (
          <div className="absolute inset-0 bg-forest-dark/50 flex items-center justify-center">
            <span className="text-cream text-xs uppercase tracking-widest border border-cream px-2 py-1">
              Sold Out
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] uppercase tracking-widest text-gold-dark">
            {product.source === 'instagram' ? 'From Instagram' : 'Manual'} · {product.status}
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
              onClick={() => set('soldOut', !form.soldOut)}
              className={`text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-sm border transition-colors ${
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

        {!isUnsized && (
          <div>
            <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">
              Sizes ready to ship
            </label>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((s) => {
                const active = form.availableSizes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    aria-pressed={active}
                    className={`px-3.5 py-1.5 text-xs uppercase tracking-wide rounded-sm border transition-colors ${
                      active
                        ? 'bg-forest text-cream border-forest'
                        : 'bg-cream-dark/50 text-forest/40 border-forest/15 hover:text-forest/70'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-forest/60 mt-1.5">
              Tap a size to mark it ready-made (shown active on the site). Sizes left grey show as
              unavailable, so shoppers know to order those as a custom stitch instead.
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
      await load();
    } catch (err) {
      setSyncMessage(err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function signOut() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  function handleSaved(updated) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function handleDeleted(id) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
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
        <button onClick={signOut} className="text-xs uppercase tracking-widest text-forest/80 hover:text-gold">
          Sign out
        </button>
      </div>
      <p className="text-sm text-forest/80 mb-6">
        {drafts.length} draft{drafts.length === 1 ? '' : 's'} · {published.length} live on the site
      </p>

      <button
        onClick={checkInstagram}
        disabled={syncing}
        className="w-full sm:w-auto bg-forest text-cream px-6 py-3 uppercase text-sm tracking-widest hover:bg-forest-dark disabled:opacity-60 mb-2"
      >
        {syncing ? 'Checking…' : 'Check Instagram for new posts'}
      </button>
      {syncMessage && <p className="text-sm text-forest/80 mb-8">{syncMessage}</p>}

      <section className="mb-12">
        <h2 className="font-serif text-xl text-forest-dark mb-4">
          Drafts {drafts.length > 0 && `(${drafts.length})`}
        </h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-forest/80">
            No drafts right now. New Instagram posts land here — check the button above after posting.
          </p>
        ) : (
          <div className="space-y-4">
            {drafts.map((p) => (
              <ProductCard key={p.id} product={p} onSaved={handleSaved} onDeleted={handleDeleted} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-serif text-xl text-forest-dark mb-4">Live on the site</h2>
        {published.length === 0 ? (
          <p className="text-sm text-forest/80">Nothing published yet.</p>
        ) : (
          <div className="space-y-4">
            {published.map((p) => (
              <ProductCard key={p.id} product={p} onSaved={handleSaved} onDeleted={handleDeleted} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
