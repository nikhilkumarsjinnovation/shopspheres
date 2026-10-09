/**
 * Create one campaign for one segment and send promo emails via Resend helper.
 */

import {
  type CampaignSegment,
  type OrderUserLoader,
  type SegmentMember,
  isCampaignSegment,
  listSegmentMembers,
  loadSegmentSnapshot,
} from '@/services/campaign-segments';
import { generateCampaignPromoCode } from '@/services/campaign-promo';
import {
  MAX_PROMO_DISCOUNT_PERCENT,
  type PromoEmailInput,
  type ResendSendResult,
  sendPromoEmail,
} from '@/services/resend-mail';

export type CampaignSendRecord = {
  campaign_id: string;
  user_id: string;
  email: string;
  resend_message_id: string | null;
  sent_at: string | null;
};

export type CampaignRow = {
  id: string;
  name: string;
  segment: string;
  discount_percent: number;
  promo_code: string | null;
  status: string;
  created_by: string | null;
};

export type CampaignStore = {
  insertCampaign: (row: {
    name: string;
    segment: CampaignSegment;
    discount_percent: number;
    promo_code: string;
    status: string;
    created_by: string | null;
  }) => Promise<{ data: CampaignRow | null; error: string | null }>;
  updateCampaignStatus: (
    id: string,
    status: string,
  ) => Promise<{ error: string | null }>;
  insertSend: (row: CampaignSendRecord) => Promise<{ error: string | null }>;
};

export type SendPromoFn = (
  input: PromoEmailInput,
  from: string,
  apiKey: string,
) => Promise<ResendSendResult>;

export type RunCampaignInput = {
  segment: CampaignSegment;
  discountPercent: number;
  name?: string;
  createdBy: string | null;
  from: string;
  apiKey: string;
  now?: Date;
  sendFn?: SendPromoFn;
  /** When set, skips DB order load and uses these members (tests). */
  membersOverride?: SegmentMember[];
};

export type EmailFailure = { email: string; error: string };

export type RunCampaignResult =
  | {
      ok: true;
      campaignId: string;
      segment: CampaignSegment;
      promoCode: string;
      discountPercent: number;
      attempted: number;
      sent: number;
      emailed: number;
      emailFailures: EmailFailure[];
      sends: CampaignSendRecord[];
    }
  | { ok: false; error: string; status: number };

export async function runCampaignSend(
  input: RunCampaignInput,
  store: CampaignStore,
  loader: OrderUserLoader,
): Promise<RunCampaignResult> {
  if (!isCampaignSegment(input.segment)) {
    return { ok: false, error: 'segment must be new, repeat, or lapsed.', status: 400 };
  }
  if (
    !Number.isInteger(input.discountPercent) ||
    input.discountPercent < 1 ||
    input.discountPercent > MAX_PROMO_DISCOUNT_PERCENT
  ) {
    return {
      ok: false,
      error: `Discount must be an integer from 1 to ${MAX_PROMO_DISCOUNT_PERCENT}.`,
      status: 400,
    };
  }

  const now = input.now ?? new Date();
  let recipients: SegmentMember[];
  if (input.membersOverride) {
    recipients = listSegmentMembers(input.membersOverride, input.segment);
  } else {
    const snapshot = await loadSegmentSnapshot(loader, now);
    recipients = listSegmentMembers(snapshot.members, input.segment);
  }

  const name =
    (input.name ?? '').trim() ||
    `${input.segment} promo ${input.discountPercent}% ${now.toISOString().slice(0, 10)}`;
  const promoCode = generateCampaignPromoCode(input.discountPercent);

  const inserted = await store.insertCampaign({
    name,
    segment: input.segment,
    discount_percent: input.discountPercent,
    promo_code: promoCode,
    status: recipients.length === 0 ? 'draft' : 'sending',
    created_by: input.createdBy,
  });
  if (inserted.error || !inserted.data) {
    return { ok: false, error: inserted.error ?? 'Failed to create campaign.', status: 500 };
  }

  const campaignId = inserted.data.id;
  if (recipients.length === 0) {
    return {
      ok: true,
      campaignId,
      segment: input.segment,
      promoCode,
      discountPercent: input.discountPercent,
      attempted: 0,
      sent: 0,
      emailed: 0,
      emailFailures: [],
      sends: [],
    };
  }

  const sendFn = input.sendFn ?? sendPromoEmail;
  const sends: CampaignSendRecord[] = [];
  const emailFailures: EmailFailure[] = [];
  let sentCount = 0;
  let emailedCount = 0;

  for (const member of recipients) {
    const result = await sendFn(
      {
        to: member.email,
        customerName: member.customerName,
        discountPercent: input.discountPercent,
        promoCode,
      },
      input.from,
      input.apiKey,
    );

    // Always mark sent_at so the customer gets an in-app banner even if Resend fails (sandbox limits).
    const sentAt = new Date().toISOString();
    const record: CampaignSendRecord = {
      campaign_id: campaignId,
      user_id: member.userId,
      email: member.email,
      resend_message_id: result.ok ? result.id : null,
      sent_at: sentAt,
    };
    const write = await store.insertSend(record);
    if (write.error) {
      return { ok: false, error: write.error, status: 500 };
    }
    sends.push(record);
    sentCount += 1;
    if (result.ok) {
      emailedCount += 1;
    } else {
      emailFailures.push({ email: member.email, error: result.error });
    }
  }

  await store.updateCampaignStatus(campaignId, 'sent');

  return {
    ok: true,
    campaignId,
    segment: input.segment,
    promoCode,
    discountPercent: input.discountPercent,
    attempted: recipients.length,
    sent: sentCount,
    emailed: emailedCount,
    emailFailures,
    sends,
  };
}
