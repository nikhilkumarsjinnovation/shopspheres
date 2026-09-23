import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import ShopDetailsForm from '@/components/seller/ShopDetailsForm';

export default async function ShopDetailsPage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');
  const { data: shop } = await supabase
    .from('shops')
    .select('address_line, city, state, postal_code, pickup_radius_km, allows_bopis')
    .eq('seller_id', session.user.id)
    .maybeSingle();
  if (!shop) return <p>Your shop is not ready yet. Refresh this page.</p>;
  return (
    <main>
      <h1>Shop details</h1>
      <ShopDetailsForm shop={shop} />
    </main>
  );
}
