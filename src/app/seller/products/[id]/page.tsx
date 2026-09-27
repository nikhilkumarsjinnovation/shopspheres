import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import ProductEditor from '@/components/seller/ProductEditor';

export default async function SellerProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');
  const { data: product } = await supabase
    .from('products')
    .select(`
      id,
      title,
      description,
      price,
      compare_at_price,
      stock,
      condition,
      category,
      sub_category,
      tags,
      attributes,
      image_urls,
      approval_status,
      resubmit_count,
      rejection_reason,
      ai_categorized,
      average_rating,
      review_count,
      created_at,
      updated_at,
      seller_id
    `)
    .eq('id', id)
    .eq('seller_id', session.user.id)
    .maybeSingle();
  if (!product) notFound();

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '4rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <Link href="/seller/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--fg-muted)', fontWeight: 600, marginBottom: '0.4rem' }}>
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{product.title}</h1>
        </div>
      </div>

      <ProductEditor product={product} />
    </div>
  );
}
