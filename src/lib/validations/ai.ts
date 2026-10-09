import { z } from 'zod';

/**
 * CategoryResponseSchema
 * Upgraded for Enterprise Master E-commerce Data Entry Agent.
 * Includes Amazon-level attributes record and suggested retail price.
 */
export const CategoryResponseSchema = z.object({
  category: z.string().min(1),
  sub_category: z.string().min(1),
  tags: z.array(z.string()).max(10),
  confidence: z.number().min(0).max(1),
  attributes: z.record(z.string()),
  suggested_price: z.number().min(0),
});

export type CategoryResponse = z.infer<typeof CategoryResponseSchema>;

/** Same ceiling as Resend / campaigns MAX_PROMO_DISCOUNT_PERCENT (branch 2): 1–100%. */
export const MARKETING_AGENT_MAX_DISCOUNT_PERCENT = 100;

export const SupervisorDecisionSchema = z.object({
  specialist: z.enum(['customer', 'marketing']),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
});

export type SupervisorDecision = z.infer<typeof SupervisorDecisionSchema>;

export const MarketingActionSchema = z.object({
  action: z.literal('draft_and_schedule'),
  segment: z.enum(['new', 'repeat', 'lapsed']),
  discountPercent: z
    .number()
    .int()
    .min(1)
    .max(MARKETING_AGENT_MAX_DISCOUNT_PERCENT),
  subject: z.string().min(1).max(200),
  bodyHint: z.string().min(1).max(2000),
});

export type MarketingAction = z.infer<typeof MarketingActionSchema>;
