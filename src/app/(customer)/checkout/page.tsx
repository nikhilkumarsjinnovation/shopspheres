'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/lib/supabase/client';
import * as styles from '../customer.css';

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const { cart, totalAmount, updateQuantity, removeFromCart, clearCart } = useCart();

  // Shipping Form State
  const [recipientName, setRecipientName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('United States');

  // Gift for Friend Feature State
  const [isGift, setIsGift] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [giftRevealDate, setGiftRevealDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<{ id: string; total: number } | null>(null);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    if (cart.length === 0) {
      setErrorMessage('Your cart is empty. Please add products before checking out.');
      setLoading(false);
      return;
    }

    try {
      // 1. Get authenticated user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage('Authentication required. Please sign in to finalize your purchase.');
        setLoading(false);
        return;
      }

      // 2. Validate Gift inputs if toggled
      if (isGift && !recipientEmail.trim()) {
        setErrorMessage('Please provide the recipient email address for gift delivery notifications.');
        setLoading(false);
        return;
      }

      const shippingAddress = {
        recipient_name: recipientName.trim(),
        address_line: addressLine.trim(),
        city: city.trim(),
        state: state.trim(),
        postal_code: postalCode.trim(),
        country: country.trim(),
      };

      // 3. Step 1: Insert into public.orders table
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          total_amount: totalAmount,
          status: 'pending',
          is_gift: isGift,
          recipient_email: isGift && recipientEmail.trim() ? recipientEmail.trim() : null,
          recipient_phone: isGift && recipientPhone.trim() ? recipientPhone.trim() : null,
          gift_reveal_date:
            isGift && giftRevealDate.trim() ? new Date(giftRevealDate).toISOString() : null,
          shipping_address: shippingAddress,
        })
        .select('id, total_amount')
        .single();

      if (orderError || !newOrder) {
        setErrorMessage(orderError?.message || 'Failed to initialize order.');
        setLoading(false);
        return;
      }

      // 4. Step 2: Insert into public.order_items table
      const orderItemsToInsert = cart.map((item) => ({
        order_id: newOrder.id,
        product_id: item.id,
        seller_id: item.seller_id,
        quantity: item.quantity,
        unit_price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert);

      if (itemsError) {
        setErrorMessage(`Order items insertion failed: ${itemsError.message}`);
        setLoading(false);
        return;
      }

      // 5. Checkout successful: clear cart and show confirmation
      clearCart();
      setSuccessOrder({ id: newOrder.id, total: Number(newOrder.total_amount) });
      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during checkout.';
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  if (successOrder) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <div className={styles.checkoutSection}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
          <h1 style={{ fontSize: '1.6rem', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Order Placed Successfully!
          </h1>
          <p style={{ color: '#64748b', margin: '0 0 1.5rem 0', fontSize: '0.95rem' }}>
            Thank you for shopping on ShopSphere. Your order has been registered and is pending fulfillment.
          </p>

          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'left',
              fontSize: '0.9rem',
            }}
          >
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Order ID:</strong>{' '}
              <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>{successOrder.id}</span>
            </div>
            <div>
              <strong>Total Charged:</strong> ${successOrder.total.toFixed(2)}
            </div>
            {isGift && (
              <div style={{ marginTop: '0.75rem', color: '#059669', fontWeight: 500 }}>
                🎁 Marked as Gift for {recipientEmail}. Tracking will be held until release threshold!
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link
              href="/orders"
              className={styles.buttonAddToCart}
              style={{ padding: '0.75rem 1.5rem', textDecoration: 'none', display: 'inline-block' }}
            >
              View My Orders
            </Link>
            <Link
              href="/explore"
              className={styles.buttonAddToCart}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#334155',
                padding: '0.75rem 1.5rem',
                textDecoration: 'none',
                display: 'inline-block',
                border: '1px solid #cbd5e1',
              }}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.headerContainer}>
        <h1 className={styles.heading}>Checkout</h1>
        <p className={styles.subheading}>Review your items, provide shipping details, and finalize your order.</p>
      </div>

      {errorMessage && <div className={styles.alertError}>{errorMessage}</div>}

      {cart.length === 0 ? (
        <div className={styles.emptyState}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
          <h2 style={{ fontSize: '1.25rem', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Your cart is currently empty
          </h2>
          <p style={{ margin: '0 0 1.5rem 0' }}>Explore our marketplace to find great products.</p>
          <Link
            href="/explore"
            className={styles.buttonAddToCart}
            style={{ textDecoration: 'none', padding: '0.75rem 1.5rem', display: 'inline-block' }}
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmitOrder}>
          <div className={styles.checkoutLayout}>
            {/* Left Column: Shipping and Gift Options */}
            <div>
              {/* Shipping Address Section */}
              <div className={styles.checkoutSection}>
                <h2 className={styles.sectionTitle}>1. Shipping Destination</h2>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="recipientName">
                    Recipient Full Name *
                  </label>
                  <input
                    id="recipientName"
                    type="text"
                    required
                    className={styles.input}
                    placeholder="Jane Doe"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="addressLine">
                    Street Address *
                  </label>
                  <input
                    id="addressLine"
                    type="text"
                    required
                    className={styles.input}
                    placeholder="123 Market St, Suite 400"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="city">
                      City *
                    </label>
                    <input
                      id="city"
                      type="text"
                      required
                      className={styles.input}
                      placeholder="San Francisco"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="state">
                      State / Province *
                    </label>
                    <input
                      id="state"
                      type="text"
                      required
                      className={styles.input}
                      placeholder="CA"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="postalCode">
                      ZIP / Postal Code *
                    </label>
                    <input
                      id="postalCode"
                      type="text"
                      required
                      className={styles.input}
                      placeholder="94105"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="country">
                      Country *
                    </label>
                    <input
                      id="country"
                      type="text"
                      required
                      className={styles.input}
                      placeholder="United States"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Gift for Friend Section */}
              <div className={styles.checkoutSection}>
                <h2 className={styles.sectionTitle}>2. Social Purchasing & Gifting</h2>

                <div className={styles.giftToggleContainer}>
                  <label className={styles.giftCheckboxLabel}>
                    <input
                      type="checkbox"
                      checked={isGift}
                      onChange={(e) => setIsGift(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>🎁 Send as a Gift for a Friend</span>
                  </label>

                  {isGift && (
                    <div className={styles.giftFieldsContainer}>
                      <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="recipientEmail">
                          Friend&apos;s Email Address *
                        </label>
                        <input
                          id="recipientEmail"
                          type="email"
                          required={isGift}
                          className={styles.input}
                          placeholder="friend@example.com"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="recipientPhone">
                          Friend&apos;s Phone (Optional)
                        </label>
                        <input
                          id="recipientPhone"
                          type="tel"
                          className={styles.input}
                          placeholder="+1 (555) 000-0000"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="giftRevealDate">
                          Surprise Reveal Date (Optional)
                        </label>
                        <input
                          id="giftRevealDate"
                          type="date"
                          className={styles.input}
                          value={giftRevealDate}
                          onChange={(e) => setGiftRevealDate(e.target.value)}
                        />
                      </div>

                      <div className={styles.giftNotice}>
                        <strong>🔒 Surprise Protection Active:</strong> Tracking details remain hidden from your friend
                        until the reveal date (or 24 hours prior to estimated delivery). You maintain full real-time tracking.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div>
              <div className={styles.summaryCard}>
                <h2 className={styles.sectionTitle} style={{ borderBottom: 'none', marginBottom: '1rem' }}>
                  Order Summary
                </h2>

                <div className={styles.cartItemList}>
                  {cart.map((item) => (
                    <div key={item.id} className={styles.cartRow}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                        <div
                          style={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.title}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                          ${item.price.toFixed(2)} × {item.quantity}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            background: '#f8fafc',
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '0.85rem', minWidth: '16px', textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            background: '#f8fafc',
                          }}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          style={{
                            color: '#ef4444',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            marginLeft: '4px',
                          }}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.summaryItem}>
                  <span>Subtotal</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span>Estimated Shipping</span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>FREE</span>
                </div>

                <div className={styles.summaryTotal}>
                  <span>Total</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>

                <button type="submit" disabled={loading} className={styles.buttonCheckout}>
                  {loading ? 'Processing Order...' : `Place Order • $${totalAmount.toFixed(2)}`}
                </button>

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <Link href="/explore" style={{ fontSize: '0.85rem', color: '#2563eb', textDecoration: 'none' }}>
                    ← Add more products
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
