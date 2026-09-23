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
  reason: 'provider_not_configured';
}

function result(input: NotificationInput): NotificationResult {
  return { queued: false, channel: input.channel, reason: 'provider_not_configured' };
}

export async function sendPush(input: NotificationInput): Promise<NotificationResult> {
  return result({ ...input, channel: 'push' });
}

export async function sendEmail(input: NotificationInput): Promise<NotificationResult> {
  return result({ ...input, channel: 'email' });
}

export async function sendSMS(input: NotificationInput): Promise<NotificationResult> {
  return result({ ...input, channel: 'sms' });
}

export async function queueNotification(input: NotificationInput): Promise<NotificationResult> {
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
