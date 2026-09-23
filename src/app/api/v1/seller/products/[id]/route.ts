import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { id } = await context.params;
  const { data: product } = await supabase
    .from('products')
    .select('id, approval_status, resubmit_count, seller_id')
    .eq('id', id)
    .eq('seller_id', session.user.id)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: 'Product was not found.' }, { status: 404 });
  if (product.approval_status === 'approved') {
    return NextResponse.json({ error: 'Approved products are view only.' }, { status: 403 });
  }

  const body: unknown = await request.json();
  const record = body && typeof body === 'object' ? body : {};
  const resubmit = 'resubmit' in record && record.resubmit === true;
  if (product.approval_status === 'rejected' && resubmit && product.resubmit_count >= 3) {
    return NextResponse.json({ error: 'This listing cannot be sent again. Contact an admin.' }, { status: 403 });
  }

  const text = (key: string) => key in record && typeof record[key as keyof typeof record] === 'string'
    ? String(record[key as keyof typeof record])
    : undefined;
  const { error } = await supabase.from('products').update({
    title: text('title'),
    description: text('description'),
    price: 'price' in record && typeof record.price === 'number' ? record.price : undefined,
    stock: 'stock' in record && typeof record.stock === 'number' ? record.stock : undefined,
    category: text('category'),
    sub_category: text('subCategory'),
    approval_status: product.approval_status === 'rejected' && resubmit ? 'pending' : undefined,
    resubmit_count: product.approval_status === 'rejected' && resubmit ? product.resubmit_count + 1 : undefined,
  }).eq('id', product.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
