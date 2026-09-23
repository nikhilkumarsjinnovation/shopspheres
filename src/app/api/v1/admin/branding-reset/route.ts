import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session || session.profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access is required.' }, { status: 403 });
  }
  const body: unknown = await request.json();
  const sellerId = body && typeof body === 'object' && 'sellerId' in body && typeof body.sellerId === 'string' ? body.sellerId : '';
  if (!sellerId) return NextResponse.json({ error: 'sellerId is required.' }, { status: 400 });
  const { error } = await supabase.from('shops').update({ branding_edits_used: 0 }).eq('seller_id', sellerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
