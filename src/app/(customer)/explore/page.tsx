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
        <h1 className={styles.heading}>Explore</h1>
        <p className={styles.subheading}>
          Products from verified shops across India. Prices in INR.
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
