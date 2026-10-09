import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, rateLimitKey, stripeWebhookLimiter } from '@/lib/rate-limiter';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/services/notification-service';
import { interpretStripeEvent, persistStripeEvent, verifyStripeSignature, type InterpretedStripeEvent } from '@/services/stripe-webhook';

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(stripeWebhookLimiter, await rateLimitKey(request));
  if (limited) return limited;

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Stripe webhook is not configured.' }, { status: 501 });
  }

  const rawBody = await request.text();
  const verified = verifyStripeSignature(rawBody, request.headers.get('stripe-signature'), secret);
  if (!verified.ok) {
    return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  const interpreted = interpretStripeEvent(rawBody);
  if (!interpreted.ok) {
    return NextResponse.json({ error: interpreted.error }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const result = await persistStripeEvent(
      {
        async confirmPendingOrder(orderId: string) {
          const { error } = await admin.from('orders').update({ status: 'confirmed' }).eq('id', orderId).eq('status', 'pending');
          return { error: error?.message ?? null };
        },
        async recordTracking(orderId: string) {
          const { error } = await admin.from('order_tracking_events').insert({
            order_id: orderId,
            status: 'confirmed',
            title: 'Payment received',
            description: 'Stripe webhook confirmed the test payment.',
          });
          if (error) console.error('[Stripe webhook] tracking insert failed:', error.code);
          return { error: error?.message ?? null };
        },
        async insertEvent(event: InterpretedStripeEvent) {
          const { error } = await admin.from('stripe_webhook_events').insert({
            stripe_event_id: event.stripeEventId,
            event_type: event.eventType,
            order_id: event.orderId,
            livemode: event.livemode,
            payload_sha256: event.payloadSha256,
          });
          return { error: error && error.code !== '23505' ? error.message : null, duplicate: error?.code === '23505' };
        },
      },
      interpreted.event,
    );
    if (!result.ok) {
      return NextResponse.json({ error: 'Stripe event could not be stored.' }, { status: result.status });
    }
    if (result.confirmed && interpreted.event.orderId) {
      const { data: paidOrder } = await admin
        .from('orders')
        .select('customer_id, total_amount')
        .eq('id', interpreted.event.orderId)
        .maybeSingle();
      if (paidOrder) {
        await sendEmail({
          channel: 'email',
          userId: paidOrder.customer_id,
          template: 'payment_received',
          payload: { orderId: interpreted.event.orderId, total: paidOrder.total_amount },
        });
      }
    }
    return NextResponse.json({ ok: true, duplicate: result.duplicate, confirmed: result.confirmed });
  } catch (err: unknown) {
    console.error('[Stripe webhook] persist failed:', err instanceof Error ? err.name : 'error');
    return NextResponse.json({ error: 'Stripe event could not be stored.' }, { status: 500 });
  }
}
