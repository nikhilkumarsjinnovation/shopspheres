import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Database, Product } from '@/types/database.types';
import AdminApprovalQueue from '@/components/AdminApprovalQueue';
import * as styles from '../../admin.css';

type OrderRow = Database['public']['Tables']['orders']['Row'];

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Double check admin role authorization
  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin' || !profile.is_active) {
    redirect('/login?error=unauthorized');
  }

  // 1. Metric: Total Platform GMV (Sum of total_amount from all orders)
  const { data: allOrderAmounts } = await supabase
    .from('orders')
    .select('total_amount');

  const totalGMV = (allOrderAmounts || []).reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0
  );

  // 2. Metric: Total Orders Count (Count of all rows in orders table)
  const { count: totalOrdersCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  // 3. Metric: Total Active Users (Count of active profiles in users table)
  const { count: activeUsersCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // 4. Metric: Total Registered Catalog Products (Platform Health Telemetry)
  const { count: totalProductsCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  // 5. Query Products Awaiting Administrator Review (approval_status = 'pending')
  const { data: pendingProductsData } = await supabase
    .from('products')
    .select('*')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });

  const pendingProducts = (pendingProductsData || []) as Product[];

  // 6. Recent Orders Table: Fetch the most recent 10 orders across platform
  const { data: recentOrdersData } = await supabase
    .from('orders')
    .select('id, customer_id, total_amount, status, is_gift, recipient_email, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  const recentOrders = (recentOrdersData || []) as OrderRow[];

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'delivered':
        return styles.statusDelivered;
      case 'shipped':
        return styles.statusShipped;
      case 'processing':
        return styles.statusProcessing;
      case 'cancelled':
        return styles.statusCancelled;
      case 'pending':
      default:
        return styles.statusPending;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Platform Health & Governance</h1>
        <p className={styles.headerSubtitle}>
          Enterprise marketplace operations, product approval moderation, revenue telemetry, and transaction audits.
        </p>
      </div>

      {/* Metrics Cards Grid */}
      <div className={styles.metricsGrid}>
        {/* Metric 1: Total GMV */}
        <div className={styles.metricCard}>
          <div className={styles.metricTopRow}>
            <span className={styles.metricLabel}>Total Platform GMV</span>
            <div className={styles.metricIconContainer}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className={styles.metricValue}>${totalGMV.toFixed(2)}</div>
          <div className={styles.metricSubtext}>
            <span>●</span> All cumulative platform revenue
          </div>
        </div>

        {/* Metric 2: Total Orders Count */}
        <div className={styles.metricCard}>
          <div className={styles.metricTopRow}>
            <span className={styles.metricLabel}>Total Orders Count</span>
            <div className={styles.metricIconContainer}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
          </div>
          <div className={styles.metricValue}>{totalOrdersCount ?? 0}</div>
          <div className={styles.metricSubtext} style={{ color: '#c084fc' }}>
            <span>●</span> Transactions across all sellers
          </div>
        </div>

        {/* Metric 3: Pending Product Approvals */}
        <div className={styles.metricCard}>
          <div className={styles.metricTopRow}>
            <span className={styles.metricLabel}>Pending Approvals</span>
            <div className={styles.metricIconContainer} style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>
          <div className={styles.metricValue} style={{ color: pendingProducts.length > 0 ? '#fbbf24' : '#ffffff' }}>
            {pendingProducts.length}
          </div>
          <div className={styles.metricSubtext} style={{ color: '#fbbf24' }}>
            <span>●</span> Items awaiting review
          </div>
        </div>

        {/* Metric 4: Total Active Users */}
        <div className={styles.metricCard}>
          <div className={styles.metricTopRow}>
            <span className={styles.metricLabel}>Total Active Users</span>
            <div className={styles.metricIconContainer}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className={styles.metricValue}>{activeUsersCount ?? 0}</div>
          <div className={styles.metricSubtext}>
            <span>●</span> Verified active accounts
          </div>
        </div>
      </div>

      {/* NEW SECTION: Enterprise Admin Approval Queue */}
      <AdminApprovalQueue initialPendingProducts={pendingProducts} />

      {/* Recent Orders Section */}
      <div className={styles.sectionTitle}>
        <span>Recent Orders Audit (Latest 10)</span>
        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>
          Live system transaction ledger
        </span>
      </div>

      <div className={styles.tableWrapper}>
        {recentOrders.length === 0 ? (
          <div className={styles.emptyState}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📦</div>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#f8fafc' }}>
              No orders recorded yet
            </p>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              When customers complete checkout transactions, real-time order records will stream into this audit table.
            </p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Order ID</th>
                <th className={styles.th}>Customer ID</th>
                <th className={styles.th}>Total Amount</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Type</th>
                <th className={styles.th}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className={styles.tr}>
                  <td className={styles.td}>
                    <span className={styles.uuidCell} title={order.id}>
                      {order.id.slice(0, 8)}...{order.id.slice(-4)}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.uuidCell} style={{ color: '#94a3b8' }} title={order.customer_id}>
                      {order.customer_id.slice(0, 8)}...{order.customer_id.slice(-4)}
                    </span>
                  </td>
                  <td className={styles.td} style={{ fontWeight: 600, color: '#f8fafc' }}>
                    ${Number(order.total_amount).toFixed(2)}
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.statusBadge} ${getStatusBadgeStyle(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {order.is_gift ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          color: '#34d399',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                        }}
                        title={`Gift order for ${order.recipient_email || 'recipient'}`}
                      >
                        🎁 Gift
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Standard</span>
                    )}
                  </td>
                  <td className={styles.td} style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    {formatDate(order.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
