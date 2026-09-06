// Minimal single-admin session handling for /admin.
//
// There's only one admin (you), so this skips full user accounts: logging
// in with ADMIN_PASSWORD creates a random session token stored in KV for 30
// days, and that token is set as an httpOnly cookie in your browser. No
// password or token is ever stored in the cookie itself.

import { kv, isKvConfigured } from './kv';

export const ADMIN_COOKIE = 'rd_admin_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function createSession() {
  const token = crypto.randomUUID();
  await kv.set(`admin_session:${token}`, '1', { ex: SESSION_SECONDS });
  return token;
}

export async function verifySession(token) {
  if (!token || !isKvConfigured()) return false;
  const valid = await kv.get(`admin_session:${token}`);
  return Boolean(valid);
}

export async function destroySession(token) {
  if (!token) return;
  await kv.del(`admin_session:${token}`);
}
