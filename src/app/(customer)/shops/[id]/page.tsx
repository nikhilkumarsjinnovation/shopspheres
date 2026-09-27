import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Store, MapPin, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import ProductCard from '@/components/ProductCard';

export default async function ShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');
  
  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, city, state, description, seller_id')
    .eq('id', id)
    .maybeSingle();

  if (!shop) notFound();

  const { data: products } = await supabase
    .from('products')
    .select('id, title, description, price, compare_at_price, average_rating, review_count, category, seller_id, image_urls, stock, attributes')
    .eq('shop_id', shop.id)
    .eq('approval_status', 'approved');

  const productList = products ?? [];

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <Link
        href="/shops"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--fg-muted)',
          marginBottom: '1.5rem',
        }}
      >
        <ArrowLeft size={14} />
        <span>Back to all shops</span>
      </Link>

      {/* Storefront Header Card */}
      <div
        style={{
          padding: '2.25rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '2.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--fg-primary)',
              color: 'var(--fg-inverted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Store size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{shop.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--fg-muted)' }}>
              <MapPin size={14} />
              <span>{shop.city}, {shop.state} · Direct Marketplace Partner</span>
            </div>
          </div>
        </div>

        {shop.description && (
          <p style={{ fontSize: '0.95rem', color: 'var(--fg-secondary)', maxWidth: '720px', lineHeight: 1.6, marginTop: '0.75rem' }}>
            {shop.description}
          </p>
        )}

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--fg-muted)' }}>
          Showing <strong>{productList.length}</strong> active certified products
        </div>
      </div>

      {productList.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}>
          This shop has no approved products yet. Check back soon!
        </div>
      ) : (
        <div className="product-grid">
          {productList.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
