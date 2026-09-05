'use client';

import { useEffect, useState } from 'react';
import siteConfig from './SiteConfig';

export default function InstagramFeed() {
  const [state, setState] = useState({ loading: true, configured: true, posts: [], error: null });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/instagram')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setState({ loading: false, configured: data.configured, posts: data.posts || [], error: data.error || null });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ loading: false, configured: true, posts: [], error: 'Could not load Instagram posts right now.' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Not set up yet, still loading, or nothing came back — stay quiet rather
  // than showing a half-broken section to real visitors. The console/network
  // tab will still show what happened for you while you're testing.
  if (state.loading || !state.configured || state.posts.length === 0) return null;

  return (
    <section className="bg-cream-dark/60 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-serif text-3xl text-forest-dark">Shop the Feed</h2>
            <p className="text-sm text-forest/60 mt-1">Straight from Instagram — tap a photo to see the post.</p>
          </div>
          <a
            href={siteConfig.social.instagram}
            target="_blank"
            rel="noreferrer"
            className="text-sm uppercase tracking-wider text-forest hover:text-gold whitespace-nowrap"
          >
            Follow {siteConfig.instagramHandle} →
          </a>
        </div>
        {state.error && <p className="text-sm text-red-500 mb-4">{state.error}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {state.posts.map((post) => (
            <a
              key={post.id}
              href={post.permalink}
              target="_blank"
              rel="noreferrer"
              className="group relative aspect-square overflow-hidden rounded-sm bg-cream-dark block"
              title={post.caption ? post.caption.slice(0, 120) : 'View on Instagram'}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.image}
                alt={post.caption ? post.caption.slice(0, 140) : 'Instagram post'}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
