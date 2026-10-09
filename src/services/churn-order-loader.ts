/**
 * Load paid-order RFM rows for scoring (joins product category when available).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { OrderRowForRfm } from '@/services/rfm-features';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function categoryFromProducts(products: unknown): string {
  if (Array.isArray(products)) {
    const first = products[0];
    return isRecord(first) ? readString(first.category, 'unknown') : 'unknown';
  }
  if (isRecord(products)) {
    return readString(products.category, 'unknown');
  }
  return 'unknown';
}

export function mapJoinedOrders(rows: unknown): OrderRowForRfm[] {
  if (!Array.isArray(rows)) return [];
  const out: OrderRowForRfm[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const itemsRaw = row.order_items;
    const items = Array.isArray(itemsRaw)
      ? itemsRaw.flatMap((item) => {
          if (!isRecord(item)) return [];
          return [
            {
              product_id: readString(item.product_id),
              category: categoryFromProducts(item.products),
              quantity: readNumber(item.quantity, 1),
              unit_price: readNumber(item.unit_price),
            },
          ];
        })
      : [];
    out.push({
      id: readString(row.id),
      customer_id: readString(row.customer_id),
      status: readString(row.status),
      total_amount: readNumber(row.total_amount),
      created_at: readString(row.created_at),
      items,
    });
  }
  return out;
}

const ORDER_SELECT = `
  id,
  customer_id,
  status,
  total_amount,
  created_at,
  order_items (
    product_id,
    quantity,
    unit_price,
    products ( category )
  )
`;

export async function loadOrdersForCustomer(
  supabase: SupabaseClient<Database>,
  customerId: string,
): Promise<OrderRowForRfm[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return mapJoinedOrders(data);
}

export async function loadAllOrdersForTraining(
  supabase: SupabaseClient<Database>,
  limit = 5000,
): Promise<OrderRowForRfm[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }
  return mapJoinedOrders(data);
}
