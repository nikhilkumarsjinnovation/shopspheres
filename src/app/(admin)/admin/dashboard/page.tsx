import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AdminApprovalQueue, { type QueueProduct } from '@/components/AdminApprovalQueue';
import { formatINR } from '@/lib/formatters';
import { orderCode, parsePlatformStats } from '@/lib/platform-stats';
import AdminPopulateControls from '@/components/admin/AdminPopulateControls';

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

  const { data: adminShops } = await supabase
    .from('shops')
    .select('id, name')
    .order('name', { ascending: true });

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Platform Health & Moderation</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
          High-level marketplace metrics, inventory approval queue, and recent orders feed.
        </p>
      </div>

      {statsError || !stats ? (
        <div style={{ padding: '1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          Stats are unavailable. Apply migration 009, then reload. {statsError?.message ?? ''}
        </div>
      ) : (
        <div className="stat-cards-grid" style={{ marginBottom: '2.5rem' }}>
          <Metric label="Gross Merchandise Value (GMV)" value={formatINR(stats.gmv)} note="Sum of order totals" />
          <Metric label="Total Orders" value={String(orderTotal)} note={statusLine(stats.orders_by_status)} />
          <Metric label="Active Accounts" value={String(stats.users_active)} note={`${stats.users_customer} cust · ${stats.users_seller} sellers · ${stats.users_admin} admin`} />
          <Metric label="Catalog Approved" value={String(stats.products_approved)} note={`${stats.products_pending} pending · ${stats.products_rejected} rejected`} />
          <Metric label="Verified Shops" value={String(stats.shop_count)} note={`${stats.low_stock} products under 5 stock`} />
          <Metric label="Pending Gifts" value={String(stats.gifts_pending)} note="Gifts awaiting reveal" />
        </div>
      )}

      <AdminPopulateControls shops={(adminShops ?? []).map((s) => ({ id: s.id, name: s.name }))} />

      <div style={{ marginBottom: '2.5rem' }}>
        <AdminApprovalQueue initialPendingProducts={(pendingProductsData ?? []) as QueueProduct[]} />
      </div>

      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Recent Platform Orders</h2>
          <Link href="/admin/orders" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-electric)' }}>
            View all orders &rarr;
          </Link>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Order Reference</th>
                <th>Status</th>
                <th>Total Value</th>
                <th>Placed Timestamp</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(recentOrders ?? []).map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/admin/orders/${order.id}`} style={{ fontWeight: 600, color: 'var(--fg-primary)' }}>
                      {orderCode(order.id)}
                    </Link>
                  </td>
                  <td>
                    <span className="portal-badge active" style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td><strong>{formatINR(order.total_amount)}</strong></td>
                  <td style={{ color: 'var(--fg-muted)' }}>{new Date(order.created_at).toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/admin/orders/${order.id}`} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-electric)' }}>
                      Inspect &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="stat-kpi-card">
      <div className="stat-kpi-label">{label}</div>
      <div className="stat-kpi-value">{value}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>{note}</div>
    </div>
  );
}

function statusLine(counts: Record<string, number>): string {
  const parts = Object.entries(counts).map(([status, count]) => `${count} ${status}`);
  return parts.length ? parts.join(' · ') : 'No orders yet';
}
