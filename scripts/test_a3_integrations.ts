/**
 * Assessment 3 integrations: Stripe signature, HubSpot field redaction, Resend discount cap.
 * No network. No database.
 */

import { hubSpotUpsertBody, toHubSpotContactProperties, upsertHubSpotContact } from '../src/services/hubspot-sync';
import {
  applyResendSandboxRedirect,
  buildPromoEmail,
  renderShopEmail,
  RESEND_HELLO_TO,
  sendPromoEmail,
} from '../src/services/resend-mail';
import { interpretStripeEvent, persistStripeEvent, signStripePayload, verifyStripeSignature } from '../src/services/stripe-webhook';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`PASSED: ${message}`);
}

async function run() {
  const secret = 'whsec_test_secret';
  const now = 1_700_000_000;
  const orderId = '9cf9803a-458a-440b-8dfd-4ae0bf950657';
  const raw = JSON.stringify({
    id: 'evt_test_checkout_1',
    type: 'checkout.session.completed',
    livemode: false,
    data: { object: { payment_status: 'paid', metadata: { order_id: orderId } } },
  });

  const header = signStripePayload(raw, secret, now);
  assert(verifyStripeSignature(raw, header, secret, now).ok === true, 'Valid Stripe signature is accepted');
  assert(verifyStripeSignature(raw, header, 'whsec_other', now).ok === false, 'Wrong Stripe secret is rejected');
  assert(verifyStripeSignature(raw, null, secret, now).ok === false, 'Missing Stripe signature is rejected');
  assert(verifyStripeSignature(raw, header, secret, now + 301).ok === false, 'Stale Stripe signature is rejected');

  const interpreted = interpretStripeEvent(raw);
  assert(interpreted.ok === true && interpreted.event.shouldConfirmOrder === true, 'Paid checkout session confirms the order');
  assert(interpreted.ok === true && interpreted.event.orderId === orderId, 'Order id is read from Checkout metadata');

  const unpaid = interpretStripeEvent(JSON.stringify({
    id: 'evt_test_unpaid',
    type: 'checkout.session.completed',
    data: { object: { payment_status: 'unpaid', metadata: { order_id: orderId } } },
  }));
  assert(unpaid.ok === true && unpaid.event.shouldConfirmOrder === false, 'Unpaid checkout session does not confirm');

  const phoneLeak = interpretStripeEvent(JSON.stringify({
    id: 'evt_test_bad_order',
    type: 'checkout.session.completed',
    data: { object: { payment_status: 'paid', metadata: { order_id: 'not-a-uuid' } } },
  }));
  assert(phoneLeak.ok === true && phoneLeak.event.orderId === null, 'Non-uuid order id is ignored');

  let confirmed = false;
  let stored = 0;
  const persisted = await persistStripeEvent(
    {
      async confirmPendingOrder() {
        confirmed = true;
        return { error: null };
      },
      async recordTracking() {
        return { error: null };
      },
      async insertEvent() {
        stored += 1;
        return { error: null, duplicate: false };
      },
    },
    interpreted.ok ? interpreted.event : { stripeEventId: '', eventType: '', orderId: null, livemode: false, payloadSha256: '', shouldConfirmOrder: false },
  );
  assert(persisted.ok === true && confirmed && stored === 1, 'Paid event confirms then stores the event id');

  const properties = toHubSpotContactProperties({
    email: 'Priya@ShopSphere.in',
    fullName: 'Priya Sharma',
    phone: '+919800000000',
    address: { line1: '12 Residency Road', phone: '+919800000000' },
  });
  const body = hubSpotUpsertBody(properties);
  assert(properties.email === 'priya@shopsphere.in', 'HubSpot email is trimmed and lowercased');
  assert(properties.firstname === 'Priya' && properties.lastname === 'Sharma', 'HubSpot name is split');
  assert(!body.includes('9800000000') && !body.includes('Residency'), 'HubSpot payload drops phone and address');

  let sentBody = '';
  const hubspot = await upsertHubSpotContact(
    { email: 'priya@shopsphere.in', fullName: 'Priya Sharma', phone: '+919800000000' },
    'pat-test',
    async (_url, init) => {
      sentBody = String(init?.body ?? '');
      return new Response(JSON.stringify({ results: [{ id: 'hs_1' }] }), { status: 200 });
    },
  );
  assert(hubspot.ok === true && hubspot.contactId === 'hs_1', 'HubSpot upsert reads the contact id');
  assert(!sentBody.includes('9800000000'), 'HubSpot request body has no phone');

  const allowed = buildPromoEmail(
    { to: 'buyer@example.com', customerName: 'Asha\n<script>', discountPercent: 15, promoCode: 'SS15-TEST' },
    'ShopSphere <onboarding@resend.dev>',
  );
  assert(allowed.ok === true && !allowed.message.html.includes('<script>'), 'Promo HTML escapes the customer name');
  assert(allowed.ok === true && allowed.message.html.includes('SS15-TEST'), 'Promo email includes the redeemable code');
  assert(allowed.ok === true && allowed.message.html.includes('15%'), 'Promo email states the discount percent');
  if (allowed.ok) {
    const redirected = applyResendSandboxRedirect(allowed.message);
    assert(
      redirected.to[0] === RESEND_HELLO_TO && redirected.redirectedFrom === 'buyer@example.com',
      'Onboarding from-address redirects promo mail to the Resend sandbox inbox',
    );
    assert(redirected.html.includes('buyer@example.com'), 'Sandbox redirect keeps the intended recipient in the body');
  }
  const refused = buildPromoEmail(
    { to: 'buyer@example.com', customerName: 'Asha', discountPercent: 101, promoCode: 'SS101-BAD' },
    'ShopSphere <onboarding@resend.dev>',
  );
  assert(refused.ok === false, 'Promo above 100% is refused');
  const twentyFive = buildPromoEmail(
    { to: 'buyer@example.com', customerName: 'Asha', discountPercent: 25, promoCode: 'SS25-OKAY' },
    'ShopSphere <onboarding@resend.dev>',
  );
  assert(twentyFive.ok === true && twentyFive.message.html.includes('25%'), 'Promo at 25% is allowed');

  const missingKey = await sendPromoEmail(
    { to: 'buyer@example.com', customerName: 'Asha', discountPercent: 10, promoCode: 'SS10-TEST' },
    'ShopSphere <onboarding@resend.dev>',
    '',
  );
  assert(missingKey.ok === false && missingKey.status === 501, 'Resend without an API key is not configured');
  const sampleKey = await sendPromoEmail(
    { to: 'buyer@example.com', customerName: 'Asha', discountPercent: 10, promoCode: 'SS10-TEST' },
    'ShopSphere <onboarding@resend.dev>',
    're_xxxxxxxxx',
  );
  assert(sampleKey.ok === false && sampleKey.status === 501, 'Sample re_xxxxxxxxx key is refused');

  const orderMail = renderShopEmail('order_placed', { orderId: '9cf9803a-458a-440b-8dfd-4ae0bf950657', total: 649 }, 'Asha<script>');
  assert(orderMail.subject.includes('order'), 'Order email has a subject');
  assert(!orderMail.html.includes('<script>'), 'Order email escapes the customer name');
  assert(orderMail.html.includes('9cf9803a'), 'Order email includes the order id');
  const giftMail = renderShopEmail('gift_incoming', {}, null);
  assert(giftMail.subject.includes('gift'), 'Gift notice has a subject');

  console.log('ALL INTEGRATION UNIT TESTS PASSED');
}

run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
