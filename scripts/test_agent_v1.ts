/**
 * Test Suite for Governed AI Agent v1 Architecture (Supabase Substrate)
 * Verifies:
 * 1. Question Router & Smart Cross-Questioning (Ambiguity Detection & Suggestion Chips)
 * 2. Deterministic Validation Gate (Numeric Provenance, Hallucination Control, Scope)
 * 3. Memory & Cache Layer (User-Scoped Isolation)
 * 4. Mode-Awareness (Chat Mode vs Agent Mode)
 */

import { routeUserQuestion } from '../src/services/agent-router';
import { validateAgentResponse } from '../src/services/agent-validator';
import { canonicalQueryHash, getCachedAgentResult, setCachedAgentResult } from '../src/services/agent-cache';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('=====================================================');
  console.log('🧪 Starting Governed AI Agent v1 Architecture Test');
  console.log('=====================================================\n');

  // -----------------------------------------------------------------
  // TEST 1: Question Router & Smart Cross-Questioning
  // -----------------------------------------------------------------
  console.log('--- TEST 1: Question Router & Smart Cross-Questioning ---');

  // 1a: Vague Single Word 'phone' -> must trigger clarification with budget chips
  const phoneRoute = routeUserQuestion('phone', 'agent');
  assert(phoneRoute.needs_clarification === true, 'Vague prompt "phone" flags needs_clarification');
  assert(phoneRoute.suggested_quick_replies.length > 0, 'Generates interactive quick reply suggestion chips');
  assert(phoneRoute.clarification_question?.includes('budget') === true, 'Cross-questions for budget ceiling');
  console.log('   Clarification Question:', phoneRoute.clarification_question);
  console.log('   Quick Reply Chips:', phoneRoute.suggested_quick_replies);

  // 1b: Vague Single Word 'shoe' -> asks for style & price
  const shoeRoute = routeUserQuestion('shoes', 'agent');
  assert(shoeRoute.needs_clarification === true, 'Vague prompt "shoes" flags needs_clarification');
  assert(shoeRoute.suggested_quick_replies.some(r => r.includes('Sneakers')), 'Suggests sneaker/running styles');

  // 1c: Unrealistic Price Constraint (Laptop under ₹5,000)
  const laptopRoute = routeUserQuestion('laptop under 5000', 'agent');
  assert(laptopRoute.needs_clarification === true, 'Unrealistic price constraint triggers clarification');
  assert(laptopRoute.clarification_reasons[0].includes('minimum entry price'), 'Flags minimum entry price honest explanation');

  // 1d: Specific Governed Query ('smartphones under ₹20,000') -> direct governed query without cross-question
  const specificRoute = routeUserQuestion('smartphones under ₹20,000', 'agent');
  assert(specificRoute.needs_clarification === false, 'Specific prompt "smartphones under ₹20,000" needs no clarification');
  assert(specificRoute.intent_type === 'governed_query', 'Classified as governed_query');
  assert(specificRoute.price_range.max === 20000, 'Parsed max price ceiling of ₹20,000');
  assert(specificRoute.category === 'Electronics', 'Detected category Electronics');

  // 1e: Action in Chat Mode -> requires mode toggle
  const chatActionRoute = routeUserQuestion('buy this smartwatch now', 'chat');
  assert(chatActionRoute.action_requires_agent_mode === true, 'Buying in chat mode triggers action_requires_agent_mode');

  // 1f: Ambiguous Gifting Recipient ('send him tribit speaker as gift') -> must cross-question user
  const giftRoute = routeUserQuestion('send him tribit stormbox micro 2 speaker as gift.', 'agent');
  assert(giftRoute.needs_clarification === true, 'Ambiguous gift recipient "him" triggers cross-questioning');
  assert(giftRoute.clarification_question?.includes('surprise gift to') === true, 'Asks user to clarify recipient');
  assert(giftRoute.suggested_quick_replies.some(r => r.includes('Friends')), 'Provides friend selector quick reply chip');

  // 1g: Exploratory Gifting Request ('i want to gift something to my female friend, can you suggest some thisn') -> DISCOVERY, NOT execution!
  const exploratoryGiftRoute = routeUserQuestion('i want to gift something to my female friend, can you suggest some thisn', 'agent');
  assert(exploratoryGiftRoute.needs_clarification === false, 'Exploratory gift request does NOT prematurely ask for recipient');
  assert(exploratoryGiftRoute.intent_type === 'governed_query', 'Classified as governed_query for catalog search');
  assert(exploratoryGiftRoute.category === 'Health & Beauty', 'Female friend context routed to Health & Beauty / Perfumes');
  assert(exploratoryGiftRoute.keywords.includes('gift'), 'Includes gift keyword for search');
  console.log('   Exploratory Gift Route Category:', exploratoryGiftRoute.category);
  console.log('   Exploratory Gift Keywords:', exploratoryGiftRoute.keywords);

  // 1h: Multi-turn Affirmation ('yes, you can send this as gift to her') with history containing recipient email -> ACTION TASK without loop!
  const confirmGiftRoute = routeUserQuestion('yes, you can send this as gift to her', 'agent', {
    recentTurns: [
      { role: 'user', content: 'i go with bella vita' },
      { role: 'assistant', content: 'Please provide recipient email' },
      { role: 'user', content: 'her email id is list.append17@gmail.com' },
      { role: 'assistant', content: 'Shall I go ahead and send this gift for you right now?' },
    ],
  });
  assert(confirmGiftRoute.needs_clarification === false, 'Affirmative gift confirmation with recipient in history does NOT trigger clarification');
  assert(confirmGiftRoute.intent_type === 'action_task', 'Classified as action_task execution');
  assert(confirmGiftRoute.target_entity === 'gift', 'Target entity set to gift');
  console.log('   Affirmative Gift Intent Type:', confirmGiftRoute.intent_type);

  // -----------------------------------------------------------------
  // TEST 2: Deterministic Validation Gate (Numeric Provenance)
  // -----------------------------------------------------------------
  console.log('\n--- TEST 2: Deterministic Validation Gate (Numeric Provenance) ---');

  const mockDbProduct = {
    id: 'prod_noise_watch',
    title: 'Noise ColorFit Icon Buzz Smartwatch',
    price: 1499,
    compare_at_price: 3999,
    category: 'Audio & Accessories',
  };

  // Scenario 2a: LLM hallucinates an unverified price (₹1,249 instead of database ₹1,499)
  const hallucinatedReply = 'The Noise ColorFit Icon Buzz Smartwatch is available for ₹1,249 with free shipping.';
  const valResult = validateAgentResponse({
    rawReply: hallucinatedReply,
    routerIntent: specificRoute,
    executedData: {
      products: [mockDbProduct],
      userId: 'usr_test_1',
    },
    recommendedProducts: [mockDbProduct],
  });

  assert(valResult.validationReport.checks.some(c => c.checkName.includes('Numeric Provenance')), 'Numeric Provenance check executed');
  assert(valResult.reply.includes('₹1,499'), 'Auto-corrected hallucinated price ₹1,249 to verified database price ₹1,499');
  assert(valResult.validationReport.correctionsApplied.length > 0, 'Corrections recorded in validation audit report');
  console.log('   Corrected Output:', valResult.reply);
  console.log('   Audit Corrections:', valResult.validationReport.correctionsApplied);

  // Scenario 2b: Scope Gate asserts foreign tenant data is blocked
  const foreignOrderResult = validateAgentResponse({
    rawReply: 'Here is your order summary for ₹5,000.',
    routerIntent: specificRoute,
    executedData: {
      userId: 'usr_alice',
      orders: [{ id: 'ord_bob', customer_id: 'usr_bob', total_amount: 5000 }],
    },
  });
  assert(foreignOrderResult.validationReport.checks.some(c => c.checkName === 'Scope Isolation' && !c.passed), 'Scope gate caught foreign user order');

  // Scenario 2c: Currency token normalization ($ -> ₹)
  const dollarReply = 'This item is priced at $1,499.';
  const currencyResult = validateAgentResponse({
    rawReply: dollarReply,
    routerIntent: specificRoute,
    executedData: { products: [mockDbProduct], userId: 'usr_alice' },
  });
  assert(currencyResult.reply.includes('₹1,499'), 'Standardized foreign dollar currency token to ₹');

  // Scenario 2d: Budget Constraint Preservation (e.g. "under ₹20,000" MUST NOT be replaced with product price)
  const budgetReply = 'Here are the smartphones available in Electronics under ₹20,000:\n1. OnePlus Nord CE4 5G - ₹19,999';
  const budgetResult = validateAgentResponse({
    rawReply: budgetReply,
    routerIntent: specificRoute, // has price_range.max = 20000
    executedData: {
      products: [
        { id: '1', title: 'OnePlus Nord CE4 5G', price: 19999, category: 'Electronics' },
        { id: '2', title: 'Rode VideoMic GO II', price: 8490, category: 'Electronics' },
      ],
      userId: 'usr_alice',
    },
  });
  assert(budgetResult.reply.includes('under ₹20,000'), 'Preserved user budget ceiling "under ₹20,000" without corrupting it to ₹8,490');
  assert(budgetResult.reply.includes('₹19,999'), 'Preserved verified product price ₹19,999');

  // -----------------------------------------------------------------
  // TEST 3: User-Scoped Result Cache Layer
  // -----------------------------------------------------------------
  console.log('\n--- TEST 3: User-Scoped Result Cache Layer ---');

  const hash = canonicalQueryHash('smartphones under 20000', 'agent', 'Electronics');
  const watermark = '2026-09-29T08';

  // Cache for user Alice
  await setCachedAgentResult('usr_alice', hash, watermark, valResult, 60);

  // Query as user Alice -> Hit!
  const aliceHit = await getCachedAgentResult('usr_alice', hash, watermark);
  assert(aliceHit !== null, 'Alice gets cache hit');
  assert(aliceHit?.reply.includes('₹1,499') === true, 'Alice cache hit contains validated output');

  // Query as user Bob -> Miss! (Strict user isolation, never leak user data)
  const bobHit = await getCachedAgentResult('usr_bob', hash, watermark);
  assert(bobHit === null, 'Bob gets cache miss (cross-tenant leak prevention guaranteed)');

  console.log('\n=====================================================');
  console.log('🎉 ALL ARCHITECTURE UNIT & INTEGRATION TESTS PASSED!');
  console.log('=====================================================');
}

runTests().catch((err) => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
