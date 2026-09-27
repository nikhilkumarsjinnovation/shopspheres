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
      <div>
        <div>
          <div>🎉</div>
          <h1>
            Order Confirmed & Placed!
          </h1>
          <p>
            Thank you for shopping on <strong>ShopSphere India</strong>. Your local order has been verified and sent to our neighborhood fulfillment hub.
          </p>

          <div
          >
            <div>
              <span>Order ID:</span>
              <strong>{successOrder.id}</strong>
            </div>
            <div>
              <span>Total Paid:</span>
              <strong>{formatINR(successOrder.total)}</strong>
            </div>
            <div>
              <span>Estimated Doorstep Delivery:</span>
              <strong>Tomorrow by 8:00 PM</strong>
            </div>
          </div>

          <div>
            <Link
              href="/orders"
            >
              Track Order
            </Link>
            <Link
              href="/explore"
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
      <div>
        <div>
          <h1>Secure Checkout</h1>
          <span
          >
            🇮🇳 100% Indian Marketplace
          </span>
        </div>
        <p>
          Review items, select your saved delivery address, choose Indian payment method, and confirm your order.
        </p>
      </div>

      {errorMessage && <div>{errorMessage}</div>}

      <form onSubmit={handleSubmitOrder}>
        <div>
          {/* STEP 1: DELIVERY ADDRESS SELECTION */}
          <div>
            <div>
              <h2>
                1. Select Delivery Address
              </h2>
              {savedAddresses.length > 0 && !isAddingNewAddress && (
                <button
                  type="button"
                  onClick={() => setIsAddingNewAddress(true)}
                >
                  + Add New Address
                </button>
              )}
            </div>

            {/* List of Saved Addresses */}
            {!isAddingNewAddress && savedAddresses.length > 0 ? (
              <div>
                {savedAddresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <label
                      key={addr.id}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        checked={isSelected}
                        onChange={() => setSelectedAddressId(addr.id)}
                      />
                      <div>
                        <div>
                          <strong>{addr.recipient_name}</strong>
                          <span
                          >
                            {addr.label || 'Home'}
                          </span>
                          {addr.is_default && (
                            <span
                            >
                              Default
                            </span>
                          )}
                        </div>
                        <p>
                          {addr.address_line1}
                          {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                          <br />
                          {addr.city}, {addr.state} — <strong>{addr.postal_code}</strong>
                        </p>
                        <p>
                          Phone number: <strong>+91 {addr.recipient_phone}</strong>
                        </p>
                        <div>
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
              <div>
                {savedAddresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewAddress(false)}
                  >
                    ← Back to saved addresses
                  </button>
                )}

                <div>
                  <div>
                    <label>Full Name (First and Last name) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>10-Digit Mobile Number *</label>
                    <div>
                      <span
                      >
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label>Flat, House no., Building, Company, Apartment *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Flat 402, Shanti Heights, Plot 14"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                  />
                </div>

                <div>
                  <div>
                    <label>Area, Street, Sector, Village</label>
                    <input
                      type="text"
                      placeholder="e.g. Bandra West, Linking Road"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Landmark</label>
                    <input
                      type="text"
                      placeholder="e.g. Near Lilavati Hospital"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div>
                    <label>Town / City *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mumbai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>State *</label>
                    <select
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

                  <div>
                    <label>PIN Code (6 digits) *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="e.g. 400050"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                {/* Save Address Checkbox */}
                <div
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={saveToAddressBook}
                      onChange={(e) => setSaveToAddressBook(e.target.checked)}
                    />
                    <span>Save this address to my account for future orders</span>
                  </label>

                  <div>
                    {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setAddressLabel(lbl)}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleSaveAddressExplicitly}
                    disabled={savingAddress}
                  >
                    {savingAddress ? 'Saving Address...' : '💾 Save Address to Account'}
                  </button>
                  <span>
                    Saves to your ShopSphere India address book immediately
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: INDIAN PAYMENT METHODS */}
          <div>
            <h2>2. Payment Method (India)</h2>
            <div>
              {/* UPI */}
              <label
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi"
                  checked={paymentMethod === 'upi'}
                  onChange={() => { setPaymentMethod('upi'); setPaymentReady(true); }}
                />
                <div>
                  <div>
                    <strong>UPI (Google Pay, PhonePe, Paytm, BHIM)</strong>
                    <span>
                      Fastest & Zero Fee
                    </span>
                  </div>
                  <p>
                    Instant verification via any UPI App or VPA.
                  </p>
                  {paymentMethod === 'upi' && (
                    <UpiPaymentPanel amountLabel={formatINR(finalTotalINR)} />
                  )}
                </div>
              </label>

              {false && (
              <label
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="stripe"
                  checked={paymentMethod === 'stripe'}
                  onChange={() => { setPaymentMethod('stripe'); setPaymentReady(true); }}
                />
                <div>
                  <strong>Card via Stripe (test)</strong>
                  <p>
                    Opens Stripe test checkout. Use card 4242 4242 4242 4242. No real charge.
                  </p>
                </div>
              </label>
              )}

              {/* Cash on Delivery */}
              <label
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => { setPaymentMethod('cod'); setPaymentReady(true); }}
                />
                <div>
                  <strong>Cash on Delivery / Pay on Delivery (Cash or QR)</strong>
                  <p>
                    Pay with Cash or scan delivery partner&apos;s UPI QR code upon arrival at your doorstep.
                  </p>
                </div>
              </label>

              {/* Debit / Credit Cards */}
              <label
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => { setPaymentMethod('card'); setPaymentReady(false); }}
                />
                <div>
                  <strong>Credit or Debit Card (RuPay, Visa, MasterCard)</strong>
                  <p>
                    Enter practice card details, then the OTP shown on this page.
                  </p>
                  {paymentMethod === 'card' ? (
                    <PracticePaymentPanel mode="card" amountLabel={formatINR(finalTotalINR)} onReady={setPaymentReady} />
                  ) : null}
                </div>
              </label>

              {/* Net Banking */}
              <label
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="netbanking"
                  checked={paymentMethod === 'netbanking'}
                  onChange={() => { setPaymentMethod('netbanking'); setPaymentReady(false); }}
                />
                <div>
                  <strong>Net Banking</strong>
                  <p>
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
          <div>
            <label>
              <input
                type="checkbox"
                checked={isGift}
                onChange={(e) => setIsGift(e.target.checked)}
              />
              <span>🎁 Send as a Surprise Gift for a Friend / Loved One</span>
            </label>

            {isGift && (
              <div>
                <div>
                  <div>
                    <label>Recipient Email Address</label>
                    <input
                      type="email"
                      placeholder="friend@example.com"
                      value={giftRecipientEmail}
                      onChange={(e) => setGiftRecipientEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Surprise Reveal Date</label>
                    <input
                      type="date"
                      value={giftRevealDate}
                      onChange={(e) => setGiftRevealDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label>Personal Gift Note / Greetings</label>
                  <textarea
                    rows={2}
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
          <div>
            <h2>
              Review items before payment
            </h2>
            <p>
              Change quantity or remove a product. The amount below updates before you pay.
            </p>

            <div>
              {cart.map((item) => (
                <div key={item.id}>
                  <div>
                    <div
                    >
                      {item.title}
                    </div>
                    <div>
                      <div>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <strong
                  >
                    {formatINR(item.price * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>

            {/* Behavioral Offers & Coupons Section */}
            <div
            >
              <div>
                <strong>
                  Apply behavioral coupons
                </strong>
                <span
                >
                  AI matched
                </span>
              </div>

              {offerFeedback && (
                <div
                >
                  {offerFeedback.message}
                </div>
              )}

              {appliedOffer ? (
                <div
                >
                  <div>
                    <span>
                      CODE APPLIED · {appliedOffer.code}
                    </span>
                    <div>
                      {appliedOffer.title} (−{formatINR(appliedOffer.discountAmount)})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon(couponInput)}
                    >
                      Apply
                    </button>
                  </div>

                  {offers.length > 0 && (
                    <div>
                      <span>
                        Available for your cart
                      </span>
                      {offers.slice(0, 3).map((off: any, idx: number) => (
                        <div
                          key={off.id}
                        >
                          <div>
                            <strong>{off.code}</strong>
                            <span> — {off.title}</span>
                            <div>
                              Min cart: {formatINR(off.minOrderAmount)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyCoupon(off.code)}
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

            <div>
              <span>Items Subtotal</span>
              <span>{formatINR(totalAmount)}</span>
            </div>

            {appliedOffer && (
              <div>
                <span>Coupon ({appliedOffer.code})</span>
                <span>−{formatINR(appliedOffer.discountAmount)}</span>
              </div>
            )}

            <div>
              <span>Delivery</span>
              <span>
                {deliveryFee === 0 ? 'FREE (above ₹499)' : formatINR(deliveryFee)}
              </span>
            </div>

            <div>
              <span>Eco packaging & handling</span>
              <span>{formatINR(handlingFee)}</span>
            </div>

            <div>
              <span>Total payable</span>
              <span>{formatINR(finalTotalINR)}</span>
            </div>

            <button
              type="submit"
              disabled={loading || cart.length === 0 || ((paymentMethod === 'card' || paymentMethod === 'netbanking') && !paymentReady)}
            >
              {loading ? 'Processing order…' : `Place order · ${formatINR(finalTotalINR)}`}
            </button>

            <div>
              256-bit SSL · Genuine products · 7-day returns
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
