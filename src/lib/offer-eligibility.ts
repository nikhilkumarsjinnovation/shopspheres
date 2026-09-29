import { formatINR } from '@/lib/formatters';

export type PaymentMethodType = 'wallet' | 'upi' | 'card' | 'netbanking' | 'cod' | 'stripe';

export interface AppliedOfferInfo {
  code: string;
  title: string;
  discountAmount: number;
  minOrderAmount?: number;
  allowedMethods?: PaymentMethodType[];
  excludedMethods?: PaymentMethodType[];
}

export interface OfferEligibilityResult {
  valid: boolean;
  reason?: string;
  suggestedAction?: {
    type: 'switch_method';
    targetMethod: PaymentMethodType;
    label: string;
  };
}

export function getPaymentMethodName(method: PaymentMethodType): string {
  switch (method) {
    case 'wallet':
      return 'ShopSphere In-App Wallet';
    case 'upi':
      return 'Instant UPI (GPay, PhonePe, Paytm)';
    case 'card':
      return 'Credit / Debit Card';
    case 'netbanking':
      return 'Net Banking';
    case 'cod':
      return 'Cash on Delivery (COD)';
    case 'stripe':
      return 'International Card (Stripe)';
    default:
      return method;
  }
}

/**
 * Re-validates offer eligibility when transitioning to the payment gateway
 * or changing the payment method.
 */
export function validateOfferEligibility(
  offer: AppliedOfferInfo | null,
  cartTotal: number,
  selectedMethod: PaymentMethodType
): OfferEligibilityResult {
  if (!offer) return { valid: true };

  const code = offer.code.trim().toUpperCase();

  // 1. Min order amount check
  let minAmount = offer.minOrderAmount || 0;
  if (code === 'WELCOME10') minAmount = Math.max(minAmount, 499);
  if (code === 'UPISAVE50') minAmount = Math.max(minAmount, 499);
  if (code === 'TECH1000') minAmount = Math.max(minAmount, 10000);
  if (code === 'UTSAV500') minAmount = Math.max(minAmount, 1999);
  if (code === 'AUDIO15') minAmount = Math.max(minAmount, 999);
  if (code === 'KITCHEN300') minAmount = Math.max(minAmount, 1500);

  if (cartTotal < minAmount) {
    return {
      valid: false,
      reason: `Requires minimum cart order of ${formatINR(minAmount)}. Current items subtotal is ${formatINR(cartTotal)}.`,
    };
  }

  // 2. UPI-exclusive discount check
  if (code === 'UPISAVE50' && selectedMethod !== 'upi') {
    return {
      valid: false,
      reason: `Coupon "UPISAVE50" is exclusively reserved for Instant UPI payments and cannot be used with ${getPaymentMethodName(selectedMethod)}.`,
      suggestedAction: {
        type: 'switch_method',
        targetMethod: 'upi',
        label: 'Switch to UPI to keep ₹50 discount',
      },
    };
  }

  // 3. Cash on Delivery (COD) restriction for high-value promo codes
  if (selectedMethod === 'cod') {
    if (code === 'TECH1000' || code === 'UTSAV500') {
      return {
        valid: false,
        reason: `Promotional coupon "${code}" requires prepaid online settlement and cannot be combined with Cash on Delivery.`,
        suggestedAction: {
          type: 'switch_method',
          targetMethod: 'wallet',
          label: 'Switch to In-App Wallet / Prepaid to keep discount',
        },
      };
    }
  }

  // 4. Dynamic behavioral offers allowed/excluded methods
  if (offer.allowedMethods && offer.allowedMethods.length > 0 && !offer.allowedMethods.includes(selectedMethod)) {
    const allowedNames = offer.allowedMethods.map(getPaymentMethodName).join(', ');
    return {
      valid: false,
      reason: `Coupon "${code}" is valid only for: ${allowedNames}.`,
      suggestedAction: {
        type: 'switch_method',
        targetMethod: offer.allowedMethods[0],
        label: `Switch to ${getPaymentMethodName(offer.allowedMethods[0])}`,
      },
    };
  }

  if (offer.excludedMethods && offer.excludedMethods.includes(selectedMethod)) {
    return {
      valid: false,
      reason: `Coupon "${code}" cannot be used with ${getPaymentMethodName(selectedMethod)}.`,
    };
  }

  return { valid: true };
}

export interface WalletAvailableOffer {
  code: string;
  title: string;
  description: string;
  discountAmount: number;
  minOrderAmount: number;
}

/**
 * Returns non-card, non-UPI offers eligible for In-App Wallet payments.
 * Excludes UPI-exclusive (UPISAVE50) and card-exclusive promotions.
 * Agent will NOT auto-apply these offers, but present them as options to the customer.
 */
export function getWalletEligibleOffers(
  subtotal: number,
  category?: string | null,
  isGift?: boolean
): WalletAvailableOffer[] {
  const eligible: WalletAvailableOffer[] = [];
  const cat = (category || '').toLowerCase();

  // 1. WELCOME10 (General 10% off up to ₹250 on min ₹499)
  if (subtotal >= 499) {
    const discount = Math.min(Math.round(subtotal * 0.1), 250);
    eligible.push({
      code: 'WELCOME10',
      title: '🎉 WELCOME10 (10% OFF)',
      description: `Save ${formatINR(discount)} (10% off up to ₹250 on orders ≥ ₹499)`,
      discountAmount: discount,
      minOrderAmount: 499,
    });
  }

  // 2. GIFT300 (₹300 off on gifting parcels min ₹1,499)
  if (isGift && subtotal >= 1499) {
    eligible.push({
      code: 'GIFT300',
      title: '🎁 GIFT300 (Flat ₹300 OFF)',
      description: 'Special ₹300 off on surprise gift orders ≥ ₹1,499',
      discountAmount: 300,
      minOrderAmount: 1499,
    });
  }

  // 3. TECH1000 (Flat ₹1,000 off on Electronics ≥ ₹10,000)
  if (subtotal >= 10000 && (!cat || cat.includes('electr') || cat.includes('tech') || cat.includes('gadget') || cat.includes('phone'))) {
    eligible.push({
      code: 'TECH1000',
      title: '⚡ TECH1000 (Flat ₹1,000 OFF)',
      description: 'Flat ₹1,000 instant discount on electronics ≥ ₹10,000',
      discountAmount: 1000,
      minOrderAmount: 10000,
    });
  }

  // 4. UTSAV500 (Flat ₹500 off on Fashion / Festive ≥ ₹1,999)
  if (subtotal >= 1999 && (!cat || cat.includes('fash') || cat.includes('cloth') || cat.includes('festiv') || cat.includes('ethnic'))) {
    eligible.push({
      code: 'UTSAV500',
      title: '🪔 UTSAV500 (Flat ₹500 OFF)',
      description: 'Flat ₹500 off on apparel and festive collections ≥ ₹1,999',
      discountAmount: 500,
      minOrderAmount: 1999,
    });
  }

  // 5. AUDIO15 (15% off up to ₹400 on audio/accessories ≥ ₹999)
  if (subtotal >= 999 && (!cat || cat.includes('audio') || cat.includes('electr') || cat.includes('headphone') || cat.includes('earbud') || cat.includes('watch'))) {
    const discount = Math.min(Math.round(subtotal * 0.15), 400);
    eligible.push({
      code: 'AUDIO15',
      title: '🎧 AUDIO15 (15% OFF)',
      description: `Save ${formatINR(discount)} on audio & gadgets ≥ ₹999`,
      discountAmount: discount,
      minOrderAmount: 999,
    });
  }

  // 6. KITCHEN300 (Flat ₹300 off on Home & Kitchen ≥ ₹1,500)
  if (subtotal >= 1500 && (!cat || cat.includes('home') || cat.includes('kitchen') || cat.includes('cook'))) {
    eligible.push({
      code: 'KITCHEN300',
      title: '🍳 KITCHEN300 (Flat ₹300 OFF)',
      description: 'Flat ₹300 off on home & kitchen gear ≥ ₹1,500',
      discountAmount: 300,
      minOrderAmount: 1500,
    });
  }

  return eligible;
}

/**
 * Calculates discount for a specific coupon when paying via In-App Wallet.
 * Rejects card-specific or UPI-specific coupons (e.g. UPISAVE50).
 */
export function calculateWalletCouponDiscount(
  rawCode: string,
  subtotal: number,
  isGift?: boolean,
  category?: string | null
): { valid: boolean; discountAmount: number; title: string; reason?: string } {
  const code = (rawCode || '').trim().toUpperCase();

  if (!code) {
    return { valid: false, discountAmount: 0, title: '', reason: 'No coupon code provided.' };
  }

  // Strictly reject UPI or Card exclusive codes for wallet checkout
  if (code === 'UPISAVE50') {
    return {
      valid: false,
      discountAmount: 0,
      title: '',
      reason: 'Coupon "UPISAVE50" is exclusively for Instant UPI gateway payments and cannot be used with In-App Wallet payments.',
    };
  }

  if (code === 'WELCOME10') {
    if (subtotal < 499) {
      return { valid: false, discountAmount: 0, title: '', reason: `Minimum order of ₹499 required for WELCOME10 (Current subtotal: ${formatINR(subtotal)}).` };
    }
    const discount = Math.min(Math.round(subtotal * 0.1), 250);
    return { valid: true, discountAmount: discount, title: 'Welcome 10% Discount' };
  }

  if (code === 'GIFT300') {
    if (!isGift && subtotal < 1499) {
      return { valid: false, discountAmount: 0, title: '', reason: 'GIFT300 requires a gift order with minimum subtotal of ₹1,499.' };
    }
    if (subtotal < 1499) {
      return { valid: false, discountAmount: 0, title: '', reason: `Minimum gift order of ₹1,499 required for GIFT300 (Current subtotal: ${formatINR(subtotal)}).` };
    }
    return { valid: true, discountAmount: 300, title: 'Gift Special ₹300 Discount' };
  }

  if (code === 'TECH1000') {
    if (subtotal < 10000) {
      return { valid: false, discountAmount: 0, title: '', reason: `Minimum order of ₹10,000 required for TECH1000 (Current subtotal: ${formatINR(subtotal)}).` };
    }
    return { valid: true, discountAmount: 1000, title: 'TechFest ₹1,000 Instant Discount' };
  }

  if (code === 'UTSAV500') {
    if (subtotal < 1999) {
      return { valid: false, discountAmount: 0, title: '', reason: `Minimum order of ₹1,999 required for UTSAV500 (Current subtotal: ${formatINR(subtotal)}).` };
    }
    return { valid: true, discountAmount: 500, title: 'Festive Ethnic ₹500 Discount' };
  }

  if (code === 'AUDIO15') {
    if (subtotal < 999) {
      return { valid: false, discountAmount: 0, title: '', reason: `Minimum order of ₹999 required for AUDIO15 (Current subtotal: ${formatINR(subtotal)}).` };
    }
    const discount = Math.min(Math.round(subtotal * 0.15), 400);
    return { valid: true, discountAmount: discount, title: 'Audio 15% Discount' };
  }

  if (code === 'KITCHEN300') {
    if (subtotal < 1500) {
      return { valid: false, discountAmount: 0, title: '', reason: `Minimum order of ₹1,500 required for KITCHEN300 (Current subtotal: ${formatINR(subtotal)}).` };
    }
    return { valid: true, discountAmount: 300, title: 'Home & Kitchen ₹300 Discount' };
  }

  return {
    valid: false,
    discountAmount: 0,
    title: '',
    reason: `Invalid coupon "${code}". Available wallet coupons: WELCOME10, GIFT300, TECH1000, UTSAV500, AUDIO15, KITCHEN300.`,
  };
}

