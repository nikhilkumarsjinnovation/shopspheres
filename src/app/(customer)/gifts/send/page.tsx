import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Gift } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import GiftFlow from '@/components/gifting/GiftFlow';

export default async function SendGiftPage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');
  
  const { data: products } = await supabase
    .from('products')
    .select('id, title, price')
    .eq('approval_status', 'approved')
    .order('title')
    .limit(100);

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '4rem', maxWidth: '680px', margin: '0 auto' }}>
      <Link
        href="/gifts"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg-muted)', marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={14} /> Back to gifts hub
      </Link>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-glow)', color: 'var(--accent-electric)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gift size={20} />
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Send a Curated Gift</h1>
        </div>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem' }}>
          Select a verified marketplace product, pick a recipient from your circle, and choose when the surprise unfolds.
        </p>
      </div>

      <div className="checkout-card">
        <GiftFlow products={products ?? []} />
      </div>
    </div>
  );
}
