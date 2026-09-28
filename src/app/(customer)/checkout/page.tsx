'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/lib/supabase/client';
import { formatINR, INDIAN_STATES } from '@/lib/formatters';
import { fetchWithCsrf } from '@/lib/csrf-client';
import UpiPaymentPanel from '@/components/UpiPaymentPanel';
import PracticePaymentPanel from '@/components/PracticePaymentPanel';

interface SavedAddress {
  id: string;
  recipient_name: string;
  recipient_phone: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  label: string;
  delivery_instructions?: string | null;
  is_default: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const { cart, totalAmount, clearCart, updateQuantity, removeFromCart } = useCart();

  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [saveToAddressBook, setSaveToAddressBook] = useState(true);

  // New Address Form State
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [postalCode, setPostalCode] = useState('');
  const [addressLabel, setAddressLabel] = useState<'Home' | 'Work' | 'Other'>('Home');

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'wallet' | 'cod' | 'card' | 'netbanking' | 'stripe'>('wallet');
  const [paymentReady, setPaymentReady] = useState(true);

  // In-App Wallet State
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);

  // Gift for Friend Feature State
  const [isGift, setIsGift] = useState(false);
  const [giftRecipientEmail, setGiftRecipientEmail] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [giftRevealDate, setGiftRevealDate] = useState('');

  // Behavioral Offers State
  const [offers, setOffers] = useState<any[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedOffer, setAppliedOffer] = useState<{
    code: string;
    title: string;
    discountAmount: number;
  } | null>(null);
  const [offerFeedback, setOfferFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<{ id: string; total: number } | null>(null);

  // Fetch saved addresses from user_addresses API
  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/v1/addresses');
      if (res.ok) {
        const data = await res.json();
        const list: SavedAddress[] = data.addresses || [];
        setSavedAddresses(list);

        if (list.length > 0) {
          const defaultAddr = list.find((a) => a.is_default) || list[0];
          setSelectedAddressId(defaultAddr?.id || null);
          setIsAddingNewAddress(false);
        } else {
          setIsAddingNewAddress(true);
        }
      }
    } catch (err) {
      console.error('Failed to load user addresses:', err);
    }
  }, []);

  // Fetch personalized behavioral offers
  useEffect(() => {
    fetchWithCsrf('/api/v1/offers/personalized')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.offers) {
          setOffers(data.offers);
        }
      })
      .catch((err) => console.warn('Could not load behavioral offers:', err));
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Fetch in-app wallet balance
  const fetchWallet = useCallback(async () => {
    try {
      setLoadingWallet(true);
      const res = await fetchWithCsrf('/api/v1/wallet');
      if (res.ok) {
        const data = await res.json();
        if (data.wallet) {
          setWalletBalance(Number(data.wallet.balance));
        }
      }
    } catch (err) {
      console.warn('Could not load wallet:', err);
    } finally {
      setLoadingWallet(false);
    }
  }, []);

  const handleQuickTopup = async (amt: number) => {
    try {
      setToppingUp(true);
      const res = await fetchWithCsrf('/api/v1/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, description: 'Quick Checkout Top-Up' }),
      });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(Number(data.new_balance));
        setPaymentReady(true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('shopsphere:wallet-update', { detail: { balance: data.new_balance } }));
        }
      }
    } catch (err) {
      console.warn('Topup failed:', err);
    } finally {
      setToppingUp(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Delivery calculations in INR
  const deliveryFee = totalAmount >= 499 ? 0 : 40;
  const handlingFee = 19;
  const couponDiscount = appliedOffer ? appliedOffer.discountAmount : 0;
  const finalTotalINR = Math.max(0, totalAmount - couponDiscount + deliveryFee + handlingFee);

  // Apply a coupon code
  const handleApplyCoupon = (codeToApply: string) => {
    setOfferFeedback(null);
    const code = codeToApply.trim().toUpperCase();
    if (!code) return;

    // Search in behavioral offers or match predefined codes
    const foundOffer = offers.find((o) => o.code.toUpperCase() === code);

    let discount = 0;
    let title = '';

    if (foundOffer) {
      if (totalAmount < foundOffer.minOrderAmount) {
        setOfferFeedback({
          type: 'error',
          message: `Minimum order of ${formatINR(foundOffer.minOrderAmount)} required for ${foundOffer.code}. (Cart total: ${formatINR(totalAmount)})`,
        });
        return;
      }

      if (foundOffer.discountType === 'percentage') {
        const calc = Math.round((totalAmount * foundOffer.discountValue) / 100);
        discount = foundOffer.maxDiscount ? Math.min(calc, foundOffer.maxDiscount) : calc;
      } else {
        discount = foundOffer.discountValue;
      }
      title = foundOffer.title;
    } else if (code === 'WELCOME10') {
      if (totalAmount < 499) {
        setOfferFeedback({ type: 'error', message: 'Minimum cart value of ₹499 required for WELCOME10.' });
        return;
      }
      discount = Math.min(Math.round(totalAmount * 0.1), 250);
      title = 'Welcome 10% Discount';
    } else if (code === 'UPISAVE50') {
      if (totalAmount < 499) {
        setOfferFeedback({ type: 'error', message: 'Minimum cart value of ₹499 required for UPISAVE50.' });
        return;
      }
      discount = 50;
      title = 'Instant UPI Flat ₹50 Discount';
    } else if (code === 'TECH1000') {
      if (totalAmount < 10000) {
        setOfferFeedback({ type: 'error', message: 'Minimum cart value of ₹10,000 required for TECH1000.' });
        return;
      }
      discount = 1000;
      title = 'TechFest ₹1,000 Instant Discount';
    } else if (code === 'UTSAV500') {
      if (totalAmount < 1999) {
        setOfferFeedback({ type: 'error', message: 'Minimum cart value of ₹1,999 required for UTSAV500.' });
        return;
      }
      discount = 500;
      title = 'Festive Ethnic Wear ₹500 Discount';
    } else if (code === 'AUDIO15') {
      if (totalAmount < 999) {
        setOfferFeedback({ type: 'error', message: 'Minimum cart value of ₹999 required for AUDIO15.' });
        return;
      }
      discount = Math.min(Math.round(totalAmount * 0.15), 400);
      title = 'Audio Bonanza 15% Discount';
    } else if (code === 'KITCHEN300') {
      if (totalAmount < 1500) {
        setOfferFeedback({ type: 'error', message: 'Minimum cart value of ₹1,500 required for KITCHEN300.' });
        return;
      }
      discount = 300;
      title = 'Home Chef ₹300 Discount';
    } else {
      setOfferFeedback({
        type: 'error',
        message: `Invalid coupon code "${code}". Please select from the offers listed below.`,
      });
      return;
    }

    setAppliedOffer({
      code,
      title,
      discountAmount: discount,
    });
    setCouponInput('');
    setOfferFeedback({
      type: 'success',
      message: `🎉 Coupon ${code} applied! Saved ${formatINR(discount)}.`,
    });
  };

  const handleRemoveCoupon = () => {
    setAppliedOffer(null);
    setOfferFeedback(null);
  };

  // Dedicated handler to save address explicitly
  const handleSaveAddressExplicitly = async () => {
    if (!recipientName.trim() || !recipientPhone.trim() || !addressLine1.trim() || !city.trim() || !postalCode.trim()) {
      setErrorMessage('Please fill in Name, Phone, Address, City, and PIN Code before saving.');
      return;
    }

    if (recipientPhone.trim().replace(/\D/g, '').length < 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (postalCode.trim().replace(/\D/g, '').length !== 6) {
      setErrorMessage('Please enter a valid 6-digit Indian postal PIN code.');
      return;
    }

    setSavingAddress(true);
    setErrorMessage(null);

    try {
      const res = await fetchWithCsrf('/api/v1/addresses', {
        method: editingAddressId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAddressId,
          recipient_name: recipientName.trim(),
          recipient_phone: recipientPhone.trim(),
          address_line1: addressLine1.trim(),
          address_line2: addressLine2.trim() || landmark.trim() || null,
          city: city.trim(),
          state: state.trim(),
          postal_code: postalCode.trim(),
          label: addressLabel,
          is_default: savedAddresses.length === 0,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save address');
      }

      await fetchAddresses();
      setIsAddingNewAddress(false);
      setEditingAddressId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save address.';
      setErrorMessage(msg);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    if (cart.length === 0) {
      setErrorMessage('Your cart is empty. Please add items before checking out.');
      setLoading(false);
      return;
    }

    if ((paymentMethod === 'card' || paymentMethod === 'netbanking') && !paymentReady) {
      setErrorMessage('Finish the practice card or net banking steps, including the OTP, before placing the order.');
      setLoading(false);
      return;
    }

    if (paymentMethod === 'wallet' && walletBalance !== null && walletBalance < finalTotalINR) {
      setErrorMessage(
        `Insufficient in-app wallet balance. Available: ${formatINR(walletBalance)}, Required: ${formatINR(finalTotalINR)}. Please top up your wallet or choose another payment method.`
      );
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage('Authentication required. Please log in to complete your order.');
        setLoading(false);
        return;
      }

      let activeShippingAddress: any = null;

      // Case A: Using a selected saved address
      if (!isAddingNewAddress && selectedAddressId) {
        const addr = savedAddresses.find((a) => a.id === selectedAddressId);
        if (!addr) {
          setErrorMessage('Please select a valid delivery address.');
          setLoading(false);
          return;
        }
        activeShippingAddress = {
          recipient_name: addr.recipient_name,
          recipient_phone: addr.recipient_phone,
          address_line: `${addr.address_line1}${addr.address_line2 ? ', ' + addr.address_line2 : ''}`,
          city: addr.city,
          state: addr.state,
          postal_code: addr.postal_code,
          country: 'India',
        };
      } else {
        // Case B: Entering a new address
        if (!recipientName.trim() || !recipientPhone.trim() || !addressLine1.trim() || !city.trim() || !postalCode.trim()) {
          setErrorMessage('Please fill in all mandatory address fields (Name, Phone, House/Street, City, PIN Code).');
          setLoading(false);
          return;
        }

        if (recipientPhone.trim().replace(/\D/g, '').length < 10) {
          setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
          setLoading(false);
          return;
        }

        if (postalCode.trim().replace(/\D/g, '').length !== 6) {
          setErrorMessage('Please enter a valid 6-digit Indian postal PIN code.');
          setLoading(false);
          return;
        }

        activeShippingAddress = {
          recipient_name: recipientName.trim(),
          recipient_phone: recipientPhone.trim(),
          address_line: `${addressLine1.trim()}${addressLine2.trim() ? ', ' + addressLine2.trim() : ''}${landmark.trim() ? ' (Landmark: ' + landmark.trim() + ')' : ''}`,
          city: city.trim(),
          state: state.trim(),
          postal_code: postalCode.trim(),
          country: 'India',
        };

        // If user wants to save this address to their address book
        if (saveToAddressBook) {
          try {
            await fetchWithCsrf('/api/v1/addresses', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipient_name: recipientName.trim(),
                recipient_phone: recipientPhone.trim(),
                address_line1: addressLine1.trim(),
                address_line2: addressLine2.trim() || landmark.trim() || null,
                city: city.trim(),
                state: state.trim(),
                postal_code: postalCode.trim(),
                label: addressLabel,
                is_default: savedAddresses.length === 0,
              }),
            });
          } catch (addrErr) {
            console.warn('Could not save address to address book:', addrErr);
          }
        }
      }

      // Step 1: Place Order via Server-Side Orders API (solves UUID and seller_id constraints)
      const res = await fetchWithCsrf('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          shippingAddress: activeShippingAddress,
          paymentMethod,
          confirmNow: paymentMethod !== 'stripe',
          appliedOffer: appliedOffer
            ? {
                code: appliedOffer.code,
                discountAmount: appliedOffer.discountAmount,
              }
            : null,
          isGift,
          giftRecipientEmail: isGift && giftRecipientEmail.trim() ? giftRecipientEmail.trim() : null,
          giftMessage: isGift && giftMessage.trim() ? giftMessage.trim() : null,
          giftRevealDate: isGift && giftRevealDate.trim() ? giftRevealDate.trim() : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order.');
      }

      if (typeof data.checkoutUrl === 'string') {
        window.location.assign(data.checkoutUrl);
        return;
      }

      // Step 2: Clear Cart and Show Success Confirmation
      if (paymentMethod === 'wallet' && walletBalance !== null) {
        const newBal = Math.max(0, walletBalance - finalTotalINR);
        setWalletBalance(newBal);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('shopsphere:wallet-update', { detail: { balance: newBal } }));
        }
      }

      clearCart();
      setSuccessOrder({ id: data.order.id, total: Number(data.order.total) });
      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during checkout.';
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  if (successOrder) {
    return (
      <div className="animate-slide-up" style={{ padding: '3rem 1rem', display: 'flex', justifyContent: 'center' }}>
        <div className="checkout-card" style={{ maxWidth: '540px', width: '100%', textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Order Confirmed & Placed!
          </h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2rem' }}>
            Thank you for shopping on <strong>ShopSphere India</strong>. Your local order has been verified and sent to our neighborhood fulfillment hub.
          </p>

          <div style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '2rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--fg-muted)' }}>Order ID:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>SS-{successOrder.id.slice(0, 8).toUpperCase()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--fg-muted)' }}>Total Amount Paid:</span>
              <strong style={{ color: 'var(--success)' }}>{formatINR(successOrder.total)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--fg-muted)' }}>Estimated Delivery:</span>
              <strong>Tomorrow by 8:00 PM</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/orders" className="btn-card-add" style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}>
              Track Order
            </Link>
            <Link href="/explore" className="btn-card-toggle" style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Secure Checkout</h1>
          <span className="section-badge">🇮🇳 100% Indian Marketplace</span>
        </div>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem' }}>
          Review items, select your saved delivery address, choose an instant payment method, and confirm your order.
        </p>
      </div>

      {errorMessage && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="checkout-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* STEP 1: DELIVERY ADDRESS SELECTION */}
          <div className="checkout-card">
            <div className="checkout-card-header">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                1. Select Delivery Address
              </h2>
              {savedAddresses.length > 0 && !isAddingNewAddress && (
                <button
                  type="button"
                  className="btn-card-toggle"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => setIsAddingNewAddress(true)}
                >
                  + Add New Address
                </button>
              )}
            </div>

            {/* List of Saved Addresses */}
            {!isAddingNewAddress && savedAddresses.length > 0 ? (
              <div className="saved-addresses-grid">
                {savedAddresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <label
                      key={addr.id}
                      className={`saved-address-card ${isSelected ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        className="address-radio-input"
                        checked={isSelected}
                        onChange={() => setSelectedAddressId(addr.id)}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--fg-primary)' }}>{addr.recipient_name}</strong>
                          <span className="address-tag-pill">
                            {addr.label || 'Home'}
                          </span>
                          {addr.is_default && (
                            <span className="address-tag-pill default">
                              Default
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.825rem', color: 'var(--fg-secondary)', lineHeight: 1.45, marginBottom: '0.35rem' }}>
                          {addr.address_line1}
                          {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                          <br />
                          {addr.city}, {addr.state} — <strong>{addr.postal_code}</strong>
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                          Phone: <strong style={{ color: 'var(--fg-primary)' }}>+91 {addr.recipient_phone}</strong>
                        </p>
                        <div className="address-actions-bar">
                          <button
                            type="button"
                            className="btn-link-action"
                            onClick={(event) => {
                              event.preventDefault();
                              setEditingAddressId(addr.id);
                              setRecipientName(addr.recipient_name);
                              setRecipientPhone(addr.recipient_phone);
                              setAddressLine1(addr.address_line1);
                              setAddressLine2(addr.address_line2 ?? '');
                              setCity(addr.city);
                              setState(addr.state);
                              setPostalCode(addr.postal_code);
                              setAddressLabel((addr.label === 'Work' || addr.label === 'Other' ? addr.label : 'Home'));
                              setIsAddingNewAddress(true);
                            }}
                          >
                            Edit
                          </button>
                          <span style={{ color: 'var(--border-medium)' }}>·</span>
                          <button
                            type="button"
                            className="btn-link-action danger"
                            onClick={(event) => {
                              event.preventDefault();
                              void fetchWithCsrf(`/api/v1/addresses?id=${addr.id}`, { method: 'DELETE' }).then(() => {
                                setSavedAddresses((current) => current.filter((item) => item.id !== addr.id));
                              });
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              /* Add New Address Form */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                {savedAddresses.length > 0 && (
                  <button
                    type="button"
                    className="btn-card-toggle"
                    style={{ alignSelf: 'flex-start', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => setIsAddingNewAddress(false)}
                  >
                    ← Back to saved addresses
                  </button>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div className="auth-form-group" style={{ marginBottom: 0 }}>
                    <label className="auth-label">Full Name (First and Last name) *</label>
                    <input
                      type="text"
                      className="auth-input"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                    />
                  </div>

                  <div className="auth-form-group" style={{ marginBottom: 0 }}>
                    <label className="auth-label">10-Digit Mobile Number *</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span
                        style={{
                          height: '3.1rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0 0.75rem',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-subtle)',
                          borderRight: 'none',
                          borderTopLeftRadius: 'var(--radius-lg)',
                          borderBottomLeftRadius: 'var(--radius-lg)',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'var(--fg-muted)',
                        }}
                      >
                        +91
                      </span>
                      <input
                        type="tel"
                        className="auth-input"
                        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>
                </div>

                <div className="auth-form-group" style={{ marginBottom: 0 }}>
                  <label className="auth-label">Flat, House no., Building, Company, Apartment *</label>
                  <input
                    type="text"
                    className="auth-input"
                    required
                    placeholder="e.g. Flat 402, Shanti Heights, Plot 14"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="auth-form-group" style={{ marginBottom: 0 }}>
                    <label className="auth-label">Area, Street, Sector, Village</label>
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="e.g. Bandra West, Linking Road"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                    />
                  </div>

                  <div className="auth-form-group" style={{ marginBottom: 0 }}>
                    <label className="auth-label">Landmark</label>
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="e.g. Near Lilavati Hospital"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="auth-form-group" style={{ marginBottom: 0 }}>
                    <label className="auth-label">Town / City *</label>
                    <input
                      type="text"
                      className="auth-input"
                      required
                      placeholder="e.g. Mumbai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="auth-form-group" style={{ marginBottom: 0 }}>
                    <label className="auth-label">State *</label>
                    <select
                      className="custom-select"
                      style={{ width: '100%', height: '3.1rem' }}
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="auth-form-group" style={{ marginBottom: 0 }}>
                    <label className="auth-label">PIN Code (6 digits) *</label>
                    <input
                      type="text"
                      className="auth-input"
                      required
                      maxLength={6}
                      placeholder="e.g. 400050"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                {/* Save Address Checkbox & Tag */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}>
                    <input
                      type="checkbox"
                      checked={saveToAddressBook}
                      onChange={(e) => setSaveToAddressBook(e.target.checked)}
                      style={{ accentColor: 'var(--fg-primary)', width: '16px', height: '16px' }}
                    />
                    <span>Save this address to my account for future orders</span>
                  </label>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        className={`variant-option-chip ${addressLabel === lbl ? 'selected' : ''}`}
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                        onClick={() => setAddressLabel(lbl)}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button
                    type="button"
                    className="btn-card-add"
                    style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
                    onClick={handleSaveAddressExplicitly}
                    disabled={savingAddress}
                  >
                    {savingAddress ? 'Saving Address...' : '💾 Save Address to Account'}
                  </button>
                  <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
                    Saves to your ShopSphere India address book immediately
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: INDIAN PAYMENT METHODS */}
          <div className="checkout-card">
            <div className="checkout-card-header">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>2. Choose Payment Method</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* ShopSphere In-App Wallet */}
              <label
                style={{
                  display: 'block',
                  border: `2px solid ${paymentMethod === 'wallet' ? 'var(--accent-electric)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  background: paymentMethod === 'wallet' ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.05), var(--bg-surface))' : 'var(--bg-canvas)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wallet"
                    checked={paymentMethod === 'wallet'}
                    onChange={() => {
                      setPaymentMethod('wallet');
                      setPaymentReady(walletBalance !== null && walletBalance >= finalTotalINR);
                    }}
                    style={{ accentColor: 'var(--accent-electric)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>💳</span>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--fg-primary)' }}>ShopSphere In-App Wallet</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span
                          style={{
                            padding: '0.15rem 0.55rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: walletBalance !== null && walletBalance >= finalTotalINR ? 'var(--success-bg)' : 'var(--warning-bg)',
                            color: walletBalance !== null && walletBalance >= finalTotalINR ? 'var(--success)' : 'var(--warning)',
                            border: `1px solid ${walletBalance !== null && walletBalance >= finalTotalINR ? 'var(--success-border)' : 'var(--warning-border)'}`,
                          }}
                        >
                          {loadingWallet ? 'Checking…' : `Available: ${formatINR(walletBalance ?? 0)}`}
                        </span>
                        <span className="section-badge" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                          1-Tap Instant
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
                      Instant one-tap debit · Zero gateway fee · Automated 100% refund on order cancellation
                    </p>
                  </div>
                </div>

                {paymentMethod === 'wallet' && (
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border-subtle)' }}>
                    {walletBalance !== null && walletBalance < finalTotalINR ? (
                      <div>
                        <div style={{ fontSize: '0.825rem', color: 'var(--warning)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>⚠️</span>
                          <span>
                            Shortfall of <strong>{formatINR(finalTotalINR - walletBalance)}</strong>. Top up your wallet to complete purchase.
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn-card-add"
                            disabled={toppingUp}
                            onClick={(e) => {
                              e.preventDefault();
                              void handleQuickTopup(Math.ceil((finalTotalINR - walletBalance) / 100) * 100);
                            }}
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
                          >
                            {toppingUp ? 'Adding Funds…' : `+ Add ${formatINR(Math.ceil((finalTotalINR - walletBalance) / 100) * 100)} (Exact Shortfall)`}
                          </button>
                          {[500, 1000, 2000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              className="variant-option-chip"
                              disabled={toppingUp}
                              onClick={(e) => {
                                e.preventDefault();
                                void handleQuickTopup(amt);
                              }}
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            >
                              +₹{amt.toLocaleString('en-IN')}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.825rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>✅</span>
                        <span>Wallet balance is sufficient! Click &ldquo;Place Order&rdquo; for instant 1-tap fulfillment.</span>
                      </div>
                    )}
                  </div>
                )}
              </label>

              {/* UPI */}
              <label
                style={{
                  display: 'block',
                  border: `2px solid ${paymentMethod === 'upi' ? 'var(--fg-primary)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  background: paymentMethod === 'upi' ? 'var(--bg-surface)' : 'var(--bg-canvas)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="upi"
                    checked={paymentMethod === 'upi'}
                    onChange={() => { setPaymentMethod('upi'); setPaymentReady(true); }}
                    style={{ accentColor: 'var(--fg-primary)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '0.95rem' }}>Instant UPI (Google Pay, PhonePe, Paytm, BHIM)</strong>
                      <span className="section-badge" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>Recommended</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
                      Zero gateway fee · Instant dynamic QR scan or direct app authorization
                    </p>
                  </div>
                </div>
                {paymentMethod === 'upi' && (
                  <UpiPaymentPanel amountLabel={formatINR(finalTotalINR)} />
                )}
              </label>

              {/* Cash on Delivery */}
              <label
                style={{
                  display: 'block',
                  border: `2px solid ${paymentMethod === 'cod' ? 'var(--fg-primary)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  background: paymentMethod === 'cod' ? 'var(--bg-surface)' : 'var(--bg-canvas)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => { setPaymentMethod('cod'); setPaymentReady(true); }}
                    style={{ accentColor: 'var(--fg-primary)' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>Pay on Delivery / Cash on Delivery</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
                      Pay with cash or scan delivery partner&apos;s UPI QR code upon arrival at your doorstep
                    </p>
                  </div>
                </div>
              </label>

              {/* Debit / Credit Cards */}
              <label
                style={{
                  display: 'block',
                  border: `2px solid ${paymentMethod === 'card' ? 'var(--fg-primary)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  background: paymentMethod === 'card' ? 'var(--bg-surface)' : 'var(--bg-canvas)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => { setPaymentMethod('card'); setPaymentReady(false); }}
                    style={{ accentColor: 'var(--fg-primary)' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>Credit or Debit Card (RuPay, Visa, MasterCard)</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
                      Safe sandbox card checkout with 3D Secure simulation
                    </p>
                  </div>
                </div>
                {paymentMethod === 'card' && (
                  <PracticePaymentPanel mode="card" amountLabel={formatINR(finalTotalINR)} onReady={setPaymentReady} />
                )}
              </label>

              {/* Net Banking */}
              <label
                style={{
                  display: 'block',
                  border: `2px solid ${paymentMethod === 'netbanking' ? 'var(--fg-primary)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  background: paymentMethod === 'netbanking' ? 'var(--bg-surface)' : 'var(--bg-canvas)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="netbanking"
                    checked={paymentMethod === 'netbanking'}
                    onChange={() => { setPaymentMethod('netbanking'); setPaymentReady(false); }}
                    style={{ accentColor: 'var(--fg-primary)' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>Net Banking (All Indian Scheduled Banks)</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
                      SBI, HDFC, ICICI, Axis, Kotak, and 40+ leading financial institutions
                    </p>
                  </div>
                </div>
                {paymentMethod === 'netbanking' && (
                  <PracticePaymentPanel mode="netbanking" amountLabel={formatINR(finalTotalINR)} onReady={setPaymentReady} />
                )}
              </label>
            </div>
          </div>

          {/* STEP 3: GIFT FOR FRIEND (OPTIONAL) */}
          <div className="checkout-card">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={isGift}
                onChange={(e) => setIsGift(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--fg-primary)' }}
              />
              <span>🎁 Send as a Surprise Gift for a Friend / Loved One</span>
            </label>

            {isGift && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="auth-form-group" style={{ marginBottom: 0 }}>
                    <label className="auth-label">Recipient Email Address</label>
                    <input
                      type="email"
                      className="auth-input"
                      placeholder="friend@example.com"
                      value={giftRecipientEmail}
                      onChange={(e) => setGiftRecipientEmail(e.target.value)}
                    />
                  </div>

                  <div className="auth-form-group" style={{ marginBottom: 0 }}>
                    <label className="auth-label">Surprise Reveal Date</label>
                    <input
                      type="date"
                      className="auth-input"
                      value={giftRevealDate}
                      onChange={(e) => setGiftRevealDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="auth-form-group" style={{ marginBottom: 0 }}>
                  <label className="auth-label">Personal Gift Note / Greetings</label>
                  <textarea
                    rows={2}
                    className="auth-input"
                    style={{ height: 'auto', padding: '0.75rem 1rem' }}
                    placeholder="Wishing you a very Happy Birthday! Enjoy the gift!"
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: STICKY ORDER SUMMARY */}
        <div>
          <div className="order-summary-panel">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.35rem' }}>
              Order Summary
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginBottom: '1.25rem' }}>
              {cart.length} unique {cart.length === 1 ? 'item' : 'items'} in your bag
            </p>

            {/* Cart Items Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem', maxHeight: '280px', overflowY: 'auto' }}>
              {cart.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ flex: 1, paddingRight: '0.75rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg-primary)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                      <div className="qty-stepper">
                        <button
                          type="button"
                          className="qty-stepper-btn"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="qty-stepper-val">{item.quantity}</span>
                        <button
                          type="button"
                          className="qty-stepper-btn"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer' }}
                        onClick={() => removeFromCart(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--fg-primary)' }}>
                    {formatINR(item.price * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>

            {/* Behavioral Offers & Coupons Section */}
            <div style={{ padding: '1rem', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.825rem' }}>Discount Coupons</strong>
                <span className="section-badge" style={{ fontSize: '0.65rem' }}>AI matched</span>
              </div>

              {offerFeedback && (
                <div style={{ fontSize: '0.75rem', color: offerFeedback.type === 'success' ? 'var(--success)' : 'var(--danger)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {offerFeedback.message}
                </div>
              )}

              {appliedOffer ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>
                      APPLIED: {appliedOffer.code}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--fg-muted)' }}>
                      {appliedOffer.title} (−{formatINR(appliedOffer.discountAmount)})
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                    onClick={handleRemoveCoupon}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    className="auth-input"
                    style={{ height: '2.4rem', fontSize: '0.8rem', textTransform: 'uppercase' }}
                    placeholder="Enter coupon code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  />
                  <button
                    type="button"
                    className="btn-card-add"
                    style={{ padding: '0 1rem', fontSize: '0.8rem' }}
                    onClick={() => handleApplyCoupon(couponInput)}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Price Calculations */}
            <div className="summary-row">
              <span>Items Subtotal</span>
              <span>{formatINR(totalAmount)}</span>
            </div>

            {appliedOffer && (
              <div className="summary-row" style={{ color: 'var(--success)' }}>
                <span>Coupon Discount ({appliedOffer.code})</span>
                <span>−{formatINR(appliedOffer.discountAmount)}</span>
              </div>
            )}

            <div className="summary-row">
              <span>Delivery Fee</span>
              <span>{deliveryFee === 0 ? 'FREE (Orders > ₹499)' : formatINR(deliveryFee)}</span>
            </div>

            <div className="summary-row">
              <span>Eco Packaging & Handling</span>
              <span>{formatINR(handlingFee)}</span>
            </div>

            <div className="summary-row total">
              <span>Total Payable</span>
              <span>{formatINR(finalTotalINR)}</span>
            </div>

            <button
              type="submit"
              className="btn-place-order"
              disabled={loading || cart.length === 0 || ((paymentMethod === 'card' || paymentMethod === 'netbanking') && !paymentReady)}
            >
              {loading ? 'Processing Order…' : `Confirm Order · ${formatINR(finalTotalINR)}`}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: '0.85rem' }}>
              🔒 256-Bit Encrypted · Authentic Indian Sellers · 30-Day Guarantee
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
