import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import BrandingForm from '@/components/seller/BrandingForm';

export default async function BrandingPage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');
  const { data: shop } = await supabase
    .from('shops')
    .select('name, description, logo_url, banner_url, branding_edits_used')
    .eq('seller_id', session.user.id)
    .maybeSingle();
  if (!shop) return <p>Your shop is not ready yet. Refresh this page.</p>;
  return (
    <main>
      <h1>Shop branding</h1>
      <BrandingForm shop={shop} />
    </main>
  );
}
