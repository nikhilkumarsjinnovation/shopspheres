import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';

async function sellerShop() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session || session.profile.role !== 'seller') {
    return { supabase, session: null, shop: null };
  }
  const { data: shop } = await supabase.from('shops').select('*').eq('seller_id', session.user.id).maybeSingle();
  return { supabase, session, shop };
}

export async function PATCH(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;
  const { supabase, shop } = await sellerShop();
  if (!shop) return NextResponse.json({ error: 'Shop was not found.' }, { status: 404 });
  const body: unknown = await request.json();
  const record = body && typeof body === 'object' ? body : {};
  const name = 'name' in record && typeof record.name === 'string' ? record.name.trim() : shop.name;
  const description = 'description' in record && typeof record.description === 'string' ? record.description : shop.description;
  const logoUrl = 'logoUrl' in record && typeof record.logoUrl === 'string' ? record.logoUrl : shop.logo_url;
  const bannerUrl = 'bannerUrl' in record && typeof record.bannerUrl === 'string' ? record.bannerUrl : shop.banner_url;
  const changed = name !== shop.name || description !== shop.description || logoUrl !== shop.logo_url || bannerUrl !== shop.banner_url;
  if (changed && shop.branding_edits_used >= 2) {
    return NextResponse.json({ error: 'You have used both branding updates. Contact an admin to change this again.' }, { status: 403 });
  }
  const { error } = await supabase.from('shops').update({
    name,
    description,
    logo_url: logoUrl,
    banner_url: bannerUrl,
    branding_edits_used: changed ? shop.branding_edits_used + 1 : shop.branding_edits_used,
  }).eq('id', shop.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brandingEditsUsed: changed ? shop.branding_edits_used + 1 : shop.branding_edits_used });
}
