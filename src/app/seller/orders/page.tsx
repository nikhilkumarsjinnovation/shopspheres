import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { categoryKey } from '@/lib/seller-health';
import { formatINR } from '@/lib/formatters';
import SellerOrderActions from '@/components/seller/SellerOrderActions';
import layoutStyles from '../seller.module.css';

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
    <>
      <header className={layoutStyles.topBar}>
        <div>
          <h1 className={layoutStyles.pageHeading}>Orders</h1>
          <p className={layoutStyles.muted} style={{ marginTop: '0.25rem' }}>
            <Link href="/seller/orders">All</Link>
            {category ? ` · ${category}` : ''}
          </p>
        </div>
      </header>
      <div className={layoutStyles.pageBody}>
        {Array.from(grouped.entries()).map(([orderId, bucket]) => {
          const order = (orders ?? []).find((row) => row.id === orderId);
          const address = order?.shipping_address;
          const city = address && typeof address === 'object' && !Array.isArray(address) && 'city' in address && typeof address.city === 'string'
            ? address.city
            : 'City not set';
          return (
            <article key={orderId} className={layoutStyles.orderCard}>
              <h2>SS-{orderId.slice(0, 8).toUpperCase()}</h2>
              <p className={layoutStyles.muted}>{order?.status ?? 'pending'} · {city}</p>
              <ul className={layoutStyles.muted} style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {bucket.lines.map((line) => <li key={line}>{line}</li>)}
              </ul>
              <SellerOrderActions orderId={orderId} categories={bucket.categories} />
            </article>
          );
        })}
        {grouped.size === 0 ? <div className={layoutStyles.panel}><p className={layoutStyles.muted}>No orders for this view.</p></div> : null}
      </div>
    </>
  );
}
