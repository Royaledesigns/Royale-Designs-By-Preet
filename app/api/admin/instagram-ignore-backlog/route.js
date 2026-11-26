import { NextResponse } from 'next/server';
import { setInstagramSyncCutoff } from '@/lib/catalog';

// Called by the "Only sync new posts from now on" button on the admin
// dashboard. Marks every Instagram post that exists right now as "already
// seen," so future "Check Instagram" syncs skip the entire historical
// backlog and only ever pull in posts made after this moment — instead of
// trickling in another batch of old, never-before-imported posts every
// time the button is clicked. Doesn't touch any existing draft or
// published product; those are left exactly as they are. Protected
// automatically by proxy.js's /api/admin/:path* matcher, same as every
// other admin endpoint.
export async function POST() {
  try {
    const cutoff = Date.now();
    await setInstagramSyncCutoff(cutoff);
    return NextResponse.json({ cutoff });
  } catch (err) {
    console.error('Could not set Instagram sync cutoff:', err);
    return NextResponse.json({ error: err.message || 'Could not save that setting.' }, { status: 500 });
  }
}
