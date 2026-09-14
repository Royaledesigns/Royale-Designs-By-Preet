import { NextResponse } from 'next/server';
import { getAllSubscribers } from '@/lib/subscribers';

// Protected by proxy.js (matches /api/admin/:path*) — same admin session
// check as every other /api/admin route, no extra auth needed here.
export async function GET() {
  try {
    const subscribers = await getAllSubscribers();
    return NextResponse.json({ subscribers });
  } catch (err) {
    console.error('Could not load subscribers:', err);
    return NextResponse.json({ error: 'Could not load subscribers.' }, { status: 500 });
  }
}
