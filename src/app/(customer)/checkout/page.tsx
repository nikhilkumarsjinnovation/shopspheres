'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/lib/supabase/client';
import { formatINR, INDIAN_STATES } from '@/lib/formatters';
import { fetchWithCsrf } from '@/lib/csrf-client';
import CheckoutStepper, { CheckoutStep } from '@/components/checkout/CheckoutStepper';
import {
  validateOfferEligibility,
  getPaymentMethodName,
  PaymentMethodType,
  AppliedOfferInfo,
} from '@/lib/offer-eligibility';
import UpiPaymentPanel from '@/components/UpiPaymentPanel';
import PracticePaymentPanel from '@/components/PracticePaymentPanel';
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  CreditCard,
  Wallet,
  Smartphone,
  Building2,
  Truck,
  RefreshCw,
  Lock,
  Gift,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

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

  // Multi-Step Workflow State
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('review');

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('wallet');
  const [paymentReady, setPaymentReady] = useState(true);

  // In-App Wallet State
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);

  // COD Captcha Security State
  const [codCaptcha, setCodCaptcha] = useState('8361');
  const [codInput, setCodInput] = useState('');

  // Gift for Friend Feature State
  const [isGift, setIsGift] = useState(false);
  const [giftRecipientEmail, setGiftRecipientEmail] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [giftRevealDate, setGiftRevealDate] = useState('');

  // Behavioral Offers & Coupons State
  const [offers, setOffers] = useState<any[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedOffer, setAppliedOffer] = useState<AppliedOfferInfo | null>(null);
  const [offerFeedback, setOfferFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Offer Disqualification Alert State (for Step 2 re-check)
  const [disqualificationWarning, setDisqualificationWarning] = useState<{
    code: string;
    reason: string;
    suggestedAction?: {
      type: 'switch_method';
      targetMethod: PaymentMethodType;
      label: string;
    };
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<{ id: string; total: number; method: string } | null>(null);

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

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

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

  // Delivery calculations in INR
  const deliveryFee = totalAmount >= 499 ? 0 : 40;
  const handlingFee = 19;
  const couponDiscount = appliedOffer ? appliedOffer.discountAmount : 0;
  const finalTotalINR = Math.max(0, totalAmount - couponDiscount + deliveryFee + handlingFee);

  // Update payment readiness when method or wallet balance changes
  useEffect(() => {
    if (paymentMethod === 'wallet') {
      setPaymentReady(walletBalance !== null && walletBalance >= finalTotalINR);
    } else if (paymentMethod === 'upi') {
      setPaymentReady(true);
    } else if (paymentMethod === 'cod') {
      setPaymentReady(codInput.trim() === codCaptcha);
    }
  }, [paymentMethod, walletBalance, finalTotalINR, codInput, codCaptcha]);

  // Apply coupon code in Step 1
  const handleApplyCoupon = (codeToApply: string) => {
    setOfferFeedback(null);
    setDisqualificationWarning(null);
    const code = codeToApply.trim().toUpperCase();
    if (!code) return;

    // Search in behavioral offers or match predefined codes
    const foundOffer = offers.find((o) => o.code.toUpperCase() === code);

    let discount = 0;
    let title = '';
    let minOrder = 0;

    if (foundOffer) {
      minOrder = foundOffer.minOrderAmount || 0;
      if (totalAmount < minOrder) {
        setOfferFeedback({
          type: 'error',
          message: `Minimum order of ${formatINR(minOrder)} required for ${foundOffer.code}. (Cart total: ${formatINR(totalAmount)})`,
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
      minOrder = 499;
      if (totalAmount < 499) {
        setOfferFeedback({ type: 'error', message: 'Minimum cart value of ₹499 required for WELCOME10.' });
        return;
      }
      discount = Math.min(Math.round(totalAmount * 0.1), 250);
      title = 'Welcome 10% Discount';
    } else if (code === 'UPISAVE50') {
      minOrder = 499;
      if (totalAmount < 499) {
        setOfferFeedback({ type: 'error', message: 'Minimum cart value of ₹499 required for UPISAVE50.' });
        return;
      }
      discount = 50;
      title = 'Instant UPI Flat ₹50 Discount';
    } else if (code === 'TECH1000') {
      minOrder = 10000;
      if (totalAmount < 10000) {
        setOfferFeedback({ type: 'error', message: 'Minimum cart value of ₹10,000 required for TECH1000.' });
        return;
      }
      discount = 1000;
      title = 'TechFest ₹1,000 Instant Discount';
    } else if (code === 'UTSAV500') {
      minOrder = 1999;
      if (totalAmount < 1999) {
        setOfferFeedback({ type: 'error', message: 'Minimum cart value of ₹1,999 required for UTSAV500.' });
        return;
      }
      discount = 500;
      title = 'Festive Ethnic Wear ₹500 Discount';
    } else if (code === 'AUDIO15') {
      minOrder = 999;
      if (totalAmount < 999) {
        setOfferFeedback({ type: 'error', message: 'Minimum cart value of ₹999 required for AUDIO15.' });
        return;
      }
      discount = Math.min(Math.round(totalAmount * 0.15), 400);
      title = 'Audio Bonanza 15% Discount';
    } else if (code === 'KITCHEN300') {
      minOrder = 1500;
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
      minOrderAmount: minOrder,
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
    setDisqualificationWarning(null);
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

  // Step 1 -> Step 2: Validate address & perform Offer Re-check
  const handleProceedToPayment = () => {
    setErrorMessage(null);

    if (cart.length === 0) {
      setErrorMessage('Your cart is empty. Please add products before proceeding.');
      return;
    }

    // Validate delivery address
    if (!isAddingNewAddress && !selectedAddressId) {
      setErrorMessage('Please select a saved delivery address or enter a new address.');
      return;
    }

    if (isAddingNewAddress) {
      if (!recipientName.trim() || !recipientPhone.trim() || !addressLine1.trim() || !city.trim() || !postalCode.trim()) {
        setErrorMessage('Please complete all mandatory delivery address fields (Name, Phone, Address, City, PIN Code).');
        return;
      }
      if (recipientPhone.trim().replace(/\D/g, '').length < 10) {
        setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
        return;
      }
      if (postalCode.trim().replace(/\D/g, '').length !== 6) {
        setErrorMessage('Please enter a valid 6-digit Indian PIN code.');
        return;
      }
    }

    // MANDATORY RE-CHECK: Offer Eligibility Verification for the selected payment method
    if (appliedOffer) {
      const checkResult = validateOfferEligibility(appliedOffer, totalAmount, paymentMethod);
      if (!checkResult.valid) {
        const removedCode = appliedOffer.code;
        setAppliedOffer(null);
        setDisqualificationWarning({
          code: removedCode,
          reason: checkResult.reason || 'Not eligible with selected payment method.',
          suggestedAction: checkResult.suggestedAction,
        });
      } else {
        setDisqualificationWarning(null);
      }
    } else {
      setDisqualificationWarning(null);
    }

    // Transition to dedicated payment page
    setCurrentStep('payment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 2 -> Step 3: Advance to Final Confirmation Screen
  const handleProceedToConfirmation = () => {
    setErrorMessage(null);

    if (paymentMethod === 'wallet' && walletBalance !== null && walletBalance < finalTotalINR) {
      setErrorMessage(`Insufficient wallet balance. Please top up ${formatINR(finalTotalINR - walletBalance)} to proceed.`);
      return;
    }

    if ((paymentMethod === 'card' || paymentMethod === 'netbanking') && !paymentReady) {
      setErrorMessage('Please complete the bank verification OTP authorization before proceeding.');
      return;
    }

    if (paymentMethod === 'cod' && codInput.trim() !== codCaptcha) {
      setErrorMessage('Please enter the 4-digit confirmation code shown on screen to verify your Cash on Delivery order.');
      return;
    }

    setCurrentStep('confirmation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 3 -> Step 4: Execute Atomic Order Placement
  const handleFinalOrderSubmit = async () => {
    setLoading(true);
    setErrorMessage(null);

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
        activeShippingAddress = {
          recipient_name: recipientName.trim(),
          recipient_phone: recipientPhone.trim(),
          address_line: `${addressLine1.trim()}${addressLine2.trim() ? ', ' + addressLine2.trim() : ''}${landmark.trim() ? ' (Landmark: ' + landmark.trim() + ')' : ''}`,
          city: city.trim(),
          state: state.trim(),
          postal_code: postalCode.trim(),
          country: 'India',
        };

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

      // Final Re-check of offer eligibility immediately prior to dispatch
      const finalOfferToSubmit = appliedOffer && validateOfferEligibility(appliedOffer, totalAmount, paymentMethod).valid
        ? {
            code: appliedOffer.code,
            discountAmount: appliedOffer.discountAmount,
          }
        : null;

      const res = await fetchWithCsrf('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          shippingAddress: activeShippingAddress,
          paymentMethod,
          confirmNow: paymentMethod !== 'stripe',
          appliedOffer: finalOfferToSubmit,
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

      // If paid via In-App Wallet, update local balance & notify event bus
      if (paymentMethod === 'wallet' && walletBalance !== null) {
        const newBal = Math.max(0, walletBalance - finalTotalINR);
        setWalletBalance(newBal);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('shopsphere:wallet-update', { detail: { balance: newBal } }));
        }
      }

      clearCart();
      setSuccessOrder({
        id: data.order.id,
        total: Number(data.order.total),
        method: getPaymentMethodName(paymentMethod),
      });
      setCurrentStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during order confirmation.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get active address preview object
  const getSelectedAddressSummary = () => {
    if (!isAddingNewAddress && selectedAddressId) {
      const addr = savedAddresses.find((a) => a.id === selectedAddressId);
      if (addr) {
        return {
          name: addr.recipient_name,
          phone: addr.recipient_phone,
          address: `${addr.address_line1}${addr.address_line2 ? ', ' + addr.address_line2 : ''}, ${addr.city}, ${addr.state} - ${addr.postal_code}`,
          label: addr.label || 'Home',
        };
      }
    }
    return {
      name: recipientName || 'Guest Recipient',
      phone: recipientPhone || 'N/A',
      address: `${addressLine1}${addressLine2 ? ', ' + addressLine2 : ''}, ${city}, ${state} - ${postalCode}`,
      label: addressLabel,
    };
  };

  // =========================================================================
  // STAGE 4: PAYMENT CONFIRMATION SCREEN
  // =========================================================================
  if (currentStep === 'success' && successOrder) {
    return (
      <div className="animate-slide-up" style={{ padding: '2rem 1rem 4rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ maxWidth: '620px', width: '100%', marginBottom: '1.5rem' }}>
          <CheckoutStepper currentStep="success" />
        </div>

        <div className="checkout-card" style={{ maxWidth: '580px', width: '100%', textAlign: 'center', padding: '3.5rem 2.25rem' }}>
          <div style={{ fontSize: '3.75rem', marginBottom: '1rem', lineHeight: 1 }}>🎉</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Payment Successful & Order Placed!
          </h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2rem' }}>
            Thank you for shopping on <strong>ShopSphere India</strong>. Your payment has been authorized and your order is routed to our neighborhood fulfillment hub.
          </p>

          <div
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              marginBottom: '2rem',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--fg-muted)' }}>Order Reference:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>SS-{successOrder.id.slice(0, 8).toUpperCase()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--fg-muted)' }}>Amount Paid:</span>
              <strong style={{ color: 'var(--success)', fontSize: '1.05rem' }}>{formatINR(successOrder.total)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--fg-muted)' }}>Payment Method:</span>
              <span style={{ fontWeight: 600, color: 'var(--fg-primary)' }}>{successOrder.method}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-subtle)' }}>
              <span style={{ color: 'var(--fg-muted)' }}>Guaranteed Delivery:</span>
              <strong style={{ color: 'var(--fg-primary)' }}>Tomorrow by 8:00 PM</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/orders" className="btn-card-add" style={{ padding: '0.75rem 1.75rem', fontSize: '0.92rem' }}>
              📦 Track Your Order
            </Link>
            <Link href="/explore" className="btn-card-toggle" style={{ padding: '0.75rem 1.75rem', fontSize: '0.92rem' }}>
              🛍️ Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '4rem' }}>
      {/* 4-Step Progress Navigation Stepper */}
      <CheckoutStepper
        currentStep={currentStep}
        onStepClick={(step) => {
          setErrorMessage(null);
          setCurrentStep(step);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {errorMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* =========================================================================
          STAGE 1: ORDER REVIEW & PAYMENT METHOD SELECTION
          ========================================================================= */}
      {currentStep === 'review' && (
        <div>
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em' }}>1. Bag, Address & Payment Method</h1>
              <span className="section-badge">🇮🇳 100% Indian Marketplace</span>
            </div>
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.92rem' }}>
              Review your delivery location, apply promotional coupons, select your preferred payment mode, and proceed.
            </p>
          </div>

          <div className="checkout-layout">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* 1.1 DELIVERY ADDRESS SELECTION */}
              <div className="checkout-card">
                <div className="checkout-card-header">
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span>📍</span> Delivery Address
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

                {!isAddingNewAddress && savedAddresses.length > 0 ? (
                  <div className="saved-addresses-grid">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <label key={addr.id} className={`saved-address-card ${isSelected ? 'selected' : ''}`}>
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
                              <span className="address-tag-pill">{addr.label || 'Home'}</span>
                              {addr.is_default && <span className="address-tag-pill default">Default</span>}
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
                                  setAddressLabel(addr.label === 'Work' || addr.label === 'Other' ? addr.label : 'Home');
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
                        <label className="auth-label">Full Name *</label>
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
                      <label className="auth-label">Flat, House no., Building, Apartment *</label>
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
                        <label className="auth-label">Area, Street, Sector</label>
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
                        <label className="auth-label">City *</label>
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
                        <label className="auth-label">PIN Code *</label>
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
                        <span>Save this address for future purchases</span>
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
                    </div>
                  </div>
                )}
              </div>

              {/* 1.2 SELECT PAYMENT METHOD (COMPACT, LIGHTWEIGHT - NO HEAVY FORMS) */}
              <div className="checkout-card">
                <div className="checkout-card-header">
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span>💳</span> Select Payment Type
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
                      Choose your preferred method. You will proceed to its dedicated verification screen next.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* ShopSphere Wallet Card */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '1.1rem 1.25rem',
                      borderRadius: 'var(--radius-lg)',
                      border: `2px solid ${paymentMethod === 'wallet' ? 'var(--accent-electric)' : 'var(--border-subtle)'}`,
                      background: paymentMethod === 'wallet' ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.05), var(--bg-surface))' : 'var(--bg-canvas)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethodSelector"
                      value="wallet"
                      checked={paymentMethod === 'wallet'}
                      onChange={() => setPaymentMethod('wallet')}
                      style={{ accentColor: 'var(--accent-electric)', width: '18px', height: '18px' }}
                    />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <Wallet size={18} style={{ color: 'var(--accent-electric)' }} />
                          <strong style={{ fontSize: '0.95rem' }}>ShopSphere In-App Digital Wallet</strong>
                          <span className="section-badge" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>Fast 1-Tap</span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
                          Zero gateway fee · Instant debit · 100% automated refund on cancellation
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: walletBalance !== null && walletBalance >= finalTotalINR ? 'var(--success-bg)' : 'var(--warning-bg)',
                            color: walletBalance !== null && walletBalance >= finalTotalINR ? 'var(--success)' : 'var(--warning)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {loadingWallet ? 'Checking…' : `Available: ${formatINR(walletBalance ?? 0)}`}
                        </span>
                      </div>
                    </div>
                  </label>

                  {/* Instant UPI Card */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '1.1rem 1.25rem',
                      borderRadius: 'var(--radius-lg)',
                      border: `2px solid ${paymentMethod === 'upi' ? 'var(--fg-primary)' : 'var(--border-subtle)'}`,
                      background: paymentMethod === 'upi' ? 'var(--bg-surface)' : 'var(--bg-canvas)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethodSelector"
                      value="upi"
                      checked={paymentMethod === 'upi'}
                      onChange={() => setPaymentMethod('upi')}
                      style={{ accentColor: 'var(--fg-primary)', width: '18px', height: '18px' }}
                    />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <Smartphone size={18} />
                          <strong style={{ fontSize: '0.95rem' }}>Instant UPI (Google Pay, PhonePe, Paytm, BHIM)</strong>
                          <span className="section-badge" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>Recommended</span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
                          Zero processing fee · Instant dynamic QR scan or direct UPI ID authorization
                        </p>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>Eligible for UPISAVE50</span>
                    </div>
                  </label>

                  {/* Credit / Debit Card */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '1.1rem 1.25rem',
                      borderRadius: 'var(--radius-lg)',
                      border: `2px solid ${paymentMethod === 'card' ? 'var(--fg-primary)' : 'var(--border-subtle)'}`,
                      background: paymentMethod === 'card' ? 'var(--bg-surface)' : 'var(--bg-canvas)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethodSelector"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      style={{ accentColor: 'var(--fg-primary)', width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <CreditCard size={18} />
                        <strong style={{ fontSize: '0.95rem' }}>Credit or Debit Card (RuPay, Visa, MasterCard)</strong>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
                        All Indian bank cards supported with 3D Secure bank OTP authorization
                      </p>
                    </div>
                  </label>

                  {/* Net Banking */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '1.1rem 1.25rem',
                      borderRadius: 'var(--radius-lg)',
                      border: `2px solid ${paymentMethod === 'netbanking' ? 'var(--fg-primary)' : 'var(--border-subtle)'}`,
                      background: paymentMethod === 'netbanking' ? 'var(--bg-surface)' : 'var(--bg-canvas)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethodSelector"
                      value="netbanking"
                      checked={paymentMethod === 'netbanking'}
                      onChange={() => setPaymentMethod('netbanking')}
                      style={{ accentColor: 'var(--fg-primary)', width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Building2 size={18} />
                        <strong style={{ fontSize: '0.95rem' }}>Net Banking (All Indian Scheduled Banks)</strong>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
                        SBI, HDFC, ICICI, Axis, Kotak, PNB, and 40+ scheduled banks
                      </p>
                    </div>
                  </label>

                  {/* Cash on Delivery */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '1.1rem 1.25rem',
                      borderRadius: 'var(--radius-lg)',
                      border: `2px solid ${paymentMethod === 'cod' ? 'var(--fg-primary)' : 'var(--border-subtle)'}`,
                      background: paymentMethod === 'cod' ? 'var(--bg-surface)' : 'var(--bg-canvas)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethodSelector"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      style={{ accentColor: 'var(--fg-primary)', width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Truck size={18} />
                        <strong style={{ fontSize: '0.95rem' }}>Pay on Delivery / Cash on Delivery</strong>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
                        Pay cash or scan courier partner&apos;s UPI QR code upon doorstep delivery
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 1.3 GIFT FOR FRIEND OPTION */}
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

            {/* RIGHT SIDEBAR: ORDER SUMMARY & OFFERS */}
            <div>
              <div className="order-summary-panel">
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.35rem' }}>Order Summary</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginBottom: '1.25rem' }}>
                  {cart.length} unique {cart.length === 1 ? 'item' : 'items'} in your bag
                </p>

                {/* Cart Items Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem', maxHeight: '240px', overflowY: 'auto' }}>
                  {cart.map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ flex: 1, paddingRight: '0.75rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg-primary)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {item.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                          <div className="qty-stepper">
                            <button type="button" className="qty-stepper-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                              −
                            </button>
                            <span className="qty-stepper-val">{item.quantity}</span>
                            <button type="button" className="qty-stepper-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
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
                    <strong style={{ fontSize: '0.825rem' }}>Discount Coupons & Offers</strong>
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

                  {/* Quick-apply chips for popular offers */}
                  {!appliedOffer && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.65rem' }}>
                      {['WELCOME10', 'UPISAVE50', 'TECH1000'].map((code) => (
                        <button
                          key={code}
                          type="button"
                          className="variant-option-chip"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                          onClick={() => handleApplyCoupon(code)}
                        >
                          +{code}
                        </button>
                      ))}
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

                {/* Primary Proceed CTA Button */}
                <button
                  type="button"
                  className="btn-place-order"
                  onClick={handleProceedToPayment}
                  disabled={cart.length === 0}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <span>Proceed to Payment · {formatINR(finalTotalINR)}</span>
                  <ArrowRight size={18} />
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: '0.85rem' }}>
                  🔒 256-Bit Encrypted · Dedicated Verification Screen Next
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STAGE 2: DEDICATED PAYMENT GATEWAY & METHOD SCREEN
          (RE-CHECKS OFFER ELIGIBILITY & RENDERS ONLY CHOSEN METHOD'S WIDGET)
          ========================================================================= */}
      {currentStep === 'payment' && (
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          {/* Header & Change Link */}
          <div className="gateway-header-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn-card-toggle"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                onClick={() => {
                  setCurrentStep('review');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <ArrowLeft size={14} /> Back to Bag & Address
              </button>
              <div>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                  2. {getPaymentMethodName(paymentMethod)} Gateway
                </h1>
                <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
                  Dedicated checkout verification
                </span>
              </div>
            </div>
            <button
              type="button"
              className="btn-link-action"
              onClick={() => {
                setCurrentStep('review');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Change Payment Mode
            </button>
          </div>

          {/* Prominent Amount to Pay Banner */}
          <div className="gateway-amount-display">
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Amount Payable
              </span>
              <div className="gateway-amount-value">{formatINR(finalTotalINR)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success)', fontSize: '0.825rem', fontWeight: 600 }}>
                <ShieldCheck size={16} /> 100% Secure Transaction
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', margin: '0.2rem 0 0' }}>
                Delivering to: <strong>{getSelectedAddressSummary().name}</strong> ({getSelectedAddressSummary().phone})
              </p>
            </div>
          </div>

          {/* CRITICAL USER REQUIREMENT: OFFER ELIGIBILITY WARNING BANNER */}
          {disqualificationWarning && (
            <div className="offer-warning-banner">
              <div className="offer-warning-icon">⚠️</div>
              <div className="offer-warning-content">
                <div className="offer-warning-title">
                  Offer Disqualified & Removed: Coupon &ldquo;{disqualificationWarning.code}&rdquo;
                </div>
                <div className="offer-warning-desc">
                  {disqualificationWarning.reason} The discount has been removed and your total payable amount is now{' '}
                  <strong>{formatINR(finalTotalINR)}</strong>.
                </div>
                {disqualificationWarning.suggestedAction && (
                  <button
                    type="button"
                    className="offer-warning-chip"
                    onClick={() => {
                      if (disqualificationWarning.suggestedAction) {
                        setPaymentMethod(disqualificationWarning.suggestedAction.targetMethod);
                        setDisqualificationWarning(null);
                        // Re-apply coupon
                        handleApplyCoupon(disqualificationWarning.code);
                      }
                    }}
                  >
                    <span>⚡</span>
                    <span>{disqualificationWarning.suggestedAction.label}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* VERIFIED ACTIVE OFFER BADGE */}
          {appliedOffer && !disqualificationWarning && (
            <div className="offer-verified-banner">
              <Sparkles size={16} />
              <span>
                Offer Verified: Coupon <strong>{appliedOffer.code}</strong> is active with {getPaymentMethodName(paymentMethod)}! You saved{' '}
                <strong>{formatINR(appliedOffer.discountAmount)}</strong>.
              </span>
            </div>
          )}

          {/* DEDICATED WIDGET: IN-APP DIGITAL WALLET */}
          {paymentMethod === 'wallet' && (
            <div className="checkout-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Wallet size={22} style={{ color: 'var(--accent-electric)' }} />
                  <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>ShopSphere In-App Wallet</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                      Instant one-tap debit with atomic ledger lock
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>Available Balance:</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--fg-primary)' }}>
                    {loadingWallet ? 'Checking…' : formatINR(walletBalance ?? 0)}
                  </div>
                </div>
              </div>

              {walletBalance !== null && walletBalance < finalTotalINR ? (
                <div style={{ background: 'var(--bg-canvas)', border: '1.5px dashed var(--warning-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--warning)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <AlertTriangle size={18} />
                    <span>
                      Shortfall of {formatINR(finalTotalINR - walletBalance)}. Top up wallet now to continue.
                    </span>
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--fg-secondary)', marginBottom: '1rem' }}>
                    Your wallet balance is less than the order total. Tap an amount below to instantly top up your wallet:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                    <button
                      type="button"
                      className="btn-card-add"
                      disabled={toppingUp}
                      onClick={() => handleQuickTopup(Math.ceil((finalTotalINR - (walletBalance ?? 0)) / 100) * 100)}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.825rem' }}
                    >
                      {toppingUp ? 'Adding Funds…' : `+ Add ${formatINR(Math.ceil((finalTotalINR - (walletBalance ?? 0)) / 100) * 100)} (Exact Shortfall)`}
                    </button>
                    {[500, 1000, 2000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className="variant-option-chip"
                        disabled={toppingUp}
                        onClick={() => handleQuickTopup(amt)}
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                      >
                        +₹{amt.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--bg-canvas)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--success)', fontWeight: 700, fontSize: '0.9rem' }}>
                    <CheckCircle2 size={18} />
                    <span>Wallet balance is sufficient! Instant 1-tap payment ready.</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: '0.35rem' }}>
                    Remaining balance after order:{' '}
                    <strong>{formatINR(Math.max(0, (walletBalance ?? 0) - finalTotalINR))}</strong>
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                  🔒 Fully refundable on cancellation through packed stage
                </span>
                <button
                  type="button"
                  className="btn-card-add"
                  disabled={walletBalance === null || walletBalance < finalTotalINR}
                  onClick={handleProceedToConfirmation}
                  style={{ padding: '0.65rem 1.5rem', fontSize: '0.88rem' }}
                >
                  Review & Confirm Payment ({formatINR(finalTotalINR)}) →
                </button>
              </div>
            </div>
          )}

          {/* DEDICATED WIDGET: INSTANT UPI */}
          {paymentMethod === 'upi' && (
            <div className="checkout-card">
              <UpiPaymentPanel amountLabel={formatINR(finalTotalINR)} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  className="btn-card-add"
                  onClick={handleProceedToConfirmation}
                  style={{ padding: '0.65rem 1.75rem', fontSize: '0.88rem' }}
                >
                  Review & Confirm UPI Payment →
                </button>
              </div>
            </div>
          )}

          {/* DEDICATED WIDGET: DEBIT / CREDIT CARD */}
          {paymentMethod === 'card' && (
            <div className="checkout-card">
              <PracticePaymentPanel
                mode="card"
                amountLabel={formatINR(finalTotalINR)}
                onReady={setPaymentReady}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                  {!paymentReady ? '⚠️ Complete OTP step above to continue' : '✅ Card OTP verified'}
                </span>
                <button
                  type="button"
                  className="btn-card-add"
                  disabled={!paymentReady}
                  onClick={handleProceedToConfirmation}
                  style={{ padding: '0.65rem 1.75rem', fontSize: '0.88rem' }}
                >
                  Review & Confirm Card Payment →
                </button>
              </div>
            </div>
          )}

          {/* DEDICATED WIDGET: NET BANKING */}
          {paymentMethod === 'netbanking' && (
            <div className="checkout-card">
              <PracticePaymentPanel
                mode="netbanking"
                amountLabel={formatINR(finalTotalINR)}
                onReady={setPaymentReady}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                  {!paymentReady ? '⚠️ Complete bank verification OTP above to continue' : '✅ Bank OTP verified'}
                </span>
                <button
                  type="button"
                  className="btn-card-add"
                  disabled={!paymentReady}
                  onClick={handleProceedToConfirmation}
                  style={{ padding: '0.65rem 1.75rem', fontSize: '0.88rem' }}
                >
                  Review & Confirm Bank Payment →
                </button>
              </div>
            </div>
          )}

          {/* DEDICATED WIDGET: CASH ON DELIVERY */}
          {paymentMethod === 'cod' && (
            <div className="checkout-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
                <Truck size={22} style={{ color: 'var(--fg-primary)' }} />
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Cash on Delivery (Doorstep Payment)</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                    Pay via cash or UPI QR scanner upon delivery at your doorstep
                  </p>
                </div>
              </div>

              <div style={{ background: 'var(--bg-canvas)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  To prevent fraudulent automated bookings, please type the 4-digit verification code below to authorize your doorstep delivery:
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--bg-surface)',
                      border: '2px dashed var(--border-strong)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      letterSpacing: '0.25em',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {codCaptcha}
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    className="auth-input"
                    placeholder="Enter code"
                    style={{ width: '130px', height: '2.8rem', textAlign: 'center', fontWeight: 700, letterSpacing: '0.15em' }}
                    value={codInput}
                    onChange={(e) => setCodInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                  <button
                    type="button"
                    className="btn-card-toggle"
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => {
                      const next = String(Math.floor(1000 + Math.random() * 9000));
                      setCodCaptcha(next);
                      setCodInput('');
                    }}
                  >
                    <RefreshCw size={13} /> Refresh
                  </button>
                  <button
                    type="button"
                    className="btn-card-toggle"
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => setCodInput(codCaptcha)}
                  >
                    Auto-Fill
                  </button>
                </div>

                {codInput.trim() === codCaptcha && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.75rem', color: 'var(--success)', fontWeight: 600, fontSize: '0.825rem' }}>
                    <Check size={16} /> Code verified! Click below to review your order.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  className="btn-card-add"
                  disabled={codInput.trim() !== codCaptcha}
                  onClick={handleProceedToConfirmation}
                  style={{ padding: '0.65rem 1.75rem', fontSize: '0.88rem' }}
                >
                  Review & Confirm Doorstep Order →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          STAGE 3: FINAL CONFIRMATION OF PAYMENT WITH TOTAL AMOUNT & BREAKDOWN
          ========================================================================= */}
      {currentStep === 'confirmation' && (
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em' }}>3. Final Confirmation & Authorization</h1>
              <span className="section-badge">Step 3 of 3</span>
            </div>
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.92rem' }}>
              Please review your delivery location, payment authorization, and full price breakdown before final dispatch.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 3.1 DELIVERY ADDRESS SUMMARY CARD */}
            <div className="confirmation-section-card">
              <div className="confirmation-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span>📍</span>
                  <strong style={{ fontSize: '0.95rem' }}>Delivery Destination</strong>
                </div>
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={() => {
                    setCurrentStep('review');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Edit Address
                </button>
              </div>
              <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, color: 'var(--fg-primary)', marginBottom: '0.2rem' }}>
                  {getSelectedAddressSummary().name}{' '}
                  <span className="address-tag-pill" style={{ marginLeft: '0.35rem' }}>
                    {getSelectedAddressSummary().label}
                  </span>
                </div>
                <div style={{ color: 'var(--fg-secondary)' }}>{getSelectedAddressSummary().address}</div>
                <div style={{ color: 'var(--fg-muted)', fontSize: '0.825rem', marginTop: '0.25rem' }}>
                  Contact Phone: <strong>+91 {getSelectedAddressSummary().phone}</strong> · Estimated Delivery:{' '}
                  <strong style={{ color: 'var(--fg-primary)' }}>Tomorrow by 8:00 PM</strong>
                </div>
              </div>
            </div>

            {/* 3.2 PAYMENT AUTHORIZATION SUMMARY CARD */}
            <div className="confirmation-section-card">
              <div className="confirmation-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span>🔒</span>
                  <strong style={{ fontSize: '0.95rem' }}>Payment Authorization Method</strong>
                </div>
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={() => {
                    setCurrentStep('payment');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Change Payment
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {paymentMethod === 'wallet' && <Wallet size={20} style={{ color: 'var(--accent-electric)' }} />}
                    {paymentMethod === 'upi' && <Smartphone size={20} />}
                    {paymentMethod === 'card' && <CreditCard size={20} />}
                    {paymentMethod === 'netbanking' && <Building2 size={20} />}
                    {paymentMethod === 'cod' && <Truck size={20} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                      {getPaymentMethodName(paymentMethod)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                      {paymentMethod === 'wallet' && `Debiting ${formatINR(finalTotalINR)} from in-app wallet balance.`}
                      {paymentMethod === 'upi' && 'Instant dynamic UPI QR / VPA Authorization.'}
                      {paymentMethod === 'card' && 'Practice Card 3DS OTP Verified.'}
                      {paymentMethod === 'netbanking' && 'Practice Net Banking OTP Verified.'}
                      {paymentMethod === 'cod' && 'Doorstep Cash / QR settlement verified with code.'}
                    </div>
                  </div>
                </div>

                <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={16} /> Ready to Authorize
                </span>
              </div>
            </div>

            {/* 3.3 ORDER ITEMS PREVIEW */}
            <div className="confirmation-section-card">
              <div className="confirmation-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span>🛍️</span>
                  <strong style={{ fontSize: '0.95rem' }}>Items in Your Order ({cart.length})</strong>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>Local Express Dispatch</span>
              </div>

              <div>
                {cart.map((item) => (
                  <div key={item.id} className="confirmation-item-row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--fg-primary)' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: '0.15rem' }}>
                        Qty: <strong>{item.quantity}</strong> × {formatINR(item.price)}
                      </div>
                    </div>
                    <strong style={{ fontSize: '0.95rem' }}>
                      {formatINR(item.price * item.quantity)}
                    </strong>
                  </div>
                ))}
              </div>

              {isGift && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.825rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--fg-primary)' }}>🎁 Surprise Gift Packaging:</span>
                  <div style={{ color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
                    Recipient: {giftRecipientEmail || 'Friend'} · Reveal Date: {giftRevealDate || 'On Delivery'}
                    {giftMessage && <div>Note: &ldquo;{giftMessage}&rdquo;</div>}
                  </div>
                </div>
              )}
            </div>

            {/* 3.4 FULL ITEMIZED FINANCIAL BREAKDOWN */}
            <div className="confirmation-section-card" style={{ background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-canvas))' }}>
              <div className="confirmation-section-header">
                <strong style={{ fontSize: '1rem', fontWeight: 800 }}>Payment Breakdown</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>INR Currency (₹)</span>
              </div>

              <div className="confirmation-breakdown-row">
                <span>Items Subtotal</span>
                <span>{formatINR(totalAmount)}</span>
              </div>

              {appliedOffer && (
                <div className="confirmation-breakdown-row" style={{ color: 'var(--success)', fontWeight: 600 }}>
                  <span>Promotional Discount ({appliedOffer.code})</span>
                  <span>−{formatINR(appliedOffer.discountAmount)}</span>
                </div>
              )}

              <div className="confirmation-breakdown-row">
                <span>Standard Delivery Fee</span>
                <span>{deliveryFee === 0 ? 'FREE' : formatINR(deliveryFee)}</span>
              </div>

              <div className="confirmation-breakdown-row">
                <span>Eco-Friendly Packaging & Handling</span>
                <span>{formatINR(handlingFee)}</span>
              </div>

              <div className="confirmation-breakdown-row total">
                <span>Total Amount to Pay</span>
                <span style={{ color: 'var(--accent-electric)' }}>{formatINR(finalTotalINR)}</span>
              </div>

              {/* Guarantees & Final Submit Button */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
                    <Lock size={15} style={{ color: 'var(--success)' }} />
                    <span>256-Bit SSL Encrypted · Instant Refund Guarantee</span>
                  </div>
                  <button
                    type="button"
                    className="btn-card-toggle"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                    onClick={() => {
                      setCurrentStep('payment');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    ← Back to Payment
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-place-order"
                  disabled={loading}
                  onClick={handleFinalOrderSubmit}
                  style={{
                    height: '3.6rem',
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    letterSpacing: '-0.01em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.65rem',
                  }}
                >
                  {loading ? (
                    <span>Processing Order…</span>
                  ) : (
                    <>
                      <span>
                        {paymentMethod === 'cod' ? '📦 Confirm Cash on Delivery Order' : `🚀 Authorize & Pay ${formatINR(finalTotalINR)}`}
                      </span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
