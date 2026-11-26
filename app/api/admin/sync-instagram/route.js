import { NextResponse } from 'next/server';
import { getSeenInstagramIds, upsertProduct } from '@/lib/catalog';
import { isKvConfigured, kv } from '@/lib/kv';
import { isBlobConfigured, rehostImage } from '@/lib/blob';

// Pulls your most recent Instagram posts (photos and videos, up to
// MAX_POSTS) and creates a draft product for any that aren't already in the
// catalog. Nothing here goes live — drafts sit in the dashboard until you
// add a price and hit Publish. Call this from the admin dashboard's "Check
// Instagram" button (there's no live push from Instagram — this is a
// manual/on-open check).
const PAGE_SIZE = 100; // Instagram's max items per page
const MAX_POSTS = 300; // how far back to look, across as many pages as it takes

// A sync covering hundreds of posts can take a while (each new post also
// gets re-hosted into Blob storage) — give it more room than the default
// 10s so it isn't cut off partway through.
export const maxDuration = 60;

// Matches the start of the standard ordering notice every caption repeats
// near-verbatim ("Tarneit Melbourne Australia❤️Dear customers, We accept
// orders only through our official registered WhatsApp number..."). Title
// and Description are seeded from whatever text comes before this point,
// so a caption that's nothing but the notice itself yields an empty
// string (handled by the caller) rather than the notice landing in either
// field.
const ORDERING_NOTICE_MARKER = /tarneit\s*melbourne\s*australia/i;

// Guards against two overlapping "Check Instagram" clicks (e.g. an impatient
// double-click, or one click while a previous sync is still running) both
// re-hosting the same not-yet-saved post's photo into Blob storage — each
// one would otherwise produce its own duplicate file, since neither can see
// the other's in-progress work. 90s comfortably outlasts a single sync (see
// maxDuration above) so the lock can't outlive the run that set it by much.
const SYNC_LOCK_KEY = 'instagram-sync-lock';
const SYNC_LOCK_TTL_SECONDS = 90;

function stripOrderingBoilerplate(caption) {
  if (!caption) return '';
  const match = caption.match(ORDERING_NOTICE_MARKER);
  const specific = match ? caption.slice(0, match.index) : caption;
  return specific.trim();
}

export async function POST() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: 'INSTAGRAM_ACCESS_TOKEN is not set yet — see README for setup steps.' },
      { status: 500 }
    );
  }
  if (!isKvConfigured()) {
    return NextResponse.json(
      { error: 'The product database isn’t connected yet — connect KV in Vercel first.' },
      { status: 500 }
    );
  }

  // Claim the lock before doing anything else. set(..., { nx: true }) only
  // succeeds if the key doesn't already exist, so if another sync is still
  // running (or just started a moment ago), this bails out immediately
  // instead of racing it.
  let lockAcquired = false;
  try {
    const claimed = await kv.set(SYNC_LOCK_KEY, String(Date.now()), {
      nx: true,
      ex: SYNC_LOCK_TTL_SECONDS,
    });
    lockAcquired = claimed === 'OK' || claimed === true;
  } catch (err) {
    console.error('Could not check Instagram sync lock:', err);
  }
  if (!lockAcquired) {
    return NextResponse.json(
      {
        error:
          'An Instagram check is already in progress — give it a minute to finish, then try again.',
      },
      { status: 409 }
    );
  }

  try {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    let nextUrl = `https://graph.instagram.com/me/media?fields=${fields}&limit=${PAGE_SIZE}&access_token=${token}`;

    // Walk Instagram's pages until we've collected MAX_POSTS or run out of
    // pages — a single request only ever returns one page (max ~100 items),
    // so this is what actually lets the sync see further back than that.
    const posts = [];
    while (nextUrl && posts.length < MAX_POSTS) {
      const res = await fetch(nextUrl, { cache: 'no-store' });

      if (!res.ok) {
        const errBody = await res.text();
        console.error('Instagram sync error:', res.status, errBody);
        // If earlier pages already came through, use what we've got rather
        // than throwing the whole sync away over one failed page.
        if (posts.length === 0) {
          return NextResponse.json({ error: 'Could not reach Instagram right now.' }, { status: 502 });
        }
        break;
      }

      const data = await res.json();
      posts.push(...(data.data || []));
      nextUrl = data.paging?.next || null;
    }
    posts.length = Math.min(posts.length, MAX_POSTS);

    // Covers posts already in the catalog AND ones deliberately deleted
    // before (see lib/catalog.js) — otherwise clearing a draft out just
    // makes it look "new" again to the very next sync.
    const seenIds = await getSeenInstagramIds();

    const added = [];
    for (const item of posts) {
      if (seenIds.has(item.id)) continue;
      const image = item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url;
      if (!image) continue;

      // Nearly every caption opens with the same repeated ordering notice
      // ("Tarneit Melbourne Australia... Dear customers, We accept orders
      // only through our official registered WhatsApp number...") — useful
      // on Instagram itself, but not something worth leaving in the Title
      // or Description box here, where it just has to be deleted by hand
      // before every single publish. Cut the caption off at the start of
      // that notice and keep only whatever specific text (if any) was
      // written before it.
      const specificText = stripOrderingBoilerplate(item.caption);

      const title = specificText
        ? specificText.slice(0, 70)
        : `New piece — ${new Date(item.timestamp).toLocaleDateString('en-AU')}`;

      // Copy the photo into permanent storage when available, so it doesn't
      // stop loading once Instagram's signed URL expires. If Blob isn't
      // connected yet, fall back to Instagram's URL rather than failing.
      let finalImage = image;
      if (isBlobConfigured()) {
        try {
          finalImage = await rehostImage(image, item.id);
        } catch (err) {
          console.error('Image re-host failed, using Instagram URL for now:', err);
        }
      }

      const record = await upsertProduct({
        title,
        description: specificText,
        image: finalImage,
        category: null,
        price: null,
        customStitch: true,
        status: 'draft',
        source: 'instagram',
        instagramMediaId: item.id,
        instagramPermalink: item.permalink,
        // Use the post's own Instagram timestamp, not the moment this loop
        // happens to reach it — otherwise drafts end up ordered by how long
        // the sync took to process each one instead of by which post is
        // actually newest, and the latest post can land at the bottom of
        // the Unpublished tab instead of the top.
        createdAt: item.timestamp ? new Date(item.timestamp).getTime() : undefined,
      });
      added.push(record);
    }

    return NextResponse.json({ added: added.length, products: added });
  } catch (err) {
    console.error('Instagram sync failed:', err);
    return NextResponse.json({ error: 'Could not sync Instagram posts.' }, { status: 500 });
  } finally {
    // Always release, win or lose, so a failed run doesn't block the next
    // legitimate check for the full 90s TTL.
    kv.del(SYNC_LOCK_KEY).catch((err) => {
      console.error('Could not release Instagram sync lock (it will expire on its own):', err);
    });
  }
}
