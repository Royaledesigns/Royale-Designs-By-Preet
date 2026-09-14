import { NextResponse } from 'next/server';
import { SITE_COOKIE, createSiteSession } from '@/lib/site-auth';

// Checks the password entered on /site-login against SITE_PASSWORD and,
// if it matches, sets the cookie that lets someone through the site-wide
// gate in proxy.js.
export async function POST(request) {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    return NextResponse.json({ error: 'The site is not password-protected right now.' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!body.password || body.password !== sitePassword) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  try {
    const token = await createSiteSession();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SITE_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    console.error('Could not create site session:', err);
    return NextResponse.json(
      { error: 'Could not start a session — make sure your Redis database is connected (see README).' },
      { status: 500 }
    );
  }
}
