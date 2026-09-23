import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AdminApprovalQueue, { type QueueProduct } from '@/components/AdminApprovalQueue';
import { formatINR } from '@/lib/formatters';
import { orderCode, parsePlatformStats } from '@/lib/platform-stats';
import * as styles from '../../admin.css';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: statsRaw, error: statsError } = await supabase.rpc('admin_platform_stats');
  const stats = parsePlatformStats(statsRaw);
  const orderTotal = stats
    ? Object.values(stats.orders_by_status).reduce((sum, count) => sum + count, 0)
    : 0;

  const { data: pendingProductsData } = await supabase
    .from('products')
    .select('id, title, price, stock, category, sub_category, condition, seller_id, image_urls, attributes')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, total_amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Platform Health</h1>
        <p className={styles.headerSubtitle}>
          Marketplace totals, the approval queue, and the latest orders. Private chats and payment details stay hidden.
        </p>
      </div>

      {statsError || !stats ? (
        <div className={styles.emptyState}>
          Stats are unavailable. Apply migration 009, then reload. {statsError?.message ?? ''}
        </div>
      ) : (
        <div className={styles.metricsGrid}>
          <Metric label="GMV" value={formatINR(stats.gmv)} note="Sum of order totals" />
          <Metric label="Orders" value={String(orderTotal)} note={statusLine(stats.orders_by_status)} />
          <Metric label="Active users" value={String(stats.users_active)} note={`${stats.users_customer} customers · ${stats.users_seller} sellers · ${stats.users_admin} admins`} />
          <Metric label="Catalog" value={String(stats.products_approved)} note={`${stats.products_pending} pending · ${stats.products_rejected} rejected`} />
          <Metric label="Shops" value={String(stats.shop_count)} note={`${stats.low_stock} products under 5 in stock`} />
          <Metric label="Pending gifts" value={String(stats.gifts_pending)} note="Gifts still sealed" />
        </div>
      )}

      <AdminApprovalQueue initialPendingProducts={(pendingProductsData ?? []) as QueueProduct[]} />

      <div className={styles.sectionTitle}><span>Recent orders</span></div>
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
            {(recentOrders ?? []).map((order) => (
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
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue}>{value}</div>
      <div className={styles.metricSubtext}>{note}</div>
    </div>
  );
}

function statusLine(counts: Record<string, number>): string {
  const parts = Object.entries(counts).map(([status, count]) => `${count} ${status}`);
  return parts.length ? parts.join(' · ') : 'No orders yet';
}
