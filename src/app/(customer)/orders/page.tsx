import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { formatINR } from '@/lib/formatters';
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
        product:products (
          id,
          title,
          category
        )
      )
    `)
    .eq('customer_id', session.user.id)
    .order('created_at', { ascending: false });

  const orderList = orders || [];

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
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h2 style={{ fontSize: '1.25rem', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            No orders placed yet
          </h2>
          <p style={{ margin: '0 0 1.5rem 0' }}>When you complete a purchase, your tracking details will appear here.</p>
          <Link
            href="/explore"
            className={styles.buttonAddToCart}
            style={{ textDecoration: 'none', padding: '0.75rem 1.5rem', display: 'inline-block' }}
          >
            Start Shopping
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
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '1rem',
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>ORDER PLACED</div>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{dateStr}</div>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                      ID: {order.id}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>TOTAL</div>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#0f172a' }}>
                      {formatINR(order.total_amount)}
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor:
                          order.status === 'delivered'
                            ? '#ecfdf5'
                            : order.status === 'shipped'
                            ? '#eff6ff'
                            : '#fef3c7',
                        color:
                          order.status === 'delivered'
                            ? '#065f46'
                            : order.status === 'shipped'
                            ? '#1d4ed8'
                            : '#92400e',
                      }}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                {order.is_gift && (
                  <div
                    style={{
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1e40af',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      marginBottom: '1rem',
                    }}
                  >
                    🎁 <strong>Gift Order:</strong> Sent to {order.recipient_email}. Surprise tracking is active.
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
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
                          <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>
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
