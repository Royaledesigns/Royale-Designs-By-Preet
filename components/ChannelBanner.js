'use client';

import { useState } from 'react';
import { track } from '@vercel/analytics';
import siteConfig from './SiteConfig';
import { logContactEvent } from '@/lib/track-event';

// Homepage invitation to hear about new arrivals first: follow the WhatsApp
// Channel, or leave an email. Channel taps are logged to the Visitors tab;
// email sign-ups go through the same /api/contact newsletter flow as the
// footer form (saved to your subscriber list and the Google Sheet).
export default function ChannelBanner() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');

  async function handleSubscribe(e) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'newsletter', email, message: 'New newsletter signup (homepage)' }),
      });
      if (res.ok) track('Newsletter Signup');
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="bg-forest-dark text-cream">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold mb-2">New arrivals</p>
        <h2 className="font-serif text-2xl sm:text-3xl">See every new piece first</h2>
        <p className="text-cream/75 text-sm mt-2 max-w-xl mx-auto">
          We share new outfits and videos as soon as they go live. Follow on WhatsApp, or get them by email.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-0 md:divide-x md:divide-cream/15 text-left">
          <div className="md:pr-10 flex flex-col items-center md:items-end justify-center gap-3">
            <a
              href={siteConfig.whatsappChannel}
              target="_blank"
              rel="noreferrer"
              onClick={() => logContactEvent('WhatsApp Channel Click', { location: 'homepage', context: 'follow' })}
              className="bg-gold text-forest-dark px-7 py-3 uppercase text-sm tracking-widest hover:opacity-90 transition-opacity"
            >
              Follow on WhatsApp
            </a>
            <p className="text-xs text-cream/60">No replies needed &mdash; just tap Follow.</p>
          </div>

          <div className="md:pl-10 min-w-0">
            <form onSubmit={handleSubscribe} className="flex gap-2 w-full max-w-sm mx-auto md:mx-0">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                aria-label="Email address"
                className="min-w-0 flex-1 rounded-sm px-3 py-3 text-sm text-forest-dark placeholder:text-forest-dark/50 bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <button
                type="submit"
                disabled={status === 'sending' || status === 'success'}
                className="rounded-sm border border-gold text-gold flex-shrink-0 px-4 sm:px-5 py-3 text-sm uppercase tracking-widest hover:bg-gold hover:text-forest-dark transition-colors disabled:opacity-60"
              >
                {status === 'sending' ? '...' : 'Notify me'}
              </button>
            </form>
            {status === 'success' && (
              <p className="text-xs text-blush mt-2 text-center md:text-left">Thank you &mdash; you&rsquo;re on the list.</p>
            )}
            {status === 'error' && (
              <p className="text-xs text-red-300 mt-2 text-center md:text-left">Something went wrong, please try again.</p>
            )}
            <p className="text-[11px] text-cream/50 mt-2 text-center md:text-left">
              New arrivals only. Unsubscribe any time.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
