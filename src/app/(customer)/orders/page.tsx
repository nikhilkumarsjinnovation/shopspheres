import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { formatINR } from '@/lib/formatters';
import CancelOrderButton from '@/components/CancelOrderButton';
import OrderTrack from '@/components/OrderTrack';

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
      <div>
        <h1>My Orders</h1>
        <p>Review and track your past purchases and gift deliveries.</p>
      </div>

      {error && (
        <div>
          Failed to load orders: {error.message}
        </div>
      )}

      {orderList.length === 0 ? (
        <div>
          <h2>No orders yet</h2>
          <p>When you complete a purchase, tracking appears here.</p>
          <Link
            href="/explore"
          >
            Explore products
          </Link>
        </div>
      ) : (
        <div>
          {orderList.map((order) => {
            const dateStr = new Date(order.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div key={order.id}>
                <div
                >
                  <div>
                    <div>ORDER</div>
                    <div>SS-{order.id.slice(0, 8).toUpperCase()}</div>
                    <div>{dateStr}</div>
                    <OrderTrack status={order.status} />
                  </div>

                  <div>
                    <div>TOTAL</div>
                    <div>
                      {formatINR(order.total_amount)}
                    </div>
                    <span
                    >
                      {order.status}
                    </span>
                    <CancelOrderButton orderId={order.id} status={order.status} />
                  </div>
                </div>

                <div>
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
                  >
                    <strong>Gift order · </strong> Sent to {order.recipient_email}. Surprise tracking is active.
                  </div>
                )}

                <div>
                  <div>
                    Items in Order:
                  </div>
                  <div>
                    {order.order_items.map((item) => (
                      <div
                        key={item.id}
                      >
                        <div>
                          <span>
                            {item.product?.title || 'Product'}
                          </span>
                          <span>
                            × {item.quantity}
                          </span>
                        </div>
                        <div>
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
