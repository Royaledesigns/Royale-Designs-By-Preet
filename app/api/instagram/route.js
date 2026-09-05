import { NextResponse } from 'next/server';

// Pulls your most recent Instagram posts so the homepage can show a live
// "Shop the Feed" section instead of hand-updated photos.
//
// Setup (see README.md for the full walkthrough):
//   1. Your Instagram account must be a Business or Creator account.
//   2. Create a Meta app and get a long-lived Instagram access token for
//      your own account (no App Review needed for displaying your own
//      posts).
//   3. Add INSTAGRAM_ACCESS_TOKEN to your environment.
//
// Long-lived tokens expire after 60 days and need refreshing — see the
// README for the one-line refresh command.

// Re-fetch at most once an hour so a single storefront doesn't burn through
// API rate limits.
export const revalidate = 3600;

export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json({ configured: false, posts: [] });
  }

  try {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    const url = `https://graph.instagram.com/me/media?fields=${fields}&limit=8&access_token=${token}`;
    const res = await fetch(url, { next: { revalidate } });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Instagram API error:', res.status, errBody);
      return NextResponse.json(
        { configured: true, posts: [], error: 'Could not load Instagram posts right now.' },
        { status: 200 }
      );
    }

    const data = await res.json();
    const posts = (data.data || [])
      // Skip videos in the grid (we show the still thumbnail if present,
      // otherwise fall back to the media itself for images/carousels).
      .map((item) => ({
        id: item.id,
        caption: item.caption || '',
        permalink: item.permalink,
        image: item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url,
        timestamp: item.timestamp,
      }))
      .filter((item) => Boolean(item.image))
      .slice(0, 8);

    return NextResponse.json({ configured: true, posts });
  } catch (err) {
    console.error('Instagram feed fetch failed:', err);
    return NextResponse.json(
      { configured: true, posts: [], error: 'Could not load Instagram posts right now.' },
      { status: 200 }
    );
  }
}
