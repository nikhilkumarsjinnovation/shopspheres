import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type Db = SupabaseClient<Database>;

export async function ensureSellerShop(supabase: Db, sellerId: string, fullName: string | null, email: string) {
  const { data: existing } = await supabase
    .from('shops')
    .select('id')
    .eq('seller_id', sellerId)
    .maybeSingle();
  if (existing) return existing.id;

  const base = (fullName || email.split('@')[0] || 'shop').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'shop';
  const slug = `${base}-${sellerId.slice(0, 8)}`;
  const { data, error } = await supabase.from('shops').insert({
    seller_id: sellerId,
    name: fullName || 'My shop',
    slug,
    description: '',
    address_line: 'Add your shop address',
    city: 'City',
    state: 'State',
    postal_code: '000000',
  }).select('id').single();
  if (error || !data) {
    throw new Error(error?.message ?? 'Could not create the shop.');
  }
  return data.id;
}
