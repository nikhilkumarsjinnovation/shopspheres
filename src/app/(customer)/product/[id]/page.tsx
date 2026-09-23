import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import ProductDetailClient from '@/components/ProductDetailClient';

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const supabase = await createClient();
  const adminDb = createAdminClient();

  // 1. Fetch Product
  const { data: product, error: prodErr } = await adminDb
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (prodErr || !product) {
    notFound();
  }

  // 2. Fetch Merchant / Shop Info
  let merchantInfo: { name: string; description?: string | null; is_verified?: boolean } | null = null;
  if (product.seller_id) {
    const { data: shop } = await adminDb
      .from('shops')
      .select('name, description, is_verified')
      .eq('seller_id', product.seller_id)
      .maybeSingle();

    if (shop) {
      merchantInfo = shop;
    } else {
      const { data: sellerUser } = await adminDb
        .from('users')
        .select('full_name, email')
        .eq('id', product.seller_id)
        .maybeSingle();

      if (sellerUser) {
        merchantInfo = {
          name: sellerUser.full_name || sellerUser.email.split('@')[0],
          is_verified: true,
        };
      }
    }
  }

  // 3. Fetch Product Variants
  const { data: variants } = await adminDb
    .from('product_variants')
    .select('id, sku, title, price, stock, attributes')
    .eq('product_id', id);

  // 4. Fetch Reviews with Reviewer Info
  const { data: reviews } = await adminDb
    .from('product_reviews')
    .select('id, customer_id, rating, title, body, is_verified_purchase, helpful_votes, created_at, users:customer_id(full_name, email)')
    .eq('product_id', id)
    .order('helpful_votes', { ascending: false })
    .order('created_at', { ascending: false });

  const formattedReviews = (reviews || []).map((r: any) => ({
    id: r.id,
    customer_id: r.customer_id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    is_verified_purchase: r.is_verified_purchase,
    helpful_votes: r.helpful_votes,
    created_at: r.created_at,
    user_name: r.users?.full_name || null,
    user_email: r.users?.email || null,
  }));

  return (
    <ProductDetailClient
      product={product}
      merchant={merchantInfo}
      variants={variants || []}
      initialReviews={formattedReviews}
    />
  );
}
