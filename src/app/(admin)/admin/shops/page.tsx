import { createClient } from '@/lib/supabase/server';
import ResetBrandingButton from '@/components/admin/ResetBrandingButton';
import * as styles from '../../admin.css';

export default async function AdminShopsPage() {
  const supabase = await createClient();
  const { data: shops, error } = await supabase
    .from('shops')
    .select('id, name, city, branding_edits_used, seller_id')
    .order('name', { ascending: true });
  const { data: products } = await supabase.from('products').select('shop_id');
  const counts = new Map<string, number>();
  for (const product of products ?? []) {
    if (!product.shop_id) continue;
    counts.set(product.shop_id, (counts.get(product.shop_id) ?? 0) + 1);
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Shops</h1>
        <p className={styles.headerSubtitle}>Shop name, city, catalog size, and branding edits. Street addresses stay on the seller&apos;s own page.</p>
      </div>
      {error ? <div className={styles.emptyState}>{error.message}</div> : null}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Shop</th>
              <th className={styles.th}>City</th>
              <th className={styles.th}>Products</th>
              <th className={styles.th}>Branding edits used</th>
              <th className={styles.th}>Reset</th>
            </tr>
          </thead>
          <tbody>
            {(shops ?? []).map((shop) => (
              <tr key={shop.id} className={styles.tr}>
                <td className={styles.td}>{shop.name}</td>
                <td className={styles.td}>{shop.city}</td>
                <td className={styles.td}>{counts.get(shop.id) ?? 0}</td>
                <td className={styles.td}>{shop.branding_edits_used} / 2</td>
                <td className={styles.td}><ResetBrandingButton sellerId={shop.seller_id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(shops ?? []).length === 0 ? <div className={styles.emptyState}>No shops yet.</div> : null}
    </div>
  );
}
