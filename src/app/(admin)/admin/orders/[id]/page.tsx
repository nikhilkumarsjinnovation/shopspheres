import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/formatters';
import { orderCode, shippingCityAndPin } from '@/lib/platform-stats';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, total_amount, created_at, shipping_address, order_items(id, quantity, unit_price, seller_id, product:products(title))')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    return <div>{error.message}</div>;
  }
  if (!order) notFound();

  const place = shippingCityAndPin(order.shipping_address);
  const sellerIds = Array.from(new Set(order.order_items.map((item) => item.seller_id)));
  const { data: shops } = sellerIds.length
    ? await supabase.from('shops').select('seller_id, name, city').in('seller_id', sellerIds)
    : { data: [] };
  const shopBySeller = new Map((shops ?? []).map((shop) => [shop.seller_id, shop]));

  return (
    <div>
      <div>
        <h1>{orderCode(order.id)}</h1>
        <p>{order.status} · {formatINR(order.total_amount)} · {place.city} {place.pin}</p>
      </div>
      <p><Link href="/admin/orders">Back to orders</Link></p>
      <div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Shop</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map((item) => {
              const shop = shopBySeller.get(item.seller_id);
              const title = item.product && !Array.isArray(item.product) ? item.product.title : 'Product';
              return (
                <tr key={item.id}>
                  <td>{title}</td>
                  <td>{item.quantity}</td>
                  <td>{formatINR(item.unit_price)}</td>
                  <td>{shop ? `${shop.name}, ${shop.city}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
