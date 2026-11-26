import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAllProductsAdmin, deleteProduct } from '@/lib/catalog';

// Clears the entire Unpublished (draft) backlog in one go — used by the
// "Delete all unpublished" button on the admin dashboard, for when it's
// faster to wipe a big pile of old Instagram-sync drafts than to publish
// or individually discard each one. Published products are never touched.
//
// deleteProduct() (see lib/catalog.js) records the Instagram media id of
// anything deleted here that came from Instagram, so a future "Check
// Instagram for new posts" sync won't pull the same post back in as a
// fresh draft.
export async function POST() {
  try {
    const products = await getAllProductsAdmin();
    const drafts = products.filter((p) => p.status !== 'published');

    let deleted = 0;
    for (const p of drafts) {
      try {
        await deleteProduct(p.id);
        deleted += 1;
      } catch (err) {
        console.error('Could not delete draft during bulk clear:', p.id, err);
      }
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ deleted });
  } catch (err) {
    console.error('Bulk delete of unpublished products failed:', err);
    return NextResponse.json({ error: err.message || 'Could not clear unpublished products.' }, { status: 500 });
  }
}
