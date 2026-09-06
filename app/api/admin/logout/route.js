import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, destroySession } from '@/lib/admin-auth';

export async function POST(request) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  await destroySession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
