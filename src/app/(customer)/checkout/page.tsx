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
import * as styles from '../customer.css';

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
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cod' | 'card' | 'netbanking' | 'stripe'>('upi');
  const [paymentReady, setPaymentReady] = useState(true);

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
      <div style={{ maxWidth: '640px', margin: '3rem auto', textAlign: 'center' }}>
        <div className={styles.checkoutSection} style={{ border: '1.5px solid #2457ff' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#07101f', margin: '0 0 0.5rem 0' }}>
            Order Confirmed & Placed!
          </h1>
          <p style={{ color: '#525252', margin: '0 0 1.5rem 0', fontSize: '1rem', lineHeight: 1.5 }}>
            Thank you for shopping on <strong>ShopSphere India</strong>. Your local order has been verified and sent to our neighborhood fulfillment hub.
          </p>

          <div
            style={{
              backgroundColor: '#f2f2f2',
              border: '1px solid #c5cedc',
              borderRadius: 10,
              padding: '1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'left',
              fontSize: '0.95rem',
            }}
          >
            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#737373' }}>Order ID:</span>
              <strong style={{ fontFamily: 'monospace', color: '#07101f' }}>{successOrder.id}</strong>
            </div>
            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#737373' }}>Total Paid:</span>
              <strong style={{ color: '#07101f', fontSize: '1.1rem' }}>{formatINR(successOrder.total)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#737373' }}>Estimated Doorstep Delivery:</span>
              <strong style={{ color: '#07101f' }}>Tomorrow by 8:00 PM</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link
              href="/orders"
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                backgroundColor: '#2457ff',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Track Order
            </Link>
            <Link
              href="/explore"
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                backgroundColor: '#ffffff',
                color: '#07101f',
                border: '1px solid #c5cedc',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 className={styles.heading}>Secure Checkout</h1>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#f2f2f2',
              color: '#07101f',
              padding: '2px 8px',
              borderRadius: 10,
            }}
          >
            🇮🇳 100% Indian Marketplace
          </span>
        </div>
        <p className={styles.subheading}>
          Review items, select your saved delivery address, choose Indian payment method, and confirm your order.
        </p>
      </div>

      {errorMessage && <div className={styles.alertError}>{errorMessage}</div>}

      <form onSubmit={handleSubmitOrder} className={styles.checkoutLayout}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* STEP 1: DELIVERY ADDRESS SELECTION */}
          <div className={styles.checkoutSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className={styles.sectionTitle} style={{ margin: 0, border: 'none', padding: 0 }}>
                1. Select Delivery Address
              </h2>
              {savedAddresses.length > 0 && !isAddingNewAddress && (
                <button
                  type="button"
                  onClick={() => setIsAddingNewAddress(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#07101f',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + Add New Address
                </button>
              )}
            </div>

            {/* List of Saved Addresses */}
            {!isAddingNewAddress && savedAddresses.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {savedAddresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <label
                      key={addr.id}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '14px 16px',
                        borderRadius: 12,
                        border: isSelected ? '1.5px solid #2457ff' : '1px solid #c5cedc',
                        backgroundColor: isSelected ? '#dce6ff' : '#ffffff',
                        cursor: 'pointer',
                        alignItems: 'flex-start',
                      }}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        checked={isSelected}
                        onChange={() => setSelectedAddressId(addr.id)}
                        style={{ marginTop: '4px', cursor: 'pointer', accentColor: '#2457ff' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '14px', color: '#07101f' }}>{addr.recipient_name}</strong>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#e8edf4',
                              color: '#5a6578',
                              padding: '2px 8px',
                              borderRadius: 999,
                            }}
                          >
                            {addr.label || 'Home'}
                          </span>
                          {addr.is_default && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                background: '#d6ff3a',
                                color: '#07101f',
                                padding: '2px 8px',
                                borderRadius: 999,
                              }}
                            >
                              Default
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#525252', lineHeight: 1.4 }}>
                          {addr.address_line1}
                          {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                          <br />
                          {addr.city}, {addr.state} — <strong>{addr.postal_code}</strong>
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#737373' }}>
                          Phone number: <strong>+91 {addr.recipient_phone}</strong>
                        </p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button
                            type="button"
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
                            style={{
                              height: 32,
                              padding: '0 12px',
                              borderRadius: 8,
                              border: '1.5px solid #9aabbf',
                              background: '#ffffff',
                              color: '#07101f',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              void fetchWithCsrf(`/api/v1/addresses?id=${addr.id}`, { method: 'DELETE' }).then(() => {
                                setSavedAddresses((current) => current.filter((item) => item.id !== addr.id));
                              });
                            }}
                            style={{
                              height: 32,
                              padding: '0 12px',
                              borderRadius: 8,
                              border: '1.5px solid #c41e3a',
                              background: '#ffe0e6',
                              color: '#c41e3a',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {savedAddresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewAddress(false)}
                    style={{
                      alignSelf: 'flex-start',
                      background: 'none',
                      border: 'none',
                      color: '#07101f',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      marginBottom: '8px',
                    }}
                  >
                    ← Back to saved addresses
                  </button>
                )}

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Full Name (First and Last name) *</label>
                    <input
                      type="text"
                      required
                      className={styles.input}
                      placeholder="e.g. Rahul Sharma"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>10-Digit Mobile Number *</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span
                        style={{
                          padding: '0.625rem 0.75rem',
                          backgroundColor: '#f2f2f2',
                          border: '1px solid #c5cedc',
                          borderRight: 'none',
                          borderRadius: 10,
                          fontSize: '13px',
                          color: '#525252',
                          fontWeight: 600,
                        }}
                      >
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        className={styles.input}
                        style={{ borderRadius: 10 }}
                        placeholder="9876543210"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Flat, House no., Building, Company, Apartment *</label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    placeholder="e.g. Flat 402, Shanti Heights, Plot 14"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Area, Street, Sector, Village</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. Bandra West, Linking Road"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Landmark</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. Near Lilavati Hospital"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Town / City *</label>
                    <input
                      type="text"
                      required
                      className={styles.input}
                      placeholder="e.g. Mumbai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>State *</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className={styles.input}
                      style={{ backgroundColor: '#ffffff' }}
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>PIN Code (6 digits) *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      className={styles.input}
                      placeholder="e.g. 400050"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                {/* Save Address Checkbox */}
                <div
                  style={{
                    backgroundColor: '#f2f2f2',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1px solid #c5cedc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#07101f' }}>
                    <input
                      type="checkbox"
                      checked={saveToAddressBook}
                      onChange={(e) => setSaveToAddressBook(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Save this address to my account for future orders</span>
                  </label>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setAddressLabel(lbl)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 10,
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: addressLabel === lbl ? '1.5px solid #2457ff' : '1px solid #c5cedc',
                          backgroundColor: addressLabel === lbl ? '#2457ff' : '#ffffff',
                          color: addressLabel === lbl ? '#ffffff' : '#525252',
                        }}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={handleSaveAddressExplicitly}
                    disabled={savingAddress}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      backgroundColor: '#2457ff',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {savingAddress ? 'Saving Address...' : '💾 Save Address to Account'}
                  </button>
                  <span style={{ fontSize: '12px', color: '#737373' }}>
                    Saves to your ShopSphere India address book immediately
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: INDIAN PAYMENT METHODS */}
          <div className={styles.checkoutSection}>
            <h2 className={styles.sectionTitle}>2. Payment Method (India)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* UPI */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: 10,
                  border: paymentMethod === 'upi' ? '1.5px solid #2457ff' : '1px solid #c5cedc',
                  backgroundColor: paymentMethod === 'upi' ? '#dce6ff' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi"
                  checked={paymentMethod === 'upi'}
                  onChange={() => { setPaymentMethod('upi'); setPaymentReady(true); }}
                  style={{ marginTop: '3px', accentColor: '#2457ff' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '14px', color: '#07101f' }}>UPI (Google Pay, PhonePe, Paytm, BHIM)</strong>
                    <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#d6ff3a', color: '#07101f', padding: '1px 6px', borderRadius: 10 }}>
                      Fastest & Zero Fee
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#737373' }}>
                    Instant verification via any UPI App or VPA.
                  </p>
                  {paymentMethod === 'upi' && (
                    <UpiPaymentPanel amountLabel={formatINR(finalTotalINR)} />
                  )}
                </div>
              </label>

              {false && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: 10,
                  border: paymentMethod === 'stripe' ? '1.5px solid #2457ff' : '1px solid #c5cedc',
                  backgroundColor: paymentMethod === 'stripe' ? '#eef2ff' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="stripe"
                  checked={paymentMethod === 'stripe'}
                  onChange={() => { setPaymentMethod('stripe'); setPaymentReady(true); }}
                  style={{ marginTop: '3px', accentColor: '#2457ff' }}
                />
                <div>
                  <strong style={{ fontSize: '14px', color: '#07101f' }}>Card via Stripe (test)</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#737373' }}>
                    Opens Stripe test checkout. Use card 4242 4242 4242 4242. No real charge.
                  </p>
                </div>
              </label>
              )}

              {/* Cash on Delivery */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: 10,
                  border: paymentMethod === 'cod' ? '1.5px solid #2457ff' : '1px solid #c5cedc',
                  backgroundColor: paymentMethod === 'cod' ? '#dce6ff' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => { setPaymentMethod('cod'); setPaymentReady(true); }}
                  style={{ marginTop: '3px', accentColor: '#2457ff' }}
                />
                <div>
                  <strong style={{ fontSize: '14px', color: '#07101f' }}>Cash on Delivery / Pay on Delivery (Cash or QR)</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#737373' }}>
                    Pay with Cash or scan delivery partner&apos;s UPI QR code upon arrival at your doorstep.
                  </p>
                </div>
              </label>

              {/* Debit / Credit Cards */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: 10,
                  border: paymentMethod === 'card' ? '1.5px solid #2457ff' : '1px solid #c5cedc',
                  backgroundColor: paymentMethod === 'card' ? '#dce6ff' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => { setPaymentMethod('card'); setPaymentReady(false); }}
                  style={{ marginTop: '3px', accentColor: '#2457ff' }}
                />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '14px', color: '#07101f' }}>Credit or Debit Card (RuPay, Visa, MasterCard)</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#737373' }}>
                    Enter practice card details, then the OTP shown on this page.
                  </p>
                  {paymentMethod === 'card' ? (
                    <PracticePaymentPanel mode="card" amountLabel={formatINR(finalTotalINR)} onReady={setPaymentReady} />
                  ) : null}
                </div>
              </label>

              {/* Net Banking */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: 10,
                  border: paymentMethod === 'netbanking' ? '1.5px solid #2457ff' : '1px solid #c5cedc',
                  backgroundColor: paymentMethod === 'netbanking' ? '#dce6ff' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="netbanking"
                  checked={paymentMethod === 'netbanking'}
                  onChange={() => { setPaymentMethod('netbanking'); setPaymentReady(false); }}
                  style={{ marginTop: '3px', accentColor: '#2457ff' }}
                />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '14px', color: '#07101f' }}>Net Banking</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#737373' }}>
                    Choose a bank, enter a practice user id, then the OTP shown on this page.
                  </p>
                  {paymentMethod === 'netbanking' ? (
                    <PracticePaymentPanel mode="netbanking" amountLabel={formatINR(finalTotalINR)} onReady={setPaymentReady} />
                  ) : null}
                </div>
              </label>
            </div>
          </div>

          {/* STEP 3: GIFT FOR FRIEND (OPTIONAL) */}
          <div className={styles.giftToggleContainer}>
            <label className={styles.giftCheckboxLabel}>
              <input
                type="checkbox"
                checked={isGift}
                onChange={(e) => setIsGift(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>🎁 Send as a Surprise Gift for a Friend / Loved One</span>
            </label>

            {isGift && (
              <div className={styles.giftFieldsContainer}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Recipient Email Address</label>
                    <input
                      type="email"
                      className={styles.input}
                      placeholder="friend@example.com"
                      value={giftRecipientEmail}
                      onChange={(e) => setGiftRecipientEmail(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Surprise Reveal Date</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={giftRevealDate}
                      onChange={(e) => setGiftRevealDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Personal Gift Note / Greetings</label>
                  <textarea
                    rows={2}
                    className={styles.input}
                    placeholder="Wishing you a very Happy Birthday! Enjoy the gift!"
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ORDER SUMMARY (INR) */}
        <div>
          <div className={styles.summaryCard} style={{ position: 'relative' }}>
            <h2 className={styles.sectionTitle} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 6 }}>
              Review items before payment
            </h2>
            <p style={{ fontSize: 13, color: '#5a6578', margin: '0 0 16px', paddingLeft: 10, borderLeft: '3px solid #d6ff3a' }}>
              Change quantity or remove a product. The amount below updates before you pay.
            </p>

            <div className={styles.cartItemList}>
              {cart.map((item) => (
                <div key={item.id} className={styles.cartRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: '#07101f',
                        fontSize: 13,
                        lineHeight: 1.35,
                        fontFamily: 'var(--font-display), sans-serif',
                      }}
                    >
                      {item.title}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                      <div className={styles.qtyControl}>
                        <button
                          type="button"
                          className={styles.qtyButton}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className={styles.qtyButton}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        style={{
                          height: 36,
                          padding: '0 12px',
                          borderRadius: 8,
                          border: '1.5px solid #c41e3a',
                          background: '#ffe0e6',
                          color: '#c41e3a',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <strong
                    style={{
                      fontSize: 14,
                      color: '#2457ff',
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      paddingTop: 2,
                    }}
                  >
                    {formatINR(item.price * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>

            {/* Behavioral Offers & Coupons Section */}
            <div
              style={{
                background:
                  'linear-gradient(135deg, #ffffff 0%, #dce6ff 70%, #f3ffc4 100%)',
                border: '1px solid #c5cedc',
                borderRadius: 14,
                padding: 14,
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                <strong style={{ fontSize: 14, color: '#07101f', fontFamily: 'var(--font-display), sans-serif' }}>
                  Apply behavioral coupons
                </strong>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    backgroundColor: '#d6ff3a',
                    color: '#07101f',
                    padding: '4px 8px',
                    borderRadius: 999,
                  }}
                >
                  AI matched
                </span>
              </div>

              {offerFeedback && (
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    marginBottom: 8,
                    fontSize: 12,
                    backgroundColor: offerFeedback.type === 'success' ? '#d8f5e8' : '#ffe0e6',
                    color: offerFeedback.type === 'success' ? '#0f7a4c' : '#c41e3a',
                    border: `1px solid ${offerFeedback.type === 'success' ? '#0f7a4c' : '#c41e3a'}`,
                  }}
                >
                  {offerFeedback.message}
                </div>
              )}

              {appliedOffer ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #2457ff',
                    borderRadius: 10,
                    padding: '10px 12px',
                    gap: 8,
                  }}
                >
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#2457ff', letterSpacing: '0.04em' }}>
                      CODE APPLIED · {appliedOffer.code}
                    </span>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#07101f', marginTop: 2 }}>
                      {appliedOffer.title} (−{formatINR(appliedOffer.discountAmount)})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    style={{
                      background: '#ffe0e6',
                      border: '1.5px solid #c41e3a',
                      borderRadius: 8,
                      color: '#c41e3a',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '6px 10px',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        fontSize: 12,
                        border: '1.5px solid #9aabbf',
                        borderRadius: 8,
                        textTransform: 'uppercase',
                        background: '#ffffff',
                        color: '#07101f',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon(couponInput)}
                      style={{
                        padding: '9px 14px',
                        backgroundColor: '#2457ff',
                        color: '#ffffff',
                        border: '1.5px solid #2457ff',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Apply
                    </button>
                  </div>

                  {offers.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#5a6578', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Available for your cart
                      </span>
                      {offers.slice(0, 3).map((off: any, idx: number) => (
                        <div
                          key={off.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#ffffff',
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: '1px solid #c5cedc',
                            fontSize: 12,
                            gap: 8,
                            transform: idx === 1 ? 'translateX(8px)' : undefined,
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ color: '#2457ff' }}>{off.code}</strong>
                            <span style={{ color: '#5a6578' }}> — {off.title}</span>
                            <div style={{ color: '#7a8699', fontSize: 11, marginTop: 2 }}>
                              Min cart: {formatINR(off.minOrderAmount)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyCoupon(off.code)}
                            style={{
                              padding: '6px 10px',
                              backgroundColor: '#07101f',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            Apply
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className={styles.summaryItem}>
              <span>Items Subtotal</span>
              <span style={{ color: '#07101f', fontWeight: 600 }}>{formatINR(totalAmount)}</span>
            </div>

            {appliedOffer && (
              <div className={styles.summaryItem} style={{ color: '#0f7a4c', fontWeight: 700 }}>
                <span>Coupon ({appliedOffer.code})</span>
                <span>−{formatINR(appliedOffer.discountAmount)}</span>
              </div>
            )}

            <div className={styles.summaryItem}>
              <span>Delivery</span>
              <span style={{ color: deliveryFee === 0 ? '#0f7a4c' : '#07101f', fontWeight: deliveryFee === 0 ? 700 : 600 }}>
                {deliveryFee === 0 ? 'FREE (above ₹499)' : formatINR(deliveryFee)}
              </span>
            </div>

            <div className={styles.summaryItem}>
              <span>Eco packaging & handling</span>
              <span style={{ color: '#07101f', fontWeight: 600 }}>{formatINR(handlingFee)}</span>
            </div>

            <div className={styles.summaryTotal}>
              <span>Total payable</span>
              <span style={{ color: '#2457ff' }}>{formatINR(finalTotalINR)}</span>
            </div>

            <button
              type="submit"
              disabled={loading || cart.length === 0 || ((paymentMethod === 'card' || paymentMethod === 'netbanking') && !paymentReady)}
              className={styles.buttonCheckout}
            >
              {loading ? 'Processing order…' : `Place order · ${formatINR(finalTotalINR)}`}
            </button>

            <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: 11, color: '#5a6578' }}>
              256-bit SSL · Genuine products · 7-day returns
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
