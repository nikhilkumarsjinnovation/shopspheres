import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { queueNotification } from '@/services/notification-service';

type Db = SupabaseClient<Database>;

export interface CreateGiftInput {
  senderId: string;
  recipientId?: string | null;
  recipientEmail?: string | null;
  revealTrigger?: 'date' | 'delivery' | 'manual';
  revealDate?: string | null;
  message?: string | null;
  wrappingOptionId?: string | null;
  orderId?: string | null;
}

export async function createGift(supabase: Db, input: CreateGiftInput) {
  const { data, error } = await supabase
    .from('gifts')
    .insert({
      sender_id: input.senderId,
      recipient_id: input.recipientId ?? null,
      recipient_email: input.recipientEmail ?? null,
      reveal_trigger: input.revealTrigger ?? 'manual',
      reveal_date: input.revealDate ?? null,
      message: input.message ?? null,
      wrapping_option_id: input.wrappingOptionId ?? null,
      order_id: input.orderId ?? null,
    })
    .select('*')
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? 'Could not create gift.');
  }
  await queueNotification({
    channel: 'email',
    userId: input.senderId,
    template: 'gift_sent',
    payload: { giftId: data.id },
  });
  return data;
}

export async function revealGift(supabase: Db, giftId: string, userId: string) {
  const { data, error } = await supabase
    .from('gifts')
    .update({
      status: 'revealed',
      revealed_at: new Date().toISOString(),
    })
    .eq('id', giftId)
    .eq('sender_id', userId)
    .select('*')
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Gift was not found or cannot be revealed yet.');
  }
  if (data.recipient_id) {
    await queueNotification({
      channel: 'email',
      userId: data.recipient_id,
      template: 'gift_revealed',
      payload: { giftId },
    });
  }
  return data;
}

export async function thankSender(supabase: Db, giftId: string, userId: string, message: string) {
  const { data, error } = await supabase
    .from('gifts')
    .update({
      status: 'thanked',
      message,
    })
    .eq('id', giftId)
    .eq('recipient_id', userId)
    .select('*')
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Only the recipient can thank the sender after the gift is revealed.');
  }
  await queueNotification({
    channel: 'email',
    userId: data.sender_id,
    template: 'gift_thanked',
    payload: { giftId },
  });
  return data;
}

export async function revealDueGifts(): Promise<number> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: due, error } = await admin
    .from('gifts')
    .select('id')
    .eq('status', 'pending')
    .eq('reveal_trigger', 'date')
    .lte('reveal_date', now);
  if (error) {
    throw new Error(error.message);
  }
  const { data: delivered } = await admin
    .from('gifts')
    .select('id, order_id')
    .eq('status', 'pending')
    .eq('reveal_trigger', 'delivery');
  const deliveryIds: string[] = [];
  for (const gift of delivered ?? []) {
    if (!gift.order_id) continue;
    const { data: order } = await admin.from('orders').select('status').eq('id', gift.order_id).maybeSingle();
    if (order?.status === 'delivered') deliveryIds.push(gift.id);
  }
  const ids = [...(due ?? []).map((gift) => gift.id), ...deliveryIds];
  if (ids.length === 0) return 0;
  const { error: updateError } = await admin
    .from('gifts')
    .update({ status: 'revealed', revealed_at: now })
    .in('id', ids);
  if (updateError) {
    throw new Error(updateError.message);
  }
  return ids.length;
}

export async function completeReadyGroupGifts(): Promise<number> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: pools, error } = await admin
    .from('group_gifts')
    .select('id, organizer_id, target_amount, current_amount, product_id, title')
    .eq('status', 'collecting')
    .lte('deadline', now);
  if (error) {
    throw new Error(error.message);
  }
  let completed = 0;
  for (const pool of pools ?? []) {
    if (pool.current_amount < pool.target_amount || !pool.product_id) continue;
    const { data: product } = await admin.from('products').select('price, seller_id').eq('id', pool.product_id).maybeSingle();
    if (!product) continue;
    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        customer_id: pool.organizer_id,
        total_amount: product.price,
        status: 'confirmed',
        shipping_address: { note: 'Group gift auto-purchase' },
      })
      .select('id')
      .single();
    if (orderError || !order) continue;
    await admin.from('order_items').insert({
      order_id: order.id,
      product_id: pool.product_id,
      seller_id: product.seller_id,
      quantity: 1,
      unit_price: product.price,
    });
    await admin.from('group_gifts').update({ status: 'completed', order_id: order.id }).eq('id', pool.id);
    await queueNotification({
      channel: 'email',
      userId: pool.organizer_id,
      template: 'group_gift_completed',
      payload: { groupGiftId: pool.id, orderId: order.id },
    });
    completed += 1;
  }
  return completed;
}
