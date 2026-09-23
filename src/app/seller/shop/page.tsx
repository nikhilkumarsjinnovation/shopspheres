import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import ShopDetailsForm from '@/components/seller/ShopDetailsForm';
import layoutStyles from '../seller.module.css';

export default async function ShopDetailsPage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');
  const { data: shop } = await supabase
    .from('shops')
    .select('address_line, city, state, postal_code, pickup_radius_km, allows_bopis')
    .eq('seller_id', session.user.id)
    .maybeSingle();
  if (!shop) {
    return (
      <div className={layoutStyles.pageBody}>
        <div className={layoutStyles.panel}><p className={layoutStyles.muted}>Your shop is not ready yet. Refresh this page.</p></div>
      </div>
    );
  }
  return (
    <>
      <header className={layoutStyles.topBar}>
        <h1 className={layoutStyles.pageHeading}>Shop details</h1>
      </header>
      <div className={layoutStyles.pageBody}>
        <div className={layoutStyles.panel}>
          <ShopDetailsForm shop={shop} />
        </div>
      </div>
    </>
  );
}
