/**
 * Deterministic multi-agent supervisor: customer tool loop vs marketing specialist.
 * Gift / checkout / wallet / cart always force the customer path.
 */

import {
  SupervisorDecisionSchema,
  type SupervisorDecision,
} from '@/lib/validations/ai';
import { SUPERVISOR_CONFIDENCE_FLOOR } from '@/services/agent-guardrails';

export type SpecialistId = SupervisorDecision['specialist'];

export type ClassifySpecialistContext = {
  isAdmin?: boolean;
};

const CUSTOMER_FORCE_RE =
  /\b(gift|surprise|gifting|present for|send to friend|buy|purchase|checkout|pay|wallet|balance|topup|top up|cart|bag|favorites?|wishlist|order|cancel|refund)\b/i;

const MARKETING_RE =
  /\b(campaign|segment|promo|promotional|discount|email blast|email campaign|newsletter|crm blast|draft (?:and )?schedule|schedule (?:a )?campaign|send (?:a )?promo|marketing)\b/i;

const SEGMENT_RE = /\b(new|repeat|lapsed)\b/i;

/**
 * Classify which specialist should handle the message.
 * Does not enforce admin/confidence gates — callers refuse when marketing + !admin or low confidence.
 */
export function classifySpecialist(
  message: string,
  _ctx: ClassifySpecialistContext = {},
): SupervisorDecision {
  const norm = message.trim();

  if (CUSTOMER_FORCE_RE.test(norm)) {
    return SupervisorDecisionSchema.parse({
      specialist: 'customer',
      confidence: 0.95,
      reason: 'Gift, checkout, wallet, cart, or order cues force the customer agent.',
    });
  }

  const hasMarketingCue = MARKETING_RE.test(norm);
  const hasSegmentCue = SEGMENT_RE.test(norm);

  if (hasMarketingCue || hasSegmentCue) {
    // Segment-only stays below the 0.7 refuse floor; full campaign language clears it.
    let confidence = hasMarketingCue ? 0.72 : 0.55;
    if (hasSegmentCue && hasMarketingCue) confidence += 0.1;
    if (/\b(schedule|draft|send)\b/i.test(norm)) confidence += 0.08;
    confidence = Math.min(0.98, confidence);

    return SupervisorDecisionSchema.parse({
      specialist: 'marketing',
      confidence,
      reason: hasMarketingCue
        ? 'Campaign / promo / segment language routes to the marketing specialist.'
        : 'Segment keyword alone is weak marketing signal.',
    });
  }

  return SupervisorDecisionSchema.parse({
    specialist: 'customer',
    confidence: 0.85,
    reason: 'Default to the customer shopping agent.',
  });
}

export function shouldRunMarketingSpecialist(
  decision: SupervisorDecision,
  isAdmin: boolean,
): { run: true } | { run: false; reason: 'not_marketing' | 'not_admin' | 'low_confidence' } {
  if (decision.specialist !== 'marketing') {
    return { run: false, reason: 'not_marketing' };
  }
  if (!isAdmin) {
    return { run: false, reason: 'not_admin' };
  }
  if (decision.confidence < SUPERVISOR_CONFIDENCE_FLOOR) {
    return { run: false, reason: 'low_confidence' };
  }
  return { run: true };
}
