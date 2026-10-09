/**
 * Outbound Resend mail. The API key is RESEND_API_KEY, never a literal in source.
 * https://resend.com/docs/api-reference/emails/send-email
 */

import { Resend } from 'resend';

const SAMPLE_RESEND_KEY = 're_xxxxxxxxx';
export const RESEND_ONBOARDING_FROM = 'onboarding@resend.dev';
export const RESEND_HELLO_TO = 'nikhil.kumar@sjinnovation.com';

export const MAX_PROMO_DISCOUNT_PERCENT = 15;

export type PromoEmailInput = {
  to: string;
  customerName: string;
  discountPercent: number;
};

export type ResendMessage = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
};

export type ResendSendResult =
  | { ok: true; id: string | null; status: number }
  | { ok: false; error: string; status: number };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function buildPromoEmail(input: PromoEmailInput, from: string): { ok: true; message: ResendMessage } | { ok: false; error: string } {
  const to = input.to.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(to)) {
    return { ok: false, error: 'A valid recipient email is required.' };
  }
  if (!from.trim()) {
    return { ok: false, error: 'RESEND_FROM_EMAIL is not configured.' };
  }
  if (!Number.isInteger(input.discountPercent) || input.discountPercent < 1 || input.discountPercent > MAX_PROMO_DISCOUNT_PERCENT) {
    return { ok: false, error: `Discount must be an integer from 1 to ${MAX_PROMO_DISCOUNT_PERCENT}.` };
  }
  const name = sanitizeName(input.customerName);
  const subject = `A ${input.discountPercent}% thank-you from ShopSphere`;
  const safeName = escapeHtml(name);
  return {
    ok: true,
    message: {
      from,
      to: [to],
      subject,
      html: `<p>Hi ${safeName},</p><p>Here is ${input.discountPercent}% off your next ShopSphere order. Show this email at checkout and ask the assistant to apply the promo.</p>`,
      text: `Hi ${name}, here is ${input.discountPercent}% off your next ShopSphere order.`,
    },
  };
}

export async function sendPromoEmail(
  input: PromoEmailInput,
  from: string,
  apiKey: string,
): Promise<ResendSendResult> {
  const built = buildPromoEmail(input, from);
  if (!built.ok) {
    return { ok: false, error: built.error, status: 400 };
  }
  return deliverResendEmail(apiKey, built.message);
}

/** First-email check from the Resend dashboard snippet. Recipient is the Resend account address. */
export function renderShopEmail(
  template: string,
  payload: Record<string, string | number | boolean | null>,
  fullName: string | null,
): { subject: string; html: string; text: string } {
  const name = escapeHtml(sanitizeName(fullName ?? 'there'));
  const orderId = textField(payload.orderId);
  const total = textField(payload.total);
  const giftId = textField(payload.giftId);
  const copy = shopEmailCopy(template, { name, orderId, total, giftId });
  return {
    subject: copy.subject,
    html: `<p>Hi ${name},</p><p>${copy.html}</p><p>ShopSphere</p>`,
    text: `Hi ${sanitizeName(fullName ?? 'there')}, ${copy.text}`,
  };
}

export async function sendAppEmail(input: { to: string; subject: string; html: string; text: string }): Promise<ResendSendResult> {
  const to = input.to.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(to)) {
    return { ok: false, error: 'A valid recipient email is required.', status: 400 };
  }
  const from = process.env.RESEND_FROM_EMAIL?.trim() || RESEND_ONBOARDING_FROM;
  return deliverResendEmail(process.env.RESEND_API_KEY ?? '', {
    from,
    to: [to],
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}

export async function sendHelloEmail(apiKey = process.env.RESEND_API_KEY ?? ''): Promise<ResendSendResult> {
  return deliverResendEmail(apiKey, {
    from: RESEND_ONBOARDING_FROM,
    to: [RESEND_HELLO_TO],
    subject: 'Hello World',
    html: '<p>Congrats on sending your <strong>first email</strong>!</p>',
    text: 'Congrats on sending your first email!',
  });
}

async function deliverResendEmail(
  apiKey: string,
  message: { from: string; to: string[]; subject: string; html: string; text?: string },
): Promise<ResendSendResult> {
  if (!apiKey || apiKey === SAMPLE_RESEND_KEY) {
    return {
      ok: false,
      error: 'Set RESEND_API_KEY in .env.local. Replace re_xxxxxxxxx with the key from the Resend dashboard.',
      status: 501,
    };
  }
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: message.from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
  if (error) {
    return { ok: false, error: error.message.slice(0, 300), status: error.statusCode ?? 502 };
  }
  return { ok: true, id: data?.id ?? null, status: 200 };
}

function shopEmailCopy(
  template: string,
  fields: { name: string; orderId: string; total: string; giftId: string },
): { subject: string; html: string; text: string } {
  switch (template) {
    case 'order_placed':
      return {
        subject: 'Your ShopSphere order is in',
        html: `We received order <strong>${fields.orderId}</strong> for ₹${fields.total}. We will email you again when it moves.`,
        text: `We received order ${fields.orderId} for ₹${fields.total}.`,
      };
    case 'payment_received':
      return {
        subject: 'ShopSphere payment received',
        html: `Stripe recorded payment for order <strong>${fields.orderId}</strong>. The order is confirmed.`,
        text: `Stripe recorded payment for order ${fields.orderId}. The order is confirmed.`,
      };
    case 'order_cancelled':
      return {
        subject: 'Your ShopSphere order was cancelled',
        html: `Order <strong>${fields.orderId}</strong> is cancelled. If this was paid from your wallet, the refund is on that balance.`,
        text: `Order ${fields.orderId} is cancelled.`,
      };
    case 'out_for_delivery':
      return {
        subject: 'Your ShopSphere order is out for delivery',
        html: `Order <strong>${fields.orderId}</strong> is with the courier.`,
        text: `Order ${fields.orderId} is with the courier.`,
      };
    case 'gift_sent':
      return {
        subject: 'Your ShopSphere gift is saved',
        html: `Gift <strong>${fields.giftId}</strong> is saved. We will tell the recipient when it is time to open it.`,
        text: `Gift ${fields.giftId} is saved.`,
      };
    case 'gift_incoming':
      return {
        subject: 'A ShopSphere gift is on the way',
        html: 'Someone placed a ShopSphere gift for this email. Open ShopSphere when you are ready to see it.',
        text: 'Someone placed a ShopSphere gift for this email.',
      };
    case 'gift_revealed':
      return {
        subject: 'Your ShopSphere gift is ready',
        html: `Gift <strong>${fields.giftId}</strong> can be opened in the Gifting Hub.`,
        text: `Gift ${fields.giftId} can be opened in the Gifting Hub.`,
      };
    case 'gift_thanked':
      return {
        subject: 'Your ShopSphere gift got a thank-you',
        html: `The recipient thanked you for gift <strong>${fields.giftId}</strong>.`,
        text: `The recipient thanked you for gift ${fields.giftId}.`,
      };
    case 'group_gift_created':
      return {
        subject: 'Your ShopSphere group gift is open',
        html: 'Friends can contribute until the deadline.',
        text: 'Friends can contribute until the deadline.',
      };
    case 'group_gift_completed':
      return {
        subject: 'Your ShopSphere group gift is complete',
        html: `The pool reached its goal. Order <strong>${fields.orderId}</strong> is confirmed.`,
        text: `The pool reached its goal. Order ${fields.orderId} is confirmed.`,
      };
    case 'friend_request':
      return {
        subject: 'New ShopSphere friend request',
        html: 'Someone wants to add you on ShopSphere. Open Friends to accept.',
        text: 'Someone wants to add you on ShopSphere.',
      };
    default:
      return {
        subject: 'A note from ShopSphere',
        html: 'You have a new update in your ShopSphere account.',
        text: 'You have a new update in your ShopSphere account.',
      };
  }
}

function textField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return escapeHtml(String(value)).slice(0, 80);
}

function sanitizeName(value: string): string {
  const cleaned = value.replace(/[\r\n\t<>]/g, ' ').replace(/\s+/g, ' ').trim();
  return (cleaned || 'there').slice(0, 80);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
