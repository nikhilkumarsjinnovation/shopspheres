import { createClient } from '@/lib/supabase/server';
import ExploreFeedClient from '@/components/ExploreFeedClient';
import * as styles from '../customer.css';

export default async function ExplorePage() {
  const supabase = await createClient();

  // 1. Query approved products from the marketplace
  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, description, price, compare_at_price, average_rating, review_count, category, sub_category, seller_id, image_urls, stock, condition, tags, attributes, created_at')
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: false });

  // 2. Query categories for facet pills
  const { data: dbCategories } = await supabase
    .from('categories')
    .select('name')
    .order('name', { ascending: true });

  const productList = products || [];

  // Extract distinct category names from database or products
  const categorySet = new Set<string>();
  (dbCategories || []).forEach((c) => {
    if (c.name) categorySet.add(c.name);
  });
  productList.forEach((p) => {
    if (p.category) categorySet.add(p.category);
  });

  // Default Indian e-commerce categories if none in DB yet
  if (categorySet.size === 0) {
    ['Electronics', 'Audio & Accessories', 'Fashion & Apparel', 'Home & Kitchen', 'Gourmet & Groceries', 'Beauty & Health'].forEach(
      (c) => categorySet.add(c)
    );
  }

  const availableCategories = Array.from(categorySet);

  return (
    <div>
      <div className={styles.headerContainer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <h1 className={styles.heading}>Explore Marketplace</h1>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#047857',
              backgroundColor: '#d1fae5',
              padding: '3px 8px',
              borderRadius: '4px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            🇮🇳 India Live Catalog
          </span>
        </div>
        <p className={styles.subheading}>
          Discover authentic products with prices in INR (₹) listed directly by verified Indian merchants, with real-time AI personalization.
        </p>
      </div>

      {error && (
        <div className={styles.alertError}>
          Failed to load products: {error.message}
        </div>
      )}

      <ExploreFeedClient
        initialProducts={productList}
        availableCategories={availableCategories}
      />
    </div>
  );
}
