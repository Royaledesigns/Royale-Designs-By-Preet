import { removeSubscriber, verifyUnsubscribeToken } from '@/lib/subscribers';

// One-click unsubscribe target for the link at the bottom of every
// announcement email. Public on purpose (no login) — the signed token in
// the link is what proves the request is genuine.

function page(title, body, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head><body style="margin:0;background:#f7f2ea;font-family:Georgia,serif;color:#1d3b2a"><div style="max-width:480px;margin:80px auto;padding:0 24px;text-align:center"><h1 style="font-weight:normal;font-size:26px">${title}</h1><p style="font-size:16px;line-height:1.6">${body}</p><p><a href="/" style="color:#875e1d">Back to Royale Designs by Preet</a></p></div></body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('e') || '';
  const token = searchParams.get('t') || '';

  if (!verifyUnsubscribeToken(email, token)) {
    return page('Link not valid', 'This unsubscribe link looks incomplete. Please reply to any of our emails and we will remove you by hand.', 400);
  }

  try {
    await removeSubscriber(email);
  } catch (err) {
    console.error('Unsubscribe failed:', err);
    return page('Something went wrong', 'We could not process that just now. Please try the link again in a minute.', 500);
  }
  return page('You are unsubscribed', 'You will no longer receive new-arrival emails from us.');
}
