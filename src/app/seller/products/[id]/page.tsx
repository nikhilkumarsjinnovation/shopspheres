import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
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
    <main>
      <p><Link href="/seller/dashboard">Back to dashboard</Link></p>
      <h1>{product.title}</h1>
      <ProductEditor product={product} />
    </main>
  );
}
