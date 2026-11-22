'use client';

import { track } from '@vercel/analytics';

// Logs a "someone tried to contact me" moment in two places at once:
//
// 1. Vercel Analytics' custom events (track()) — sent either way, so if
//    you ever upgrade to a Vercel Pro team, this starts showing up there
//    too with no code change needed. On the free Hobby plan these are
//    silently discarded by Vercel rather than shown anywhere, which is
//    exactly why #2 exists.
// 2. Your Google Sheet (via /api/track-event — see that route for why),
//    which is what actually lets you see these counts today for free,
//    right alongside your Contact Form / Newsletter Signup rows.
//
// Fire-and-forget on purpose: this is called from onClick handlers on
// links that are about to open WhatsApp in a new tab, so nothing here
// should ever delay or block that from happening.
export function logContactEvent(event, details = {}) {
  track(event, details);

  try {
    fetch('/api/track-event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event, ...details }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never let analytics logging break the actual click.
  }
}
