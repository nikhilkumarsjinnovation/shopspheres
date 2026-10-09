export type NotificationChannel = 'push' | 'email' | 'sms';

export interface NotificationInput {
  channel: NotificationChannel | 'in_app';
  userId: string;
  template: string;
  payload?: Record<string, string | number | boolean | null>;
}

export interface NotificationResult {
  queued: boolean;
  channel: NotificationInput['channel'];
  reason: 'sent' | 'provider_not_configured' | 'provider_rejected' | 'missing_address';
}

function result(input: NotificationInput): NotificationResult {
  return { queued: false, channel: input.channel, reason: 'provider_not_configured' };
}

export async function sendPush(input: NotificationInput): Promise<NotificationResult> {
  return result({ ...input, channel: 'push' });
}

export async function sendEmail(input: NotificationInput): Promise<NotificationResult> {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const { renderShopEmail, sendAppEmail } = await import('@/services/resend-mail');
    const admin = createAdminClient();
    const { data: user, error } = await admin.from('users').select('email, full_name').eq('id', input.userId).maybeSingle();
    if (error || !user?.email) {
      return { queued: false, channel: 'email', reason: 'missing_address' };
    }
    const message = renderShopEmail(input.template, input.payload ?? {}, user.full_name);
    const sent = await sendAppEmail({ to: user.email, ...message });
    if (!sent.ok) {
      console.error('[resend]', input.template, sent.status);
      return { queued: false, channel: 'email', reason: sent.status === 501 ? 'provider_not_configured' : 'provider_rejected' };
    }
    return { queued: true, channel: 'email', reason: 'sent' };
  } catch {
    console.error('[resend] send failed for', input.template);
    return { queued: false, channel: 'email', reason: 'provider_rejected' };
  }
}

export async function sendEmailToAddress(
  to: string,
  template: string,
  payload: NotificationInput['payload'],
): Promise<NotificationResult> {
  try {
    const { renderShopEmail, sendAppEmail } = await import('@/services/resend-mail');
    const message = renderShopEmail(template, payload ?? {}, null);
    const sent = await sendAppEmail({ to, ...message });
    if (!sent.ok) {
      console.error('[resend]', template, sent.status);
      return { queued: false, channel: 'email', reason: sent.status === 501 ? 'provider_not_configured' : 'provider_rejected' };
    }
    return { queued: true, channel: 'email', reason: 'sent' };
  } catch {
    console.error('[resend] address send failed for', template);
    return { queued: false, channel: 'email', reason: 'provider_rejected' };
  }
}

export async function sendSMS(input: NotificationInput): Promise<NotificationResult> {
  return result({ ...input, channel: 'sms' });
}

export async function queueNotification(input: NotificationInput): Promise<NotificationResult> {
  if (input.channel === 'email') {
    return sendEmail(input);
  }
  return result(input);
}

export interface ProactiveCheckResult {
  priceDrops: number;
  backInStock: number;
  deliveryMilestones: number;
  recommendations: number;
  queued: number;
}

export async function checkProactiveNotifications(): Promise<ProactiveCheckResult> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  let queued = 0;

  const { data: priced } = await admin
    .from('products')
    .select('id, price, compare_at_price')
    .eq('approval_status', 'approved')
    .not('compare_at_price', 'is', null)
    .limit(100);
  const priceDrops = (priced ?? []).filter(
    (product) => product.compare_at_price !== null && product.compare_at_price > product.price,
  ).length;

  const { count: inStockCount } = await admin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('approval_status', 'approved')
    .gt('stock', 0);

  const { data: deliveries } = await admin
    .from('orders')
    .select('id, customer_id')
    .eq('status', 'out_for_delivery')
    .limit(50);

  for (const order of deliveries ?? []) {
    await sendEmail({
      channel: 'email',
      userId: order.customer_id,
      template: 'out_for_delivery',
      payload: { orderId: order.id },
    });
    await sendPush({
      channel: 'push',
      userId: order.customer_id,
      template: 'out_for_delivery',
      payload: { orderId: order.id },
    });
    await queueNotification({
      channel: 'in_app',
      userId: order.customer_id,
      template: 'out_for_delivery',
      payload: { orderId: order.id },
    });
    queued += 1;
  }

  return {
    priceDrops,
    backInStock: inStockCount ?? 0,
    deliveryMilestones: deliveries?.length ?? 0,
    recommendations: 0,
    queued,
  };
}
