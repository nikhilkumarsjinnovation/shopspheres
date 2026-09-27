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
    <div>
      <div>
        <h1>Orders</h1>
        <p>Status and totals only. Street addresses and phone numbers are not on this list.</p>
      </div>
      <p>
        <Link href="/admin/orders">all</Link>
        {STATUSES.map((item) => (
          <Link key={item} href={`/admin/orders?status=${item}`}>{item}</Link>
        ))}
      </p>
      {error ? <div>{error.message}</div> : null}
      <div>
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Status</th>
              <th>Total</th>
              <th>Placed</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((order) => (
              <tr key={order.id}>
                <td><Link href={`/admin/orders/${order.id}`}>{orderCode(order.id)}</Link></td>
                <td>{order.status}</td>
                <td>{formatINR(order.total_amount)}</td>
                <td>{new Date(order.created_at).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(orders ?? []).length === 0 ? <div>No orders in this filter.</div> : null}
    </div>
  );
}
