import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/formatters';
import { orderCode } from '@/lib/platform-stats';
import type { OrderStatus } from '@/types/database.types';
import * as styles from '../../admin.css';

const STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'return_requested',
  'returned',
  'refunded',
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = STATUSES.includes(rawStatus as OrderStatus) ? (rawStatus as OrderStatus) : null;
  const supabase = await createClient();
  let query = supabase
    .from('orders')
    .select('id, total_amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (status) query = query.eq('status', status);
  const { data: orders, error } = await query;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Orders</h1>
        <p className={styles.headerSubtitle}>Status and totals only. Street addresses and phone numbers are not on this list.</p>
      </div>
      <p>
        <Link href="/admin/orders" style={{ marginRight: '0.75rem' }}>all</Link>
        {STATUSES.map((item) => (
          <Link key={item} href={`/admin/orders?status=${item}`} style={{ marginRight: '0.75rem' }}>{item}</Link>
        ))}
      </p>
      {error ? <div className={styles.emptyState}>{error.message}</div> : null}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Order</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Total</th>
              <th className={styles.th}>Placed</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((order) => (
              <tr key={order.id} className={styles.tr}>
                <td className={styles.td}><Link href={`/admin/orders/${order.id}`}>{orderCode(order.id)}</Link></td>
                <td className={styles.td}>{order.status}</td>
                <td className={styles.td}>{formatINR(order.total_amount)}</td>
                <td className={styles.td}>{new Date(order.created_at).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(orders ?? []).length === 0 ? <div className={styles.emptyState}>No orders in this filter.</div> : null}
    </div>
  );
}
