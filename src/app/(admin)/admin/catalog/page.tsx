import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ProductDecision from '@/components/admin/ProductDecision';
import { formatINR } from '@/lib/formatters';
import type { ApprovalStatus } from '@/types/database.types';
import * as styles from '../../admin.css';

const FILTERS: Array<ApprovalStatus | 'all'> = ['pending', 'approved', 'rejected', 'all'];

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = FILTERS.includes(rawStatus as ApprovalStatus | 'all') ? (rawStatus as ApprovalStatus | 'all') : 'pending';
  const supabase = await createClient();
  let query = supabase
    .from('products')
    .select('id, title, price, stock, category, approval_status, rejection_reason, seller_id')
    .order('created_at', { ascending: false })
    .limit(50);
  if (status !== 'all') query = query.eq('approval_status', status);
  const { data: products, error } = await query;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Catalog</h1>
        <p className={styles.headerSubtitle}>Approve, reject with a reason, or pull a live product back to pending.</p>
      </div>
      <p>
        {FILTERS.map((item) => (
          <Link key={item} href={item === 'pending' ? '/admin/catalog' : `/admin/catalog?status=${item}`} style={{ marginRight: '0.75rem' }}>
            {item}
          </Link>
        ))}
      </p>
      {error ? <div className={styles.emptyState}>{error.message}</div> : null}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Product</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Price</th>
              <th className={styles.th}>Stock</th>
              <th className={styles.th}>Decision</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((product) => (
              <tr key={product.id} className={styles.tr}>
                <td className={styles.td}>
                  <div><Link href={`/admin/catalog/${product.id}`}>{product.title}</Link></div>
                  <div>{product.category}</div>
                  {product.rejection_reason ? <div>Reason: {product.rejection_reason}</div> : null}
                </td>
                <td className={styles.td}>{product.approval_status}</td>
                <td className={styles.td}>{formatINR(product.price)}</td>
                <td className={styles.td}>{product.stock}</td>
                <td className={styles.td}>
                  <p><Link href={`/admin/catalog/${product.id}`}>View details</Link></p>
                  <ProductDecision productId={product.id} status={product.approval_status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(products ?? []).length === 0 ? <div className={styles.emptyState}>No products in this filter.</div> : null}
    </div>
  );
}
