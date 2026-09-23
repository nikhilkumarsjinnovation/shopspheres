import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { buildShopHealth, categoryKey } from '@/lib/seller-health';
import { formatINR } from '@/lib/formatters';
import type { Product } from '@/types/database.types';

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
    <main>
      <p><Link href="/seller/dashboard">All mini-shops</Link></p>
      <h1>{name}</h1>
      {row ? (
        <p>Products {row.products} · live {row.live} · pending {row.pending} · rejected {row.rejected} · low stock {row.lowStock} · sold {row.unitsSold} · {formatINR(row.revenue)}</p>
      ) : <p>No products in this mini-shop yet.</p>}
      <p><Link href={`/seller/add-product?category=${encodeURIComponent(name)}`}>Add a product here</Link></p>
      <ul>
        {list.map((product) => (
          <li key={product.id}>
            <Link href={`/seller/products/${product.id}`}>{product.title}</Link>
            {' '}· {product.approval_status} · stock {product.stock} · {formatINR(product.price)}
          </li>
        ))}
      </ul>
    </main>
  );
}
