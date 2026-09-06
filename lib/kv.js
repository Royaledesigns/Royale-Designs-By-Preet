// Thin wrapper around a Redis-compatible KV store (Upstash Redis).
//
// Setup: in your Vercel project, go to Storage → Marketplace Database →
// search "Redis" → install the Upstash integration → connect it to this
// project. That automatically adds the right environment variables — no
// extra config needed here. (Older projects may instead see
// KV_REST_API_URL / KV_REST_API_TOKEN from the now-deprecated "Vercel KV"
// product — both naming schemes are supported below.)
//
// Everything in this file is safe to import even before it's connected:
// isKvConfigured() lets the rest of the app fall back to the static
// product catalog until you've set it up.

import { Redis } from '@upstash/redis';

function getCredentials() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

export function isKvConfigured() {
  const { url, token } = getCredentials();
  return Boolean(url && token);
}

let client = null;
function getClient() {
  if (client) return client;
  const { url, token } = getCredentials();
  if (!url || !token) {
    throw new Error(
      'Redis is not connected yet — in Vercel, go to Storage → Marketplace Database → Redis, then connect it to this project.'
    );
  }
  client = new Redis({ url, token });
  return client;
}

// Minimal subset of the Redis API used elsewhere in this app, proxied
// lazily so importing this file never throws before it's configured.
export const kv = {
  get: (key) => getClient().get(key),
  set: (key, value, opts) => getClient().set(key, value, opts),
  del: (key) => getClient().del(key),
  sadd: (key, member) => getClient().sadd(key, member),
  srem: (key, member) => getClient().srem(key, member),
  smembers: (key) => getClient().smembers(key),
};
