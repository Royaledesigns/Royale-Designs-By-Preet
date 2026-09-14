// Session handling for the temporary site-wide "coming soon" password
// gate (see proxy.js + app/site-login). Completely separate from the
// /admin dashboard's own login (lib/admin-auth.js) — this one is just
// meant to be shared with yourself (and anyone you want previewing the
// site) while you finish adding products and pricing.
//
// The whole gate is only active while SITE_PASSWORD is set in your
// environment — remove that variable whenever you're ready to launch for
// real, and every visitor reaches the site normally again, no code
// changes needed.

import { kv, isKvConfigured } from './kv';

export const SITE_COOKIE = 'rd_site_access';
const SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function createSiteSession() {
  const token = crypto.randomUUID();
  await kv.set(`site_session:${token}`, '1', { ex: SESSION_SECONDS });
  return token;
}

export async function verifySiteSession(token) {
  if (!token || !isKvConfigured()) return false;
  const valid = await kv.get(`site_session:${token}`);
  return Boolean(valid);
}
