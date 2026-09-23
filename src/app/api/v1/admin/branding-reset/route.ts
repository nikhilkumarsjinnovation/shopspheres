import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { requireActiveAdmin, writeAdminAudit } from '@/lib/admin-guard';
import { csrfMiddleware } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;
  const supabase = await createClient();
  const gate = await requireActiveAdmin(supabase);
  if (gate.error || !gate.session) return gate.error;
  const body: unknown = await request.json();
  const sellerId = body && typeof body === 'object' && 'sellerId' in body && typeof body.sellerId === 'string' ? body.sellerId : '';
  if (!sellerId) return NextResponse.json({ error: 'sellerId is required.' }, { status: 400 });
  const { data: shop, error } = await supabase
    .from('shops')
    .update({ branding_edits_used: 0 })
    .eq('seller_id', sellerId)
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!shop) return NextResponse.json({ error: 'Shop not found.' }, { status: 404 });
  const { error: auditError } = await writeAdminAudit(supabase, gate.session.user.id, 'branding_reset', 'users', sellerId);
  if (auditError) return NextResponse.json({ error: auditError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
