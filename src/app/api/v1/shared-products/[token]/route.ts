import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('record_share_open', { target_token: token });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const row = data?.[0];
  if (!row) return NextResponse.json({ error: 'Share link was not found.' }, { status: 404 });

  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('text/html')) {
    return NextResponse.redirect(new URL(`/product/${row.product_id}?ref=${token}`, request.url));
  }
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  return NextResponse.json({
    productId: row.product_id,
    sharerName: row.sharer_name,
    status: row.status,
  });
}
