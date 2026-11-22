import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { deleteProduct } from '@/lib/catalog';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await deleteProduct(id);
    // See app/api/admin/products/route.js — pages are cached for 5 minutes,
    // so without this a deleted/unpublished product would keep showing on
    // the live site until that cache happened to expire.
    revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Product delete failed:', err);
    return NextResponse.json({ error: err.message || 'Could not delete product.' }, { status: 500 });
  }
}
