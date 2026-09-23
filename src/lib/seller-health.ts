import type { Product } from '@/types/database.types';

export interface CategoryHealth {
  category: string;
  products: number;
  live: number;
  pending: number;
  rejected: number;
  stockValue: number;
  lowStock: number;
  unitsSold: number;
  revenue: number;
}

export interface ShopHealth {
  live: number;
  pending: number;
  rejected: number;
  lowStock: number;
  orders: number;
  revenue: number;
  categories: CategoryHealth[];
}

export function categoryKey(category: string | null | undefined): string {
  const trimmed = category?.trim();
  return trimmed ? trimmed : 'General';
}

export function buildShopHealth(
  products: Product[],
  sales: Array<{ category: string; quantity: number; revenue: number; orderId: string }>,
): ShopHealth {
  const categories = new Map<string, CategoryHealth>();
  for (const product of products) {
    const key = categoryKey(product.category);
    const row = categories.get(key) ?? {
      category: key,
      products: 0,
      live: 0,
      pending: 0,
      rejected: 0,
      stockValue: 0,
      lowStock: 0,
      unitsSold: 0,
      revenue: 0,
    };
    row.products += 1;
    if (product.approval_status === 'approved') row.live += 1;
    else if (product.approval_status === 'rejected') row.rejected += 1;
    else row.pending += 1;
    row.stockValue += Number(product.price) * Number(product.stock);
    if (product.stock > 0 && product.stock <= 5) row.lowStock += 1;
    categories.set(key, row);
  }
  const orderIds = new Set<string>();
  for (const sale of sales) {
    orderIds.add(sale.orderId);
    const row = categories.get(categoryKey(sale.category));
    if (!row) continue;
    row.unitsSold += sale.quantity;
    row.revenue += sale.revenue;
  }
  const list = Array.from(categories.values()).sort((a, b) => a.category.localeCompare(b.category));
  return {
    live: list.reduce((sum, row) => sum + row.live, 0),
    pending: list.reduce((sum, row) => sum + row.pending, 0),
    rejected: list.reduce((sum, row) => sum + row.rejected, 0),
    lowStock: list.reduce((sum, row) => sum + row.lowStock, 0),
    orders: orderIds.size,
    revenue: list.reduce((sum, row) => sum + row.revenue, 0),
    categories: list,
  };
}
