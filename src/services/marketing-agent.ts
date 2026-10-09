/**
 * Marketing specialist: draft + schedule one campaign to one segment.
 * Hard-refuses discounts above MARKETING_AGENT_MAX_DISCOUNT_PERCENT (100, same as Resend/campaigns).
 */

import {
  MARKETING_AGENT_MAX_DISCOUNT_PERCENT,
  MarketingActionSchema,
  type MarketingAction,
} from '@/lib/validations/ai';
import {
  assertJsonSchema,
  guardrailRefuseToOutput,
  redactPii,
  type GuardrailRefuse,
} from '@/services/agent-guardrails';
import { recordAgentMemory } from '@/services/agent-memory-service';
import {
  runCampaignSend,
  type CampaignStore,
  type RunCampaignResult,
} from '@/services/campaign-send';
import type { CampaignSegment, OrderUserLoader } from '@/services/campaign-segments';
import { createCampaignStore, createOrderUserLoader } from '@/services/campaign-store';
import { MAX_PROMO_DISCOUNT_PERCENT, RESEND_ONBOARDING_FROM } from '@/services/resend-mail';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database.types';

export const AI_CAMPAIGN_NAME_PREFIX = '[AI]';

export { MARKETING_AGENT_MAX_DISCOUNT_PERCENT };

/** Prefer Resend/campaigns constant; keep Zod max in sync via MARKETING_AGENT_MAX_DISCOUNT_PERCENT. */
const DISCOUNT_CAP = Math.min(MARKETING_AGENT_MAX_DISCOUNT_PERCENT, MAX_PROMO_DISCOUNT_PERCENT);

export type MarketingAgentOutput = {
  reply: string;
  recommendedProductIds: string[];
  extractedIntents: { category: null; keywords: string[]; priceMax: null };
  provenance?: {
    verifiedAt: string;
    source: string;
    rowCount: number;
    confidence: 'verified' | 'qualified';
  };
  needsClarification?: boolean;
  campaignId?: string;
};

export type DraftAndScheduleInput = {
  segment: CampaignSegment;
  discountPercent: number;
  subject?: string;
  bodyHint?: string;
  createdBy: string | null;
  from?: string;
  apiKey?: string;
  store?: CampaignStore;
  loader?: OrderUserLoader;
  sendFn?: Parameters<typeof runCampaignSend>[0]['sendFn'];
  membersOverride?: Parameters<typeof runCampaignSend>[0]['membersOverride'];
};

/**
 * Branch-2 adapter: schedule/send one campaign via runCampaignSend.
 */
export async function draftAndScheduleCampaign(
  input: DraftAndScheduleInput,
): Promise<RunCampaignResult> {
  const from = (input.from ?? process.env.RESEND_FROM_EMAIL ?? '').trim() || RESEND_ONBOARDING_FROM;
  const apiKey = input.apiKey ?? process.env.RESEND_API_KEY ?? '';

  let store = input.store;
  let loader = input.loader;
  if (!store || !loader) {
    // Service role so AI schedules always land in `campaigns` for the admin UI.
    const supabase = createAdminClient();
    store = store ?? createCampaignStore(supabase);
    loader = loader ?? createOrderUserLoader(supabase);
  }

  const rawSubject = (input.subject ?? '').trim();
  const withPrefix = rawSubject
    ? rawSubject.toUpperCase().startsWith(AI_CAMPAIGN_NAME_PREFIX)
      ? rawSubject
      : `${AI_CAMPAIGN_NAME_PREFIX} ${rawSubject}`
    : `${AI_CAMPAIGN_NAME_PREFIX} ${input.segment} promo ${input.discountPercent}%`;

  return runCampaignSend(
    {
      segment: input.segment,
      discountPercent: input.discountPercent,
      name: withPrefix,
      createdBy: input.createdBy,
      from,
      apiKey,
      sendFn: input.sendFn,
      membersOverride: input.membersOverride,
    },
    store,
    loader,
  );
}

export function refuseOverLimitDiscount(discountPercent: number): GuardrailRefuse | null {
  if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > DISCOUNT_CAP) {
    return {
      refused: true,
      reply: `Discount ${discountPercent}% is not allowed. Marketing campaigns must use an integer from 1 to ${DISCOUNT_CAP}% (MAX_PROMO_DISCOUNT_PERCENT).`,
      provenance: {
        verifiedAt: new Date().toISOString(),
        source: 'ShopSphere Marketing Agent (Discount Cap)',
        rowCount: 0,
        confidence: 'qualified',
      },
    };
  }
  return null;
}

async function draftMarketingActionFromLlm(
  message: string,
  apiKey: string,
): Promise<string> {
  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const prompt = [
    'You are the ShopSphere marketing specialist.',
    'Return ONLY a JSON object (no markdown) with this exact shape:',
    `{"action":"draft_and_schedule","segment":"new"|"repeat"|"lapsed","discountPercent":1-${DISCOUNT_CAP},"subject":"...","bodyHint":"..."}`,
    `Hard rule: discountPercent must be an integer from 1 to ${DISCOUNT_CAP}. Never exceed ${DISCOUNT_CAP}.`,
    'Segments are ONLY: new (1 paid order), repeat (2+ in 90 days), lapsed (last paid > 90 days).',
    'Do NOT invent category-only, storefront, or multi-day "deployment" campaigns. Map category requests to the closest segment and put category in subject/bodyHint.',
    'subject is the campaign name (no need for [AI] prefix). bodyHint is short promo copy.',
    `Admin request: ${message}`,
  ].join('\n');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Marketing LLM HTTP ${res.status}`);
  }

  const data: unknown = await res.json();
  const text =
    typeof data === 'object' &&
    data !== null &&
    'candidates' in data &&
    Array.isArray((data as { candidates: unknown }).candidates)
      ? (
          (data as { candidates: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates[0]
            ?.content?.parts?.[0]?.text ?? ''
        )
      : '';

  if (!text.trim()) {
    throw new Error('Marketing LLM returned empty content');
  }
  return text;
}

export type RunMarketingAgentInput = {
  message: string;
  userId: string;
  sessionId?: string;
  apiKey?: string;
  /** Test hook: skip LLM and use this action (or raw JSON string). */
  actionOverride?: MarketingAction | string;
  schedule?: typeof draftAndScheduleCampaign;
  skipMemory?: boolean;
};

export async function runMarketingAgent(
  input: RunMarketingAgentInput,
): Promise<MarketingAgentOutput> {
  const redactedMessage = redactPii(input.message);

  let rawJson: string;
  if (typeof input.actionOverride === 'string') {
    rawJson = input.actionOverride;
  } else if (input.actionOverride) {
    rawJson = JSON.stringify(input.actionOverride);
  } else {
    const apiKey =
      input.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.AI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      '';
    if (!apiKey) {
      return guardrailRefuseToOutput({
        refused: true,
        reply: 'Marketing specialist needs an AI API key to draft the campaign JSON.',
        provenance: {
          verifiedAt: new Date().toISOString(),
          source: 'ShopSphere Marketing Agent',
          rowCount: 0,
          confidence: 'qualified',
        },
      });
    }
    try {
      rawJson = await draftMarketingActionFromLlm(redactedMessage, apiKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'LLM error';
      return guardrailRefuseToOutput({
        refused: true,
        reply: `Marketing draft failed: ${msg}`,
        provenance: {
          verifiedAt: new Date().toISOString(),
          source: 'ShopSphere Marketing Agent',
          rowCount: 0,
          confidence: 'qualified',
        },
      });
    }
  }

  const parsed = assertJsonSchema(MarketingActionSchema, redactPii(rawJson));
  if (!parsed.ok) {
    // Over-limit discounts fail Zod max(100); surface MAX_PROMO_DISCOUNT_PERCENT clearly.
    if (/discountPercent|Number must be less|too_big|less than or equal/i.test(parsed.refuse.reply)) {
      const overLimit = refuseOverLimitDiscount(DISCOUNT_CAP + 1);
      if (overLimit) {
        return guardrailRefuseToOutput(overLimit);
      }
    }
    return guardrailRefuseToOutput(parsed.refuse);
  }

  const action = parsed.data;
  const capRefuse = refuseOverLimitDiscount(action.discountPercent);
  if (capRefuse) {
    return guardrailRefuseToOutput(capRefuse);
  }

  const schedule = input.schedule ?? draftAndScheduleCampaign;
  const result = await schedule({
    segment: action.segment,
    discountPercent: action.discountPercent,
    subject: action.subject,
    bodyHint: action.bodyHint,
    createdBy: input.userId,
  });

  if (!result.ok) {
    return guardrailRefuseToOutput({
      refused: true,
      reply: `Could not schedule campaign: ${result.error}`,
      provenance: {
        verifiedAt: new Date().toISOString(),
        source: 'ShopSphere Marketing Agent (Campaign Send)',
        rowCount: 0,
        confidence: 'qualified',
      },
    });
  }

  const summary = redactPii(
    `Scheduled ${action.segment} campaign ${result.campaignId} at ${action.discountPercent}% (subject: ${action.subject}). Hint: ${action.bodyHint}`,
  );

  if (!input.skipMemory) {
    const metadata: Json = {
      agent: 'marketing',
      specialist: 'marketing',
      segment: action.segment,
      campaignId: result.campaignId,
      sessionId: input.sessionId ?? null,
    };
    await recordAgentMemory(input.userId, summary, metadata);
  }

  try {
    const admin = createAdminClient();
    await admin.from('admin_audit_logs').insert({
      action: 'campaign_promo_send_ai',
      admin_id: input.userId,
      target_entity: 'campaigns',
      target_id: result.campaignId,
      metadata: {
        source: 'marketing_agent',
        segment: result.segment,
        discountPercent: result.discountPercent,
        promoCode: result.promoCode,
        attempted: result.attempted,
        sent: result.sent,
        emailed: result.emailed,
      },
    });
  } catch (auditErr) {
    console.warn('[Marketing Agent] audit log failed:', auditErr);
  }

  return {
    reply: `Scheduled a ${action.segment} promo at ${action.discountPercent}% (id ${result.campaignId}, code ${result.promoCode}). In-app ${result.sent}/${result.attempted}, emailed ${result.emailed}. Open Admin → Email campaigns to see it (AI badge). Category-only / timed storefront banners are not supported — only new/repeat/lapsed segments.`,
    recommendedProductIds: [],
    extractedIntents: { category: null, keywords: [action.segment, 'campaign'], priceMax: null },
    provenance: {
      verifiedAt: new Date().toISOString(),
      source: 'ShopSphere Marketing Specialist',
      rowCount: result.sent,
      confidence: 'verified',
    },
    campaignId: result.campaignId,
  };
}
