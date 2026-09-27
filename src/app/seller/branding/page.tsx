import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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

  if (!shop) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--fg-muted)' }}>Your merchant shop is being prepared. Please refresh in a moment.</p>
      </div>
    );
  }

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3.5rem', maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Storefront Branding</h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Customize your merchant logo, banner, and description seen by shoppers.
          </p>
        </div>
        <Link href="/seller/dashboard" className="btn-card-toggle" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <ArrowLeft size={14} /> Back
        </Link>
      </div>

      <BrandingForm shop={shop} />
    </div>
  );
}
