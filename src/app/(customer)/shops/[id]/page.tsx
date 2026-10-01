import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import ShopStorefront from '@/components/ShopStorefront';
import type { CardProduct } from '@/components/ProductCard';

export default async function ShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');

  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, city, state, description, seller_id, logo_url, banner_url, rating, is_verified')
    .eq('id', id)
    .maybeSingle();

  if (!shop) notFound();

  const { data: products } = await supabase
    .from('products')
    .select('id, title, description, price, compare_at_price, average_rating, review_count, category, seller_id, image_urls, stock, attributes')
    .eq('shop_id', shop.id)
    .eq('approval_status', 'approved');

  const productList: CardProduct[] = (products ?? []).map((product) => ({
    id: product.id,
    title: product.title,
    description: product.description ?? '',
    price: product.price,
    compare_at_price: product.compare_at_price,
    average_rating: product.average_rating,
    review_count: product.review_count,
    category: product.category,
    seller_id: product.seller_id,
    image_urls: product.image_urls,
    stock: product.stock,
    attributes: product.attributes,
  }));
  const productIds = productList.map((product) => product.id);

  const { data: reviews } = productIds.length
    ? await supabase
        .from('product_reviews')
        .select('id, rating, title, body, created_at')
        .in('product_id', productIds)
        .order('created_at', { ascending: false })
        .limit(12)
    : { data: [] };

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <ShopStorefront shop={shop} products={productList} reviews={reviews ?? []} />
    </div>
  );
}
