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
