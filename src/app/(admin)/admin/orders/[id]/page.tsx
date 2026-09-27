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
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <Link
        href="/admin/orders"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--fg-muted)',
          marginBottom: '1.5rem',
        }}
      >
        &larr; Back to orders
      </Link>

      <div className="checkout-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <span className="portal-badge active" style={{ textTransform: 'uppercase', fontSize: '0.72rem', marginBottom: '0.5rem' }}>
              {order.status.replace(/_/g, ' ')}
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{orderCode(order.id)}</h1>
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Destination: <strong>{place.city || 'Standard Delivery'} {place.pin}</strong> · Placed {new Date(order.created_at).toLocaleString('en-IN')}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>Total Value</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--fg-primary)' }}>{formatINR(order.total_amount)}</div>
          </div>
        </div>
      </div>

      <div className="checkout-card">
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>Purchased Order Items</h2>
        <table className="portal-table">
          <thead>
            <tr>
              <th>Item Title</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Subtotal</th>
              <th>Fulfillment Shop</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map((item) => {
              const shop = shopBySeller.get(item.seller_id);
              const title = item.product && !Array.isArray(item.product) ? item.product.title : 'Product';
              return (
                <tr key={item.id}>
                  <td><strong>{title}</strong></td>
                  <td>{item.quantity}</td>
                  <td>{formatINR(item.unit_price)}</td>
                  <td><strong>{formatINR(Number(item.unit_price) * item.quantity)}</strong></td>
                  <td>{shop ? `${shop.name} (${shop.city})` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
