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
          <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Branding edits left: {editsLeft}. {shop ? <Link href={`/shops/${shop.id}`}>View public shop</Link> : null}
          </p>
        </div>
        <Link href="/seller/add-product" className={layoutStyles.buttonPrimary}>Add Product</Link>
      </header>
      {error ? <p>{error.message}</p> : null}
      <section>
        <h2>Full shop health</h2>
        <p>Live {health.live} · Pending {health.pending} · Rejected {health.rejected} · Low stock {health.lowStock}</p>
        <p>Orders {health.orders} · Revenue {formatINR(health.revenue)}</p>
      </section>
      <section>
        <h2>Mini-shops</h2>
        <ul>
          {health.categories.map((row) => (
            <li key={row.category}>
              <Link href={`/seller/inventory/${encodeURIComponent(row.category)}`}>{row.category}</Link>
              <span> · {row.products} products · live {row.live} · pending {row.pending} · rejected {row.rejected}</span>
              <span> · stock {formatINR(row.stockValue)} · sold {row.unitsSold} · {formatINR(row.revenue)}</span>
            </li>
          ))}
        </ul>
        {health.categories.length === 0 ? <p>No products yet. Add one to open a category mini-shop.</p> : null}
      </section>
    </>
  );
}
