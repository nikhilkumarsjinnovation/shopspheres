import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import BrandingForm from '@/components/seller/BrandingForm';
import layoutStyles from '../seller.module.css';

export default async function BrandingPage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');
  const { data: shop } = await supabase
    .from('shops')
    .select('name, description, logo_url, banner_url, branding_edits_used')
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
        <h1 className={layoutStyles.pageHeading}>Shop branding</h1>
      </header>
      <div className={layoutStyles.pageBody}>
        <div className={layoutStyles.panel}>
          <BrandingForm shop={shop} />
        </div>
      </div>
    </>
  );
}
