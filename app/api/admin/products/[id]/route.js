import { NextResponse } from 'next/server';
import { deleteProduct } from '@/lib/catalog';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Product delete failed:', err);
    return NextResponse.json({ error: err.message || 'Could not delete product.' }, { status: 500 });
  }
}
