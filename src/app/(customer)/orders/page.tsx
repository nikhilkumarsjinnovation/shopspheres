import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { formatINR } from '@/lib/formatters';
import CancelOrderButton from '@/components/CancelOrderButton';
import OrderTrack from '@/components/OrderTrack';
import * as styles from '../customer.css';

export default async function OrdersPage() {
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);

  if (!session) {
    redirect('/login');
  }

  // Fetch orders placed by this customer, newest first
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      total_amount,
      status,
      is_gift,
      recipient_email,
      gift_reveal_date,
      shipping_address,
      created_at,
      order_items (
        id,
        quantity,
        unit_price,
        seller_id,
        product:products (
          id,
          title,
          category,
          shop_id
        )
      )
    `)
    .eq('customer_id', session.user.id)
    .order('created_at', { ascending: false });

  const orderList = orders || [];
  const orderIds = orderList.map((order) => order.id);
  const sellerIds = Array.from(new Set(orderList.flatMap((order) => order.order_items.map((item) => item.seller_id))));
  const { data: tracking } = orderIds.length
    ? await supabase.from('order_tracking_events').select('order_id, title, description, location, status, occurred_at').in('order_id', orderIds).order('occurred_at', { ascending: false })
    : { data: [] };
  const { data: shops } = sellerIds.length
    ? await supabase.from('shops').select('seller_id, name, city').in('seller_id', sellerIds)
    : { data: [] };
  const { data: sellers } = sellerIds.length
    ? await supabase.from('users').select('id, full_name').in('id', sellerIds)
    : { data: [] };

  return (
    <div>
      <div className={styles.headerContainer}>
        <h1 className={styles.heading}>My Orders</h1>
        <p className={styles.subheading}>Review and track your past purchases and gift deliveries.</p>
      </div>

      {error && (
        <div className={styles.alertError}>
          Failed to load orders: {error.message}
        </div>
      )}

      {orderList.length === 0 ? (
        <div className={styles.emptyState}>
          <h2 className={styles.sectionLabel} style={{ marginBottom: '0.5rem' }}>No orders yet</h2>
          <p className={styles.listMeta} style={{ marginBottom: '1.25rem' }}>When you complete a purchase, tracking appears here.</p>
          <Link
            href="/explore"
            className={styles.buttonAddToCart}
            style={{ textDecoration: 'none', padding: '0.75rem 1.5rem', display: 'inline-flex' }}
          >
            Explore products
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {orderList.map((order) => {
            const dateStr = new Date(order.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div key={order.id} className={styles.checkoutSection} style={{ marginBottom: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid #f2f2f2',
                    paddingBottom: '1rem',
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#737373' }}>ORDER</div>
                    <div style={{ fontWeight: 700, color: '#111111' }}>SS-{order.id.slice(0, 8).toUpperCase()}</div>
                    <div style={{ fontSize: '0.8rem', color: '#737373' }}>{dateStr}</div>
                    <OrderTrack status={order.status} />
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#737373' }}>TOTAL</div>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#111111' }}>
                      {formatINR(order.total_amount)}
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '0.15rem 0.5rem',
                        borderRadius: 0,
                        backgroundColor: '#ffffff',
                        color: '#111111',
                        border: '1px solid #111111',
                      }}
                    >
                      {order.status}
                    </span>
                    <CancelOrderButton orderId={order.id} status={order.status} />
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  {(shops ?? []).filter((shop) => order.order_items.some((item) => item.seller_id === shop.seller_id)).map((shop) => (
                    <div key={shop.seller_id}>Shop: {shop.name}, {shop.city}</div>
                  ))}
                  {(sellers ?? []).filter((seller) => order.order_items.some((item) => item.seller_id === seller.id)).map((seller) => (
                    <div key={seller.id}>Seller: {seller.full_name ?? 'Seller'}</div>
                  ))}
                  <div>Delivery updates come from the shop. A named delivery partner is not stored yet.</div>
                  <ul>
                    {(tracking ?? []).filter((event) => event.order_id === order.id).map((event) => (
                      <li key={`${event.order_id}-${event.occurred_at}`}>
                        {event.title}{event.location ? ` · ${event.location}` : ''} — {event.description}
                      </li>
                    ))}
                  </ul>
                </div>

                {order.is_gift && (
                  <div
                    style={{
                      backgroundColor: '#f2f2f2',
                      border: '1px solid #cccccc',
                      color: '#111111',
                      padding: '0.6rem 0.85rem',
                      borderRadius: 0,
                      fontSize: '0.85rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <strong>Gift order · </strong> Sent to {order.recipient_email}. Surprise tracking is active.
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#525252', marginBottom: '0.5rem' }}>
                    Items in Order:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {order.order_items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.875rem',
                          padding: '0.35rem 0',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 500 }}>
                            {item.product?.title || 'Product'}
                          </span>
                          <span style={{ color: '#737373', marginLeft: '0.5rem' }}>
                            × {item.quantity}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600 }}>
                          {formatINR(Number(item.unit_price) * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
