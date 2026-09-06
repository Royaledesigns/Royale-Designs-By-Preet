import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, verifySession } from '@/lib/admin-auth';

// Protects everything under /admin (the dashboard pages) and /api/admin
// (the endpoints they call), except the login page/route themselves.
export async function proxy(request) {
  const { pathname } = request.nextUrl;

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

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
