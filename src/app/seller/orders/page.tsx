import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { categoryKey } from '@/lib/seller-health';
import { formatINR } from '@/lib/formatters';
import SellerOrderActions from '@/components/seller/SellerOrderActions';

export default async function SellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');

  const { data: items } = await supabase
    .from('order_items')
    .select('id, order_id, quantity, unit_price, product:products(title, category)')
    .eq('seller_id', session.user.id);

  const orderIds = Array.from(new Set((items ?? []).map((item) => item.order_id)));
  const { data: orders } = orderIds.length
    ? await supabase.from('orders').select('id, status, shipping_address, created_at').in('id', orderIds)
    : { data: [] };

  const grouped = new Map<string, { categories: string[]; lines: string[] }>();
  for (const item of items ?? []) {
    const linked = item.product;
    const details = Array.isArray(linked) ? linked[0] : linked;
    const productCategory = details && typeof details === 'object' && 'category' in details && typeof details.category === 'string'
      ? categoryKey(details.category)
      : 'General';
    const title = details && typeof details === 'object' && 'title' in details && typeof details.title === 'string' ? details.title : 'Product';
    if (category && productCategory !== category) continue;
    const bucket = grouped.get(item.order_id) ?? { categories: [], lines: [] };
    if (!bucket.categories.includes(productCategory)) bucket.categories.push(productCategory);
    bucket.lines.push(`${title} × ${item.quantity} · ${formatINR(Number(item.unit_price) * item.quantity)}`);
    grouped.set(item.order_id, bucket);
  }

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Order Fulfillment Hub</h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            <Link href="/seller/orders" style={{ color: 'var(--fg-primary)', fontWeight: 600 }}>All Orders</Link>
            {category ? ` · Filtered by ${category}` : ''}
          </p>
        </div>

        <Link href="/seller/dashboard" className="btn-card-toggle">
          Back to Dashboard
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {Array.from(grouped.entries()).map(([orderId, bucket]) => {
          const order = (orders ?? []).find((row) => row.id === orderId);
          const address = order?.shipping_address;
          const city = address && typeof address === 'object' && !Array.isArray(address) && 'city' in address && typeof address.city === 'string'
            ? address.city
            : 'City not set';
          const status = order?.status ?? 'pending';

          return (
            <article key={orderId} className="checkout-card">
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    SS-{orderId.slice(0, 8).toUpperCase()}
                  </h2>
                  <span
                    className={`portal-badge ${status === 'delivered' ? 'active' : status === 'shipped' || status === 'out_for_delivery' ? 'pending' : 'pending'}`}
                  >
                    {status}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--fg-muted)' }}>
                  Delivery Destination: <strong style={{ color: 'var(--fg-primary)' }}>{city}</strong>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--fg-subtle)', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Items in this order
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--fg-primary)' }}>
                  {bucket.lines.map((line) => (
                    <li key={line} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--accent-electric)' }}>•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <SellerOrderActions orderId={orderId} categories={bucket.categories} />
            </article>
          );
        })}

        {grouped.size === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No orders found for this view.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.35rem' }}>When customers buy your products, orders appear here for packing and shipping.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
