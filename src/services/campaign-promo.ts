/**
 * Campaign promo codes: generate, format email copy, validate for a recipient.
 */

import { MAX_PROMO_DISCOUNT_PERCENT } from '@/services/resend-mail';

export const CAMPAIGN_PROMO_MAX_DISCOUNT_INR = 500;
export const CAMPAIGN_PROMO_MIN_ORDER_INR = 299;

/** SS25-A3B7 or SS100-ZZ9K */
export const CAMPAIGN_PROMO_CODE_PATTERN = /^SS([1-9]|[1-9][0-9]|100)-[A-Z0-9]{4}$/;

export function generateCampaignPromoCode(discountPercent: number): string {
  const pct = Math.max(1, Math.min(MAX_PROMO_DISCOUNT_PERCENT, Math.floor(discountPercent)));
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SS${pct}-${suffix}`;
}

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function isCampaignPromoCodeShape(code: string): boolean {
  return CAMPAIGN_PROMO_CODE_PATTERN.test(normalizePromoCode(code));
}

export function calculateCampaignDiscount(
  discountPercent: number,
  subtotal: number,
): { valid: boolean; discountAmount: number; reason?: string } {
  if (subtotal < CAMPAIGN_PROMO_MIN_ORDER_INR) {
    return {
      valid: false,
      discountAmount: 0,
      reason: `Minimum order of ₹${CAMPAIGN_PROMO_MIN_ORDER_INR} required for this campaign promo.`,
    };
  }
  const pct = Math.max(1, Math.min(MAX_PROMO_DISCOUNT_PERCENT, Math.floor(discountPercent)));
  const discount = Math.min(
    Math.round((subtotal * pct) / 100),
    CAMPAIGN_PROMO_MAX_DISCOUNT_INR,
  );
  if (discount <= 0) {
    return { valid: false, discountAmount: 0, reason: 'Cart total is too low for a discount.' };
  }
  return { valid: true, discountAmount: discount };
}

export type CampaignPromoLookup = {
  campaignId: string;
  promoCode: string;
  discountPercent: number;
  name: string;
  sendId: string;
};

export function campaignPromoTitle(discountPercent: number, promoCode: string): string {
  return `Campaign ${discountPercent}% (${promoCode})`;
}
