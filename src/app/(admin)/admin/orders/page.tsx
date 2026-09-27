import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/formatters';
import { orderCode } from '@/lib/platform-stats';
import type { OrderStatus } from '@/types/database.types';

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
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Order Moderation & Audit</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
          Inspect marketplace orders and delivery lifecycles. Customer address details remain restricted.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link
          href="/admin/orders"
          className={`persona-pill ${!status ? 'active' : ''}`}
        >
          All Orders
        </Link>
        {STATUSES.map((item) => {
          const isActive = status === item;
          return (
            <Link
              key={item}
              href={`/admin/orders?status=${item}`}
              className={`persona-pill ${isActive ? 'active' : ''}`}
              style={{ textTransform: 'capitalize' }}
            >
              {item.replace(/_/g, ' ')}
            </Link>
          );
        })}
      </div>

      {error ? (
        <div style={{ padding: '1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {error.message}
        </div>
      ) : null}

      {(orders ?? []).length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)' }}>
          No orders found matching status filter.
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Order Reference</th>
                <th>Status</th>
                <th>Total Amount</th>
                <th>Placed Timestamp</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((order) => (
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
                    <Link
                      href={`/admin/orders/${order.id}`}
                      style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-electric)' }}
                    >
                      View order &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
