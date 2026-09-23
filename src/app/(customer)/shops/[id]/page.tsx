import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import ProductCard from '@/components/ProductCard';
import * as styles from '../../customer.css';

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
    <div>
      <p style={{ marginBottom: '1rem' }}><Link className={styles.quietLink} href="/shops">All shops</Link></p>
      <div className={styles.headerContainer}>
        <h1 className={styles.heading}>{shop.name}</h1>
        <p className={styles.subheading}>{shop.city}, {shop.state}</p>
        {shop.description ? <p className={styles.listMeta}>{shop.description}</p> : null}
      </div>
      {(products ?? []).length === 0 ? (
        <div className={styles.emptyState}>This shop has no approved products yet.</div>
      ) : (
        <div className={styles.productGrid}>
          {(products ?? []).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
