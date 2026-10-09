/**
 * Assessment 3 agents: supervisor routing + marketing discount cap + guardrails.
 * Offline — no live LLM / Resend / DB.
 */

import {
  MARKETING_AGENT_MAX_DISCOUNT_PERCENT,
  MarketingActionSchema,
} from '../src/lib/validations/ai';
import {
  redactPii,
  refuseIfLowConfidence,
  SUPERVISOR_CONFIDENCE_FLOOR,
  assertJsonSchema,
} from '../src/services/agent-guardrails';
import {
  classifySpecialist,
  shouldRunMarketingSpecialist,
} from '../src/services/agent-supervisor';
import {
  refuseOverLimitDiscount,
  runMarketingAgent,
} from '../src/services/marketing-agent';
import { MAX_PROMO_DISCOUNT_PERCENT } from '../src/services/resend-mail';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`PASSED: ${message}`);
}

async function run() {
  assert(
    MARKETING_AGENT_MAX_DISCOUNT_PERCENT === MAX_PROMO_DISCOUNT_PERCENT,
    `marketing cap ${MARKETING_AGENT_MAX_DISCOUNT_PERCENT} matches MAX_PROMO_DISCOUNT_PERCENT ${MAX_PROMO_DISCOUNT_PERCENT}`,
  );

  const gift = classifySpecialist('Send a gift of Bella Vita to friend@example.com');
  assert(gift.specialist === 'customer', 'gift message routes to customer agent');

  const checkout = classifySpecialist('I want to checkout and pay with my wallet');
  assert(checkout.specialist === 'customer', 'checkout message routes to customer agent');

  const promoCart = classifySpecialist('Apply a promo discount to my cart checkout');
  assert(promoCart.specialist === 'customer', 'promo+cart/checkout stays on customer agent');

  const marketing = classifySpecialist('Draft and schedule an email campaign to the lapsed segment at 10%');
  assert(marketing.specialist === 'marketing', 'campaign/segment language routes to marketing');
  assert(
    shouldRunMarketingSpecialist(marketing, true).run === true,
    'admin + confident marketing decision runs marketing specialist',
  );
  assert(
    shouldRunMarketingSpecialist(marketing, false).run === false,
    'non-admin marketing intent does not run marketing specialist',
  );

  const overCap = MARKETING_AGENT_MAX_DISCOUNT_PERCENT + 1;
  const capRefuse = refuseOverLimitDiscount(overCap);
  assert(capRefuse !== null, `discount ${overCap}% is refused`);
  assert(
    Boolean(capRefuse && capRefuse.reply.includes(String(MAX_PROMO_DISCOUNT_PERCENT))),
    `over-limit refuse mentions MAX_PROMO_DISCOUNT_PERCENT (${MAX_PROMO_DISCOUNT_PERCENT})`,
  );
  assert(refuseOverLimitDiscount(10) === null, 'discount 10% is allowed');
  assert(refuseOverLimitDiscount(100) === null, 'discount 100% is allowed at cap');

  const zodOver = MarketingActionSchema.safeParse({
    action: 'draft_and_schedule',
    segment: 'lapsed',
    discountPercent: overCap,
    subject: 'Too big',
    bodyHint: 'Nope',
  });
  assert(!zodOver.success, `MarketingActionSchema rejects discount ${overCap}`);

  const agentRefuse = await runMarketingAgent({
    message: 'Schedule lapsed campaign at 101 percent',
    userId: 'admin-test',
    skipMemory: true,
    actionOverride: JSON.stringify({
      action: 'draft_and_schedule',
      segment: 'lapsed',
      discountPercent: overCap,
      subject: 'Over cap',
      bodyHint: 'Should refuse',
    }),
    schedule: async () => {
      throw new Error('draftAndScheduleCampaign must not run for over-limit discount');
    },
  });
  assert(
    /not allowed|MAX_PROMO_DISCOUNT_PERCENT|1 to 100/i.test(agentRefuse.reply),
    'runMarketingAgent refuses over-limit before schedule',
  );
  assert(!agentRefuse.campaignId, 'no campaignId when discount refused');

  const redacted = redactPii('Email me at ada@shopsphere.test or call +1 415-555-0100 please');
  assert(!redacted.includes('ada@shopsphere.test'), 'redactPii strips email');
  assert(!/\d{3}[-.\s]?\d{4}/.test(redacted) || redacted.includes('[REDACTED_PHONE]'), 'redactPii strips phone');
  assert(redacted.includes('[REDACTED_EMAIL]'), 'redactPii inserts email token');

  const low = refuseIfLowConfidence(0.4);
  assert(low !== null, 'confidence below floor is refused');
  assert(
    refuseIfLowConfidence(SUPERVISOR_CONFIDENCE_FLOOR) === null,
    `confidence at floor ${SUPERVISOR_CONFIDENCE_FLOOR} is allowed`,
  );

  const weakMarketing = classifySpecialist('lapsed buyers');
  assert(weakMarketing.specialist === 'marketing', 'segment-only cue is marketing');
  const weakGate = shouldRunMarketingSpecialist(weakMarketing, true);
  assert(weakGate.run === false && weakGate.reason === 'low_confidence', 'weak marketing cue is low_confidence');
  const weakRefuse = refuseIfLowConfidence(weakMarketing.confidence);
  assert(weakRefuse !== null, 'low-confidence marketing classification refuses');

  const schemaOk = assertJsonSchema(MarketingActionSchema, JSON.stringify({
    action: 'draft_and_schedule',
    segment: 'new',
    discountPercent: 15,
    subject: 'Welcome',
    bodyHint: 'Say hello',
  }));
  assert(schemaOk.ok === true, 'assertJsonSchema accepts valid marketing action');

  console.log('\nAll a3 agents checks passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
