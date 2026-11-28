import { NextResponse } from 'next/server';
import { getProduct } from '@/lib/catalog';
import { getAllSubscribers, unsubscribeToken } from '@/lib/subscribers';
import { kv, isKvConfigured } from '@/lib/kv';
import siteConfig from '@/components/SiteConfig';

// "Email subscribers" button in the admin. Sends one new-arrival email to
// everyone on the newsletter list (the footer / homepage sign-ups) through
// Resend. Protected by proxy.js's /api/admin/:path* matcher.
//
//   GET  ?id=<product id>  → { count, alreadySentAt, emailReady }  (dry run)
//   POST { id, force? }    → sends; refuses to send the same product twice
//                            unless force is true.

export const runtime = 'nodejs';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.royaledesigns.com.au';
const FROM = `${siteConfig.name} <noreply@royaledesigns.com.au>`;
const sentKey = (id) => `product-notified:${id}`;

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function absolute(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function buildEmail(product, subscriber) {
  const link = `${SITE_URL}/product/${product.handle}`;
  const unsub = `${SITE_URL}/api/unsubscribe?e=${encodeURIComponent(subscriber.email)}&t=${unsubscribeToken(subscriber.email)}`;
  const price =
    product.price !== '' && product.price != null ? `$${Number(product.price).toLocaleString('en-AU')} AUD` : '';
  const image = absolute(product.image);

  const text = [
    'New arrival at Royale Designs by Preet',
    '',
    product.title,
    price,
    '',
    `See it here: ${link}`,
    `Order or ask about sizes on WhatsApp: ${siteConfig.social.whatsapp}`,
    '',
    '---',
    `${siteConfig.name}, ${siteConfig.location}`,
    `You are getting this because you signed up at royaledesigns.com.au. Unsubscribe: ${unsub}`,
  ]
    .filter((l) => l !== null)
    .join('\n');

  const html = `<!doctype html><html><body style="margin:0;background:#f7f2ea;font-family:Georgia,serif;color:#1d3b2a">
<div style="max-width:520px;margin:0 auto;padding:28px 20px">
<p style="text-align:center;letter-spacing:3px;font-size:11px;text-transform:uppercase;color:#875e1d;margin:0 0 18px">New arrival</p>
${image ? `<a href="${esc(link)}"><img src="${esc(image)}" alt="${esc(product.title)}" width="480" style="width:100%;max-width:480px;height:auto;display:block;border:0"></a>` : ''}
<h1 style="font-weight:normal;font-size:24px;text-align:center;margin:22px 0 6px">${esc(product.title)}</h1>
${price ? `<p style="text-align:center;margin:0 0 22px;font-size:16px">${esc(price)}</p>` : ''}
<p style="text-align:center;margin:0 0 26px"><a href="${esc(link)}" style="background:#d9a233;color:#1d3b2a;text-decoration:none;padding:13px 28px;font-size:13px;letter-spacing:2px;text-transform:uppercase">View the piece</a></p>
<p style="text-align:center;font-size:14px;margin:0 0 30px">Questions or sizes? <a href="${esc(siteConfig.social.whatsapp)}" style="color:#875e1d">Message us on WhatsApp</a></p>
<hr style="border:none;border-top:1px solid #d8cfbf;margin:0 0 16px">
<p style="text-align:center;font-size:11px;line-height:1.6;color:#6b7a70;margin:0">${esc(siteConfig.name)}, ${esc(siteConfig.location)}<br>You are getting this because you signed up at royaledesigns.com.au.<br><a href="${esc(unsub)}" style="color:#6b7a70">Unsubscribe</a></p>
</div></body></html>`;

  return {
    from: FROM,
    to: subscriber.email,
    reply_to: siteConfig.email,
    subject: `New arrival: ${product.title}`,
    text,
    html,
    headers: {
      'List-Unsubscribe': `<${unsub}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

async function loadContext(id) {
  if (!isKvConfigured()) return { error: 'Database is not connected.' };
  const product = await getProduct(id);
  if (!product) return { error: 'Publish this product first — only published products can be emailed.' };
  const subscribers = await getAllSubscribers();
  const alreadySentAt = (await kv.get(sentKey(product.handle))) || null;
  return { product, subscribers, alreadySentAt };
}

export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id') || '';
  try {
    const ctx = await loadContext(id);
    if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: 400 });
    return NextResponse.json({
      count: ctx.subscribers.length,
      alreadySentAt: ctx.alreadySentAt,
      emailReady: Boolean(process.env.RESEND_API_KEY),
    });
  } catch (err) {
    console.error('notify-subscribers GET failed:', err);
    return NextResponse.json({ error: 'Could not check your subscriber list.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { id = '', force = false } = await request.json().catch(() => ({}));

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Email sending is not set up yet — add RESEND_API_KEY in Vercel (see README).' },
      { status: 400 }
    );
  }
  if (!process.env.UNSUBSCRIBE_SECRET && !process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'No secret is available to sign unsubscribe links.' }, { status: 400 });
  }

  try {
    const ctx = await loadContext(id);
    if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: 400 });
    if (ctx.alreadySentAt && !force) {
      return NextResponse.json({ error: 'Already emailed.', alreadySentAt: ctx.alreadySentAt }, { status: 409 });
    }
    if (ctx.subscribers.length === 0) {
      return NextResponse.json({ error: 'You have no subscribers yet.' }, { status: 400 });
    }

    let sent = 0;
    let failed = 0;
    for (let i = 0; i < ctx.subscribers.length; i += 100) {
      const chunk = ctx.subscribers.slice(i, i + 100).map((s) => buildEmail(ctx.product, s));
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (res.ok) {
        sent += chunk.length;
      } else {
        failed += chunk.length;
        console.error('Resend batch error:', await res.text());
      }
    }

    if (sent > 0) await kv.set(sentKey(ctx.product.handle), Date.now());
    if (sent === 0) {
      return NextResponse.json(
        { error: 'Resend refused the emails — check that royaledesigns.com.au is verified in Resend.' },
        { status: 502 }
      );
    }
    return NextResponse.json({ sent, failed });
  } catch (err) {
    console.error('notify-subscribers POST failed:', err);
    return NextResponse.json({ error: 'Could not send the emails.' }, { status: 500 });
  }
}
