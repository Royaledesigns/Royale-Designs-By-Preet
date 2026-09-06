import { NextResponse } from 'next/server';
import { isKvConfigured } from '@/lib/kv';
import { ADMIN_COOKIE, createSession } from '@/lib/admin-auth';

export async function POST(request) {
  if (!isKvConfigured()) {
    return NextResponse.json(
      {
        error:
          'The product database isn’t connected yet. In Vercel, go to Storage → Create Database → KV and connect it to this project, then redeploy.',
      },
      { status: 500 }
    );
  }

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD is not set in your environment variables yet.' },
      { status: 500 }
    );
  }

  const { password } = await request.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  const token = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
