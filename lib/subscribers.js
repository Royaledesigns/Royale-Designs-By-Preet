// Newsletter / "interested but haven't bought yet" customer list.
//
// Everyone who *buys* something already gets a customer record in Stripe
// automatically (see app/api/checkout/route.js's customer_creation), so
// this file only needs to cover the other half: people who signed up for
// updates via the footer newsletter form without placing an order yet.
// Same Redis-backed pattern as lib/catalog.js — safe to import even
// before KV is connected, it just no-ops until then.

import { createHmac, timingSafeEqual } from 'crypto';
import { kv, isKvConfigured } from './kv';

const INDEX_KEY = 'subscribers:index';

function subscriberKey(id) {
  return `subscriber:${id}`;
}

function normaliseEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Saves (or updates) a newsletter signup. Using the email itself as the
// record id means signing up twice just refreshes the same entry instead
// of creating a duplicate.
export async function addSubscriber({ email, name = '' }) {
  if (!isKvConfigured()) return null; // quietly no-op until KV is connected
  const id = normaliseEmail(email);
  if (!id) return null;

  const existing = await kv.get(subscriberKey(id));
  const record = {
    id,
    email: id,
    name: name || existing?.name || '',
    source: 'newsletter',
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  await kv.set(subscriberKey(id), record);
  await kv.sadd(INDEX_KEY, id);
  return record;
}

export async function getAllSubscribers() {
  if (!isKvConfigured()) return [];
  const ids = await kv.smembers(INDEX_KEY);
  if (!ids || ids.length === 0) return [];
  const records = await Promise.all(ids.map((id) => kv.get(subscriberKey(id))));
  return records.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt);
}

// --- Unsubscribe support -------------------------------------------------
// Every announcement email carries a one-click unsubscribe link. The link
// is signed with a secret (UNSUBSCRIBE_SECRET, falling back to
// ADMIN_PASSWORD) so nobody can unsubscribe somebody else by guessing
// their email address.

function unsubscribeSecret() {
  return process.env.UNSUBSCRIBE_SECRET || process.env.ADMIN_PASSWORD || '';
}

export function unsubscribeToken(email) {
  const secret = unsubscribeSecret();
  if (!secret) return '';
  return createHmac('sha256', secret).update(normaliseEmail(email)).digest('hex').slice(0, 32);
}

export function verifyUnsubscribeToken(email, token) {
  const expected = unsubscribeToken(email);
  if (!expected || !token || expected.length !== String(token).length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(String(token)));
}

export async function removeSubscriber(email) {
  if (!isKvConfigured()) return false;
  const id = normaliseEmail(email);
  if (!id) return false;
  await kv.del(subscriberKey(id));
  await kv.srem(INDEX_KEY, id);
  return true;
}
