import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import ProductCard from '@/components/ProductCard';
import { formatINR } from '@/lib/formatters';

export default async function ShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');
  const { data: shop } = await supabase.from('shops').select('id, name, city, state, description, seller_id').eq('id', id).maybeSingle();
  if (!shop) notFound();
  const { data: products } = await supabase
    .from('products')
    .select('id, title, description, price, compare_at_price, average_rating, review_count, category, seller_id, image_urls, stock')
    .eq('shop_id', shop.id)
    .eq('approval_status', 'approved');

  return (
    <main>
      <p><Link href="/shops">All shops</Link></p>
      <h1>{shop.name}</h1>
      <p>{shop.city}, {shop.state}</p>
      {shop.description ? <p>{shop.description}</p> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {(products ?? []).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {(products ?? []).length === 0 ? <p>This shop has no approved products yet. Prices start from {formatINR(0)}.</p> : null}
    </main>
  );
}
