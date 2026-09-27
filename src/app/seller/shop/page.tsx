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
  if (!shop) {
    return (
      <div className="checkout-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--fg-muted)' }}>Your shop is not ready yet. Refresh this page.</p>
      </div>
    );
  }
  return (
    <div className="animate-slide-up" style={{ maxWidth: '640px', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Shop Details & Pickup</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Configure your physical storefront dispatch location and local pickup options.
        </p>
      </div>
      <div className="checkout-card">
        <ShopDetailsForm shop={shop} />
      </div>
    </div>
  );
}
