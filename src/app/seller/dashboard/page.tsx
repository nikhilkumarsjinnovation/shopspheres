import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { buildShopHealth } from '@/lib/seller-health';
import { formatINR } from '@/lib/formatters';
import type { Product } from '@/types/database.types';
import layoutStyles from '../seller.module.css';

export default async function SellerDashboardPage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');

  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, branding_edits_used')
    .eq('seller_id', session.user.id)
    .maybeSingle();

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('seller_id', session.user.id);
  const { data: sales } = await supabase
    .from('order_items')
    .select('order_id, quantity, unit_price, product:products(category)')
    .eq('seller_id', session.user.id);

  const saleRows = (sales ?? []).map((item) => {
    const linked = item.product;
    const details = Array.isArray(linked) ? linked[0] : linked;
    const category = details && typeof details === 'object' && 'category' in details && typeof details.category === 'string'
      ? details.category
      : 'General';
    return {
      category,
      quantity: item.quantity,
      revenue: Number(item.unit_price) * item.quantity,
      orderId: item.order_id,
    };
  });
  const health = buildShopHealth((products ?? []) as Product[], saleRows);
  const editsLeft = Math.max(0, 2 - (shop?.branding_edits_used ?? 0));

  return (
    <>
      <header className={layoutStyles.topBar}>
        <div>
          <h1 className={layoutStyles.pageHeading}>{shop?.name ?? 'Your shop'}</h1>
          <p className={layoutStyles.muted} style={{ marginTop: '0.25rem' }}>
            {editsLeft} branding edit{editsLeft === 1 ? '' : 's'} left
            {shop ? <> · <Link href={`/shops/${shop.id}`}>Public shop</Link></> : null}
          </p>
        </div>
        <Link href="/seller/add-product" className={layoutStyles.buttonPrimary}>Add product</Link>
      </header>
      <div className={layoutStyles.pageBody}>
        {error ? <p className={layoutStyles.muted}>{error.message}</p> : null}
        <div className={layoutStyles.metricsGrid}>
          <div className={layoutStyles.metricCard}>
            <p className={layoutStyles.metricLabel}>Live</p>
            <p className={layoutStyles.metricValue}>{health.live}</p>
          </div>
          <div className={layoutStyles.metricCard}>
            <p className={layoutStyles.metricLabel}>Pending</p>
            <p className={layoutStyles.metricValue}>{health.pending}</p>
          </div>
          <div className={layoutStyles.metricCard}>
            <p className={layoutStyles.metricLabel}>Rejected</p>
            <p className={layoutStyles.metricValue}>{health.rejected}</p>
          </div>
          <div className={layoutStyles.metricCard}>
            <p className={layoutStyles.metricLabel}>Low stock</p>
            <p className={layoutStyles.metricValue}>{health.lowStock}</p>
          </div>
          <div className={layoutStyles.metricCard}>
            <p className={layoutStyles.metricLabel}>Orders</p>
            <p className={layoutStyles.metricValue}>{health.orders}</p>
          </div>
          <div className={layoutStyles.metricCard}>
            <p className={layoutStyles.metricLabel}>Revenue</p>
            <p className={layoutStyles.metricValue}>{formatINR(health.revenue)}</p>
          </div>
        </div>
        <section className={layoutStyles.panel}>
          <h2 className={layoutStyles.panelTitle}>Category mini-shops</h2>
          {health.categories.length === 0 ? (
            <p className={layoutStyles.muted}>No products yet. Add one to open a category mini-shop.</p>
          ) : (
            <ul className={layoutStyles.miniShopList}>
              {health.categories.map((row) => (
                <li key={row.category} className={layoutStyles.miniShopItem}>
                  <Link href={`/seller/inventory/${encodeURIComponent(row.category)}`}>{row.category}</Link>
                  <span className={layoutStyles.muted}>
                    {row.products} products · live {row.live} · pending {row.pending} · rejected {row.rejected}
                    · sold {row.unitsSold} · {formatINR(row.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
