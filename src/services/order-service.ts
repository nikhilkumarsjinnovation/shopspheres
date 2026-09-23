import { createClient as createUserClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { queueNotification } from '@/services/notification-service';

export interface OrderItemInput {
  id: string;
  quantity: number;
  price?: number;
  seller_id?: string;
  title?: string;
}

export interface CreateOrderInput {
  items: OrderItemInput[];
  shippingAddress: {
    recipient_name: string;
    recipient_phone: string;
    address_line: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  paymentMethod: string;
  appliedOffer?: {
    code: string;
    discountAmount: number;
  } | null;
  isGift?: boolean;
  giftRecipientEmail?: string | null;
  giftRevealDate?: string | null;
}

export interface OrderTotals {
  subtotal: number;
  deliveryFee: number;
  handlingFee: number;
  discount: number;
  total: number;
}

export interface OrderResult {
  id: string;
  total: number;
  created_at: string;
  itemsCount: number;
  discountApplied: number;
  stockReserved: boolean;
  paymentConfirmed: boolean;
}

type PricedItem = {
  product_id: string;
  seller_id: string;
  quantity: number;
  unit_price: number;
  stock: number | null;
};

export function calculateTotals(subtotal: number, discountAmount: number): OrderTotals {
  const deliveryFee = subtotal >= 499 ? 0 : 40;
  const handlingFee = 19;
  const discount = Math.min(Math.max(0, discountAmount), subtotal);
  const total = Math.max(0, subtotal - discount + deliveryFee + handlingFee);
  return { subtotal, deliveryFee, handlingFee, discount, total };
}

export async function reserveStock(items: Array<{ product_id: string; quantity: number; stock: number | null }>): Promise<boolean> {
  let adminDb: ReturnType<typeof createAdminClient>;
  try {
    adminDb = createAdminClient();
  } catch {
    return false;
  }
  let reserved = true;

  for (const item of items) {
    if (item.stock === null) {
      continue;
    }
    const updatedStock = Math.max(0, item.stock - item.quantity);
    const { error } = await adminDb.from('products').update({ stock: updatedStock }).eq('id', item.product_id);
    if (error) {
      reserved = false;
    }
  }

  return reserved;
}

export async function confirmPayment(orderId: string, userId: string): Promise<boolean> {
  const supabase = await createUserClient();
  const { error } = await supabase
    .from('orders')
    .update({ status: 'confirmed' })
    .eq('id', orderId)
    .eq('customer_id', userId);

  return !error;
}

export async function createOrder(input: CreateOrderInput, userId: string): Promise<OrderResult> {
  const supabase = await createUserClient();
  const productIds = input.items.map((item) => item.id);

  const { data: dbProducts, error: prodErr } = await supabase
    .from('products')
    .select('id, title, price, seller_id, stock')
    .in('id', productIds);

  if (prodErr || !dbProducts || dbProducts.length === 0) {
    throw new Error('One or more items in your cart could not be located in our catalog.');
  }

  const { data: fallbackSeller } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'seller')
    .limit(1)
    .maybeSingle();

  const defaultSellerId = fallbackSeller?.id || userId;
  const productMap = new Map(dbProducts.map((product) => [product.id, product]));

  let subtotal = 0;
  const validatedItems: PricedItem[] = [];

  for (const item of input.items) {
    const dbProd = productMap.get(item.id);
    if (!dbProd) {
      throw new Error(`Product not found: ${item.title || item.id}`);
    }
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = Number(dbProd.price);
    subtotal += unitPrice * quantity;
    const sellerId = dbProd.seller_id && dbProd.seller_id.trim() !== '' ? dbProd.seller_id : defaultSellerId;
    validatedItems.push({
      product_id: dbProd.id,
      seller_id: sellerId,
      quantity,
      unit_price: unitPrice,
      stock: dbProd.stock,
    });
  }

  const totals = calculateTotals(subtotal, input.appliedOffer?.discountAmount ?? 0);

  const { data: newOrder, error: orderErr } = await supabase
    .from('orders')
    .insert({
      customer_id: userId,
      total_amount: totals.total,
      status: 'pending',
      is_gift: Boolean(input.isGift),
      recipient_email: input.isGift && input.giftRecipientEmail ? input.giftRecipientEmail.trim() : null,
      gift_reveal_date: input.isGift && input.giftRevealDate ? new Date(input.giftRevealDate).toISOString() : null,
      shipping_address: input.shippingAddress,
    })
    .select('id, total_amount, created_at')
    .single();

  if (orderErr || !newOrder) {
    throw new Error(`Failed to initialize order: ${orderErr?.message ?? 'unknown error'}`);
  }

  const { error: itemsErr } = await supabase.from('order_items').insert(
    validatedItems.map((item) => ({
      order_id: newOrder.id,
      product_id: item.product_id,
      seller_id: item.seller_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
  );

  if (itemsErr) {
    await supabase.from('orders').delete().eq('id', newOrder.id);
    throw new Error(`Failed to record order items: ${itemsErr.message}`);
  }

  await supabase.from('order_tracking_events').insert({
    order_id: newOrder.id,
    status: 'pending',
    title: 'Order Confirmed',
    description: `Order successfully placed via ${input.paymentMethod.toUpperCase()}. Local fulfillment initiated.`,
    location: `${input.shippingAddress.city}, ${input.shippingAddress.state}`,
  });

  const stockReserved = await reserveStock(validatedItems);
  const paymentConfirmed = await confirmPayment(newOrder.id, userId);

  await queueNotification({
    channel: 'email',
    userId,
    template: 'order_placed',
    payload: { orderId: newOrder.id, total: totals.total },
  });

  return {
    id: newOrder.id,
    total: Number(newOrder.total_amount),
    created_at: newOrder.created_at,
    itemsCount: validatedItems.length,
    discountApplied: totals.discount,
    stockReserved,
    paymentConfirmed,
  };
}
