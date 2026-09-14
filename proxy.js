import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, verifySession } from '@/lib/admin-auth';
import { SITE_COOKIE, verifySiteSession } from '@/lib/site-auth';

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // --- Site-wide "coming soon" gate ---
  // Only active while SITE_PASSWORD is set in your environment — remove
  // that variable whenever you're ready to launch for real and this
  // whole block stops doing anything, no code changes needed. While it's
  // on, every page (including /admin) requires the site password first;
  // /admin then still asks for its own separate password after that.
  if (process.env.SITE_PASSWORD) {
    const siteToken = request.cookies.get(SITE_COOKIE)?.value;
    const siteValid = await verifySiteSession(siteToken);
    if (!siteValid) {
      const loginUrl = new URL('/site-login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // --- /admin dashboard auth (unchanged) ---
  // Protects everything under /admin (the dashboard pages) and /api/admin
  // (the endpoints they call), except the login page/route themselves.
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const isLoginPage = pathname === '/admin/login';
    const isLoginApi = pathname === '/api/admin/login';
    if (isLoginPage || isLoginApi) return NextResponse.next();

    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    const valid = await verifySession(token);

    if (!valid) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
      }
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Runs on every route except: Next.js internals, files in /public,
  // the Stripe webhook (Stripe calls this directly — it has no cookie
  // and must never be asked for a password), and the site-login page/API
  // themselves (otherwise nobody could ever reach the unlock screen).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/|api/webhooks|api/site-login|site-login).*)'],
};
