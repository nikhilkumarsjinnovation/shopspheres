import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { buildShopHealth, categoryKey } from '@/lib/seller-health';
import { formatINR } from '@/lib/formatters';
import type { Product } from '@/types/database.types';
import layoutStyles from '../../seller.module.css';

export default async function MiniShopPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const name = decodeURIComponent(category);
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) redirect('/login');
  const { data: products } = await supabase.from('products').select('*').eq('seller_id', session.user.id);
  const { data: sales } = await supabase
    .from('order_items')
    .select('order_id, quantity, unit_price, product:products(category)')
    .eq('seller_id', session.user.id);
  const saleRows = (sales ?? []).map((item) => {
    const linked = item.product;
    const details = Array.isArray(linked) ? linked[0] : linked;
    return {
      category: details && typeof details === 'object' && 'category' in details && typeof details.category === 'string' ? details.category : 'General',
      quantity: item.quantity,
      revenue: Number(item.unit_price) * item.quantity,
      orderId: item.order_id,
    };
  });
  const health = buildShopHealth((products ?? []) as Product[], saleRows);
  const row = health.categories.find((item) => item.category === name);
  const list = ((products ?? []) as Product[]).filter((product) => categoryKey(product.category) === name);

  return (
    <>
      <header className={layoutStyles.topBar}>
        <div>
          <p className={layoutStyles.muted} style={{ marginBottom: '0.25rem' }}>
            <Link href="/seller/dashboard">All mini-shops</Link>
          </p>
          <h1 className={layoutStyles.pageHeading}>{name}</h1>
        </div>
        <Link href={`/seller/add-product?category=${encodeURIComponent(name)}`} className={layoutStyles.buttonPrimary}>
          Add product
        </Link>
      </header>
      <div className={layoutStyles.pageBody}>
        {row ? (
          <div className={layoutStyles.metricsGrid}>
            <div className={layoutStyles.metricCard}><p className={layoutStyles.metricLabel}>Products</p><p className={layoutStyles.metricValue}>{row.products}</p></div>
            <div className={layoutStyles.metricCard}><p className={layoutStyles.metricLabel}>Live</p><p className={layoutStyles.metricValue}>{row.live}</p></div>
            <div className={layoutStyles.metricCard}><p className={layoutStyles.metricLabel}>Pending</p><p className={layoutStyles.metricValue}>{row.pending}</p></div>
            <div className={layoutStyles.metricCard}><p className={layoutStyles.metricLabel}>Revenue</p><p className={layoutStyles.metricValue}>{formatINR(row.revenue)}</p></div>
          </div>
        ) : (
          <div className={layoutStyles.panel}><p className={layoutStyles.muted}>No products in this mini-shop yet.</p></div>
        )}
        <section className={layoutStyles.panel}>
          <h2 className={layoutStyles.panelTitle}>Products</h2>
          <ul className={layoutStyles.miniShopList}>
            {list.map((product) => (
              <li key={product.id} className={layoutStyles.miniShopItem}>
                <Link href={`/seller/products/${product.id}`}>{product.title}</Link>
                <span className={layoutStyles.muted}>
                  {product.approval_status} · stock {product.stock} · {formatINR(product.price)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
