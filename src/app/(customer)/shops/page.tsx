import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Store, ShieldCheck, Star, MapPin, ArrowRight } from 'lucide-react';

export default async function ShopsPage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');
  
  const { data: shops } = await supabase
    .from('shops')
    .select('id, name, city, state, rating, is_verified, description')
    .order('name');

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Merchant Storefronts</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
          Explore curated Indian regional sellers, artisans, and certified electronic hubs.
        </p>
      </div>

      {(shops ?? []).length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}>
          No shops listed yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {(shops ?? []).map((shop) => (
            <Link
              key={shop.id}
              href={`/shops/${shop.id}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '1.75rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-xs)',
                transition: 'all var(--transition-smooth)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-primary)' }}>
                    <Store size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{shop.name}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
                      <MapPin size={12} />
                      <span>{shop.city}, {shop.state}</span>
                    </div>
                  </div>
                </div>

                {shop.is_verified && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.55rem', background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 700 }}>
                    <ShieldCheck size={12} /> Verified
                  </span>
                )}
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--fg-secondary)', lineHeight: 1.5, marginBottom: '1.25rem', flex: 1 }}>
                {shop.description || 'Verified ShopSphere seller offering quality products with direct warehouse fulfillment.'}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--warning)', fontWeight: 700 }}>
                  <Star size={14} fill="currentColor" />
                  <span>{(shop.rating || 5.0).toFixed(1)} Merchant Rating</span>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, color: 'var(--fg-primary)' }}>
                  Enter Shop <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
