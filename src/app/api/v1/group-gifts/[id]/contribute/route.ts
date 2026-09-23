import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

async function stripeRequest(path: string, secret: string, params?: URLSearchParams): Promise<unknown> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: params ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: params?.toString(),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      && payload.error && typeof payload.error === 'object' && 'message' in payload.error
      && typeof payload.error.message === 'string'
      ? payload.error.message
      : 'Stripe rejected the request.';
    throw new Error(message);
  }
  return payload;
}

function readId(payload: unknown): string | null {
  return payload && typeof payload === 'object' && 'id' in payload && typeof payload.id === 'string' ? payload.id : null;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { id } = await context.params;
  const body: unknown = await request.json();
  const record = body && typeof body === 'object' ? body : {};
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({
      error: 'Stripe is not configured.',
      reason: 'payment_provider_not_configured',
    }, { status: 501 });
  }

  const checkoutSessionId = 'checkoutSessionId' in record && typeof record.checkoutSessionId === 'string'
    ? record.checkoutSessionId
    : null;

  if (checkoutSessionId) {
    const checkout = await stripeRequest(`checkout/sessions/${checkoutSessionId}`, secret);
    const paid = checkout && typeof checkout === 'object' && 'payment_status' in checkout && checkout.payment_status === 'paid';
    if (!paid) {
      return NextResponse.json({ error: 'Stripe has not marked this payment as paid.' }, { status: 402 });
    }
    const admin = createAdminClient();
    const { data: contribution } = await admin
      .from('group_gift_contributions')
      .select('id, amount, status')
      .eq('payment_id', checkoutSessionId)
      .eq('group_gift_id', id)
      .maybeSingle();
    if (!contribution) {
      return NextResponse.json({ error: 'Contribution was not found for this Stripe session.' }, { status: 404 });
    }
    if (contribution.status !== 'completed') {
      const { data: pool } = await admin.from('group_gifts').select('current_amount').eq('id', id).maybeSingle();
      await admin.from('group_gift_contributions').update({ status: 'completed' }).eq('id', contribution.id);
      await admin.from('group_gifts').update({
        current_amount: Number(pool?.current_amount ?? 0) + Number(contribution.amount),
      }).eq('id', id);
    }
    return NextResponse.json({ contributionId: contribution.id, status: 'completed' });
  }

  const amount = 'amount' in record && typeof record.amount === 'number' ? record.amount : 0;
  if (amount <= 0) return NextResponse.json({ error: 'amount is required.' }, { status: 400 });

  const origin = request.nextUrl.origin;
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', `${origin}/gifts?stripe=success&session_id={CHECKOUT_SESSION_ID}&pool=${id}`);
  params.set('cancel_url', `${origin}/gifts?stripe=cancel`);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', 'inr');
  params.set('line_items[0][price_data][unit_amount]', String(Math.round(amount * 100)));
  params.set('line_items[0][price_data][product_data][name]', 'Group gift contribution');
  params.set('metadata[group_gift_id]', id);
  params.set('metadata[user_id]', session.user.id);

  let checkout: unknown;
  try {
    checkout = await stripeRequest('checkout/sessions', secret, params);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Stripe rejected the payment.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
  const paymentId = readId(checkout);
  const checkoutUrl = checkout && typeof checkout === 'object' && 'url' in checkout && typeof checkout.url === 'string'
    ? checkout.url
    : null;
  if (!paymentId || !checkoutUrl) {
    return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 });
  }

  const { data, error } = await supabase.from('group_gift_contributions').insert({
    group_gift_id: id,
    contributor_id: session.user.id,
    amount,
    payment_id: paymentId,
    status: 'pending',
  }).select('id, amount, status, payment_id').single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Could not record contribution.' }, { status: 500 });
  return NextResponse.json({ contribution: data, checkoutUrl });
}
