import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Package, Store, Clock } from 'lucide-react';
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
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Order History & Tracking</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
          Review and monitor your verified purchases and gift deliveries in real time.
        </p>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          Failed to load orders: {error.message}
        </div>
      )}

      {orderList.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📦</div>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>No orders yet</h2>
          <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem', color: 'var(--fg-muted)' }}>
            When you complete a purchase, your item dispatch and live delivery tracking appears here.
          </p>
          <Link
            href="/explore"
            className="btn-card-add"
            style={{ padding: '0.65rem 1.75rem', fontSize: '0.9rem', display: 'inline-block' }}
          >
            Explore marketplace
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
              <div key={order.id} className="order-card">
                {/* Header Row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-muted)' }}>
                      Order #SS-{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>Placed on {dateStr}</span>
                      <span style={{ color: 'var(--fg-subtle)' }}>·</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--fg-primary)' }}>{formatINR(order.total_amount)}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: order.status === 'delivered' ? 'var(--success-bg)' : 'var(--bg-subtle)',
                        color: order.status === 'delivered' ? 'var(--success)' : 'var(--fg-primary)',
                        border: `1px solid ${order.status === 'delivered' ? 'var(--success-border)' : 'var(--border-subtle)'}`,
                      }}
                    >
                      {order.status.replace(/_/g, ' ')}
                    </span>
                    <CancelOrderButton orderId={order.id} status={order.status} />
                  </div>
                </div>

                {/* Tracking Stepper */}
                <div style={{ padding: '1rem 0' }}>
                  <OrderTrack status={order.status} />
                </div>

                {/* Seller & Dispatch Info */}
                <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1.25rem', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--fg-secondary)', marginBottom: '0.25rem' }}>
                    <Store size={14} />
                    {(shops ?? []).filter((shop) => order.order_items.some((item) => item.seller_id === shop.seller_id)).map((shop) => (
                      <span key={shop.seller_id}>Fulfillment partner: <strong>{shop.name}</strong> ({shop.city})</span>
                    ))}
                  </div>
                  {(tracking ?? []).filter((event) => event.order_id === order.id).length > 0 && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-subtle)' }}>
                      {(tracking ?? []).filter((event) => event.order_id === order.id).slice(0, 2).map((event) => (
                        <div key={`${event.order_id}-${event.occurred_at}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--fg-muted)' }}>
                          <Clock size={12} />
                          <span>{event.title} {event.location ? `(${event.location})` : ''} — {event.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {order.is_gift && (
                  <div style={{ padding: '0.75rem 1rem', background: 'var(--accent-glow)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(79, 70, 229, 0.2)', fontSize: '0.85rem', color: 'var(--accent-electric)', marginBottom: '1.25rem', fontWeight: 500 }}>
                    🎁 <strong>Gift Order:</strong> Sent to {order.recipient_email}. Surprise tracking is active.
                  </div>
                )}

                {/* Order Items List */}
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--fg-muted)', marginBottom: '0.65rem' }}>
                    Items in this package
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {order.order_items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <Package size={16} style={{ color: 'var(--fg-subtle)' }} />
                          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.product?.title || 'Product'}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>× {item.quantity}</span>
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                          {formatINR(Number(item.unit_price) * item.quantity)}
                        </span>
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
