import type { Json } from '@/types/database.types';

export type PlatformStats = {
  users_customer: number;
  users_seller: number;
  users_admin: number;
  users_active: number;
  orders_by_status: Record<string, number>;
  gmv: number;
  products_pending: number;
  products_approved: number;
  products_rejected: number;
  shop_count: number;
  gifts_pending: number;
  low_stock: number;
};

function num(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parsePlatformStats(value: Json | null): PlatformStats | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, Json | undefined>;
  const statusRaw = row.orders_by_status;
  const orders_by_status: Record<string, number> = {};
  if (statusRaw && typeof statusRaw === 'object' && !Array.isArray(statusRaw)) {
    for (const [key, count] of Object.entries(statusRaw)) {
      orders_by_status[key] = num(count);
    }
  }
  return {
    users_customer: num(row.users_customer),
    users_seller: num(row.users_seller),
    users_admin: num(row.users_admin),
    users_active: num(row.users_active),
    orders_by_status,
    gmv: num(row.gmv),
    products_pending: num(row.products_pending),
    products_approved: num(row.products_approved),
    products_rejected: num(row.products_rejected),
    shop_count: num(row.shop_count),
    gifts_pending: num(row.gifts_pending),
    low_stock: num(row.low_stock),
  };
}

export function orderCode(id: string): string {
  return `SS-${id.slice(0, 8)}`;
}

export function shippingCityAndPin(address: Json): { city: string; pin: string } {
  if (!address || typeof address !== 'object' || Array.isArray(address)) {
    return { city: '—', pin: '—' };
  }
  const row = address as { city?: unknown; postal_code?: unknown };
  const city = typeof row.city === 'string' && row.city.trim() ? row.city : '—';
  const pin = typeof row.postal_code === 'string' && row.postal_code.trim() ? row.postal_code : '—';
  return { city, pin };
}
