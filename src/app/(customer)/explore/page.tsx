import { createClient } from '@/lib/supabase/server';
import ProductCard from '@/components/ProductCard';
import * as styles from '../customer.css';

export default async function ExplorePage() {
  const supabase = await createClient();

  // Query all published products from the marketplace
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  const productList = products || [];

  return (
    <div>
      <div className={styles.headerContainer}>
        <h1 className={styles.heading}>Explore Marketplace</h1>
        <p className={styles.subheading}>
          Discover curated products listed directly by verified independent merchants.
        </p>
      </div>

      {error && (
        <div className={styles.alertError}>
          Failed to load products: {error.message}
        </div>
      )}

      {productList.length === 0 ? (
        <div className={styles.emptyState}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛍️</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            No products available yet
          </h2>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            Merchants haven&apos;t listed any published items yet. Check back soon!
          </p>
        </div>
      ) : (
        <div className={styles.productGrid}>
          {productList.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
