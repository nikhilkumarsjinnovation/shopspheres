/**
 * Assessment 3 campaigns: segment counts + send writes sent_at.
 * Offline by default (fixtures + in-memory store). No network.
 * Optional: CAMPAIGN_LIVE=1 after migration apply (NOT VERIFIED until then).
 */

import {
  buildSegmentMembers,
  countSegments,
  type OrderRowForSegment,
  type UserRowForSegment,
} from '../src/services/campaign-segments';
import {
  runCampaignSend,
  type CampaignRow,
  type CampaignSendRecord,
  type CampaignStore,
} from '../src/services/campaign-send';
import { MAX_PROMO_DISCOUNT_PERCENT } from '../src/services/resend-mail';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`PASSED: ${message}`);
}

function daysAgo(days: number, now: Date): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function createMemoryStore(): CampaignStore & { sends: CampaignSendRecord[]; campaigns: CampaignRow[] } {
  const campaigns: CampaignRow[] = [];
  const sends: CampaignSendRecord[] = [];
  let seq = 0;
  return {
    campaigns,
    sends,
    async insertCampaign(row) {
      seq += 1;
      const data: CampaignRow = {
        id: `camp_${seq}`,
        name: row.name,
        segment: row.segment,
        discount_percent: row.discount_percent,
        promo_code: row.promo_code,
        status: row.status,
        created_by: row.created_by,
      };
      campaigns.push(data);
      return { data, error: null };
    },
    async updateCampaignStatus(id, status) {
      const row = campaigns.find((c) => c.id === id);
      if (row) row.status = status;
      return { error: null };
    },
    async insertSend(row) {
      sends.push(row);
      return { error: null };
    },
  };
}

async function run() {
  const now = new Date('2026-10-09T12:00:00.000Z');

  const users: UserRowForSegment[] = [
    { id: 'u_new', email: 'new@example.com', full_name: 'New Customer' },
    { id: 'u_repeat', email: 'repeat@example.com', full_name: 'Repeat Buyer' },
    { id: 'u_lapsed', email: 'lapsed@example.com', full_name: 'Lapsed Buyer' },
    { id: 'u_pending', email: 'pending@example.com', full_name: 'Pending Only' },
  ];

  const orders: OrderRowForSegment[] = [
    { customer_id: 'u_new', status: 'confirmed', created_at: daysAgo(10, now) },
    { customer_id: 'u_repeat', status: 'confirmed', created_at: daysAgo(5, now) },
    { customer_id: 'u_repeat', status: 'delivered', created_at: daysAgo(20, now) },
    { customer_id: 'u_lapsed', status: 'confirmed', created_at: daysAgo(120, now) },
    { customer_id: 'u_pending', status: 'pending', created_at: daysAgo(2, now) },
    { customer_id: 'u_lapsed', status: 'cancelled', created_at: daysAgo(1, now) },
  ];

  const members = buildSegmentMembers(orders, users, now);
  const counts = countSegments(members);

  console.log(`SEGMENT COUNTS: new=${counts.new} repeat=${counts.repeat} lapsed=${counts.lapsed}`);
  assert(counts.new === 1, 'new segment has one customer with a single paid order');
  assert(counts.repeat === 1, 'repeat segment has one customer with 2+ paid orders in 90 days');
  assert(counts.lapsed === 1, 'lapsed segment has one customer whose last paid order is older than 90 days');
  assert(
    members.every((m) => m.userId !== 'u_pending'),
    'pending-only customers are excluded',
  );

  const store = createMemoryStore();
  const emptyLoader = {
    loadOrders: async () => [] as OrderRowForSegment[],
    loadUsers: async () => [] as UserRowForSegment[],
  };

  const refused = await runCampaignSend(
    {
      segment: 'new',
      discountPercent: 101,
      createdBy: 'admin_1',
      from: 'ShopSphere <onboarding@resend.dev>',
      apiKey: 're_test',
      now,
      membersOverride: members,
      sendFn: async () => ({ ok: true, id: 'should_not_run', status: 200 }),
    },
    store,
    emptyLoader,
  );
  assert(refused.ok === false && refused.status === 400, `Discount above ${MAX_PROMO_DISCOUNT_PERCENT}% is refused`);
  assert(store.sends.length === 0, 'Refused campaign does not write send rows');

  const twentyOk = await runCampaignSend(
    {
      segment: 'new',
      discountPercent: 25,
      createdBy: 'admin_1',
      from: 'ShopSphere <onboarding@resend.dev>',
      apiKey: 're_test',
      now,
      membersOverride: members,
      sendFn: async () => ({ ok: true, id: 'msg_25', status: 200 }),
    },
    createMemoryStore(),
    emptyLoader,
  );
  assert(twentyOk.ok === true, '25% campaign is allowed');
  if (!twentyOk.ok) process.exit(1);
  assert(twentyOk.promoCode.startsWith('SS25-'), '25% campaign codes as SS25-XXXX');

  const sent = await runCampaignSend(
    {
      segment: 'new',
      discountPercent: 10,
      name: 'Test new promo',
      createdBy: 'admin_1',
      from: 'ShopSphere <onboarding@resend.dev>',
      apiKey: 're_test',
      now,
      membersOverride: members,
      sendFn: async (input) => {
        assert(Boolean(input.promoCode), 'Promo email includes a code');
        assert(input.discountPercent === 10, 'Promo email uses the requested discount percent');
        return { ok: true, id: `msg_${input.to}`, status: 200 };
      },
    },
    store,
    emptyLoader,
  );

  assert(sent.ok === true, 'Campaign send succeeds for valid discount');
  if (!sent.ok) process.exit(1);
  assert(sent.sent === 1 && sent.attempted === 1, 'One new-segment recipient is attempted and sent');
  assert(sent.emailed === 1, 'Successful Resend path increments emailed count');
  assert(/^SS10-[A-Z0-9]{4}$/.test(sent.promoCode), 'Campaign generates a redeemable SS%%-XXXX promo code');
  assert(store.campaigns[0]?.promo_code === sent.promoCode, 'Promo code is stored on the campaign row');
  assert(sent.sends.length === 1 && sent.sends[0].sent_at !== null, 'Send row has sent_at set');
  assert(sent.sends[0].email === 'new@example.com', 'Send targets the new-segment email');
  assert(store.campaigns[0]?.status === 'sent', 'Campaign status becomes sent after send loop');

  const storeEmailFail = createMemoryStore();
  const emailFailed = await runCampaignSend(
    {
      segment: 'repeat',
      discountPercent: 5,
      createdBy: 'admin_1',
      from: 'ShopSphere <onboarding@resend.dev>',
      apiKey: 're_test',
      now,
      membersOverride: members,
      sendFn: async () => ({ ok: false, error: 'Resend sandbox blocked', status: 502 }),
    },
    storeEmailFail,
    emptyLoader,
  );
  assert(emailFailed.ok === true, 'Campaign still completes when Resend fails');
  if (!emailFailed.ok) process.exit(1);
  assert(
    emailFailed.sends[0]?.sent_at !== null && emailFailed.sends[0]?.resend_message_id === null,
    'In-app sent_at is set even when email delivery fails',
  );
  assert(emailFailed.emailed === 0 && emailFailed.emailFailures.length === 1, 'Email failure is reported separately');

  if (process.env.CAMPAIGN_LIVE === '1') {
    console.log('CAMPAIGN_LIVE=1 set — live DB path requires applied migration; skipping auto-assert here.');
    console.log('NOT VERIFIED (pending apply): live segment load + campaign_sends insert.');
  }

  console.log('All campaign checks passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
