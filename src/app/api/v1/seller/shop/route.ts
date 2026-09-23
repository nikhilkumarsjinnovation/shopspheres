import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session || session.profile.role !== 'seller') {
    return NextResponse.json({ error: 'Seller access is required.' }, { status: 403 });
  }
  const { data: shop } = await supabase.from('shops').select('id').eq('seller_id', session.user.id).maybeSingle();
  if (!shop) return NextResponse.json({ error: 'Shop was not found.' }, { status: 404 });
  const body: unknown = await request.json();
  const record = body && typeof body === 'object' ? body : {};
  const text = (key: string) => key in record && typeof record[key as keyof typeof record] === 'string'
    ? String(record[key as keyof typeof record])
    : undefined;
  const { error } = await supabase.from('shops').update({
    address_line: text('addressLine'),
    city: text('city'),
    state: text('state'),
    postal_code: text('postalCode'),
    pickup_radius_km: 'pickupRadiusKm' in record && typeof record.pickupRadiusKm === 'number' ? record.pickupRadiusKm : undefined,
    allows_bopis: 'allowsBopis' in record && typeof record.allowsBopis === 'boolean' ? record.allowsBopis : undefined,
  }).eq('id', shop.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
