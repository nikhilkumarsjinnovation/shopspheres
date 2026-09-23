import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createOrder, type CreateOrderInput } from '@/services/order-service';

export async function POST(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const csrfError = csrfMiddleware(request);
    if (csrfError) {
      return csrfError;
    }

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to complete your purchase.' },
        { status: 401 },
      );
    }

    const body = await request.json() as CreateOrderInput;
    const { items, shippingAddress } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Your cart is empty. Please add items before placing an order.' },
        { status: 400 },
      );
    }

    if (!shippingAddress || !shippingAddress.recipient_name || !shippingAddress.recipient_phone || !shippingAddress.address_line) {
      return NextResponse.json(
        { error: 'Incomplete delivery address. Please provide recipient name, phone, and address.' },
        { status: 400 },
      );
    }

    const order = await createOrder({ ...body, confirmNow: body.paymentMethod !== 'stripe' }, session.user.id);

    if (body.paymentMethod === 'stripe') {
      const secret = process.env.STRIPE_SECRET_KEY;
      if (!secret) {
        return NextResponse.json({ error: 'Stripe is not configured.', order }, { status: 501 });
      }
      const params = new URLSearchParams();
      params.set('mode', 'payment');
      params.set('success_url', `${request.nextUrl.origin}/orders?stripe=success&session_id={CHECKOUT_SESSION_ID}&order=${order.id}`);
      params.set('cancel_url', `${request.nextUrl.origin}/checkout?stripe=cancel`);
      params.set('line_items[0][quantity]', '1');
      params.set('line_items[0][price_data][currency]', 'inr');
      params.set('line_items[0][price_data][unit_amount]', String(Math.round(order.total * 100)));
      params.set('line_items[0][price_data][product_data][name]', `ShopSphere order SS-${order.id.slice(0, 8).toUpperCase()}`);
      params.set('metadata[order_id]', order.id);
      const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      const stripePayload: unknown = await stripeResponse.json();
      const checkoutUrl = stripePayload && typeof stripePayload === 'object' && 'url' in stripePayload && typeof stripePayload.url === 'string'
        ? stripePayload.url
        : null;
      if (!stripeResponse.ok || !checkoutUrl) {
        return NextResponse.json({ error: 'Stripe could not start checkout.', order }, { status: 502 });
      }
      return NextResponse.json({ success: true, order, checkoutUrl });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        total: order.total,
        created_at: order.created_at,
        itemsCount: order.itemsCount,
        discountApplied: order.discountApplied,
      },
    });
  } catch (err: unknown) {
    console.error('[Create Order API] Exception:', err);
    const msg = err instanceof Error ? err.message : 'Server error while processing order.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;
  const supabase = await createClient();
  const session = await getAuthenticatedUser(supabase);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const body: unknown = await request.json();
  const orderId = body && typeof body === 'object' && 'orderId' in body && typeof body.orderId === 'string' ? body.orderId : '';
  const checkoutSessionId = body && typeof body === 'object' && 'checkoutSessionId' in body && typeof body.checkoutSessionId === 'string'
    ? body.checkoutSessionId
    : null;
  if (checkoutSessionId && orderId) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 501 });
    const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${checkoutSessionId}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const checkout: unknown = await stripeResponse.json();
    const paid = checkout && typeof checkout === 'object' && 'payment_status' in checkout && checkout.payment_status === 'paid';
    if (!paid) return NextResponse.json({ error: 'Stripe has not marked this payment as paid.' }, { status: 402 });
    const { error } = await supabase.from('orders').update({ status: 'confirmed' }).eq('id', orderId).eq('customer_id', session.user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabase.from('order_tracking_events').insert({
      order_id: orderId,
      status: 'confirmed',
      title: 'Payment received',
      description: 'Stripe test payment was recorded.',
    });
    return NextResponse.json({ ok: true, status: 'confirmed' });
  }
  if (!orderId) return NextResponse.json({ error: 'orderId is required.' }, { status: 400 });
  const { data: existing } = await supabase.from('orders').select('status').eq('id', orderId).eq('customer_id', session.user.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Order was not found.' }, { status: 404 });
  if (existing.status === 'delivered' || existing.status === 'cancelled' || existing.status === 'shipped' || existing.status === 'out_for_delivery') {
    return NextResponse.json({ error: 'This order can no longer be cancelled.' }, { status: 400 });
  }
  const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId).eq('customer_id', session.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('order_tracking_events').insert({
    order_id: orderId,
    status: 'cancelled',
    title: 'Cancelled by you',
    description: 'You cancelled this order before it shipped.',
  });
  return NextResponse.json({ ok: true });
}
