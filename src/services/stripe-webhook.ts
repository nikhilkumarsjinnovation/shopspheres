import { createHash, createHmac, timingSafeEqual } from 'crypto';

/** Stripe signs `${timestamp}.${rawBody}` with the endpoint secret. Tolerance is 5 minutes. */
export const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

const ORDER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StripeVerifyFailure = 'missing_header' | 'missing_timestamp' | 'stale' | 'mismatch';

export type StripeVerifyResult =
  | { ok: true }
  | { ok: false; reason: StripeVerifyFailure };

export type InterpretedStripeEvent = {
  stripeEventId: string;
  eventType: string;
  orderId: string | null;
  livemode: boolean;
  payloadSha256: string;
  shouldConfirmOrder: boolean;
};

export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): StripeVerifyResult {
  if (!signatureHeader || !secret) {
    return { ok: false, reason: 'missing_header' };
  }
  const parts = signatureHeader.split(',').map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith('t='));
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  if (!timestampPart || signatures.length === 0) {
    return { ok: false, reason: 'missing_timestamp' };
  }
  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) {
    return { ok: false, reason: 'missing_timestamp' };
  }
  if (Math.abs(nowSeconds - timestamp) > STRIPE_SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false, reason: 'stale' };
  }
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
  const match = signatures.some((signature) => safeEqualHex(signature, expected));
  return match ? { ok: true } : { ok: false, reason: 'mismatch' };
}

export function interpretStripeEvent(rawBody: string): { ok: true; event: InterpretedStripeEvent } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, error: 'Stripe payload is not JSON.' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Stripe payload is not an object.' };
  }
  const record = parsed as { id?: unknown; type?: unknown; livemode?: unknown; data?: unknown };
  if (typeof record.id !== 'string' || record.id.length < 8 || record.id.length > 255) {
    return { ok: false, error: 'Stripe event id is missing.' };
  }
  if (typeof record.type !== 'string' || record.type.length === 0) {
    return { ok: false, error: 'Stripe event type is missing.' };
  }
  const object = record.data && typeof record.data === 'object' && 'object' in record.data ? record.data.object : null;
  const metadata = object && typeof object === 'object' && 'metadata' in object ? object.metadata : null;
  const orderRaw = metadata && typeof metadata === 'object' && 'order_id' in metadata ? metadata.order_id : null;
  const orderId = typeof orderRaw === 'string' && ORDER_ID_PATTERN.test(orderRaw) ? orderRaw : null;
  const paymentStatus = object && typeof object === 'object' && 'payment_status' in object && typeof object.payment_status === 'string'
    ? object.payment_status
    : null;
  const confirms =
    orderId !== null &&
    (record.type === 'checkout.session.completed' || record.type === 'checkout.session.async_payment_succeeded') &&
    (paymentStatus === 'paid' || record.type === 'checkout.session.async_payment_succeeded');

  return {
    ok: true,
    event: {
      stripeEventId: record.id,
      eventType: record.type,
      orderId,
      livemode: record.livemode === true,
      payloadSha256: createHash('sha256').update(rawBody).digest('hex'),
      shouldConfirmOrder: confirms,
    },
  };
}

export type StripeEventStore = {
  confirmPendingOrder: (orderId: string) => Promise<{ error: string | null }>;
  recordTracking: (orderId: string) => Promise<{ error: string | null }>;
  insertEvent: (event: InterpretedStripeEvent) => Promise<{ error: string | null; duplicate: boolean }>;
};

export async function persistStripeEvent(
  store: StripeEventStore,
  event: InterpretedStripeEvent,
): Promise<{ ok: true; duplicate: boolean; confirmed: boolean } | { ok: false; error: string; status: number }> {
  if (event.shouldConfirmOrder && event.orderId) {
    const confirmed = await store.confirmPendingOrder(event.orderId);
    if (confirmed.error) {
      return { ok: false, error: confirmed.error, status: 500 };
    }
    await store.recordTracking(event.orderId);
  }
  const inserted = await store.insertEvent(event);
  if (inserted.duplicate) {
    return { ok: true, duplicate: true, confirmed: Boolean(event.shouldConfirmOrder && event.orderId) };
  }
  if (inserted.error) {
    return { ok: false, error: inserted.error, status: 500 };
  }
  return { ok: true, duplicate: false, confirmed: Boolean(event.shouldConfirmOrder && event.orderId) };
}

export function signStripePayload(rawBody: string, secret: string, timestampSeconds: number): string {
  const signature = createHmac('sha256', secret).update(`${timestampSeconds}.${rawBody}`, 'utf8').digest('hex');
  return `t=${timestampSeconds},v1=${signature}`;
}

function safeEqualHex(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
