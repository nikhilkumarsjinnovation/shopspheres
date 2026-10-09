/**
 * RFM(+C) features and labels from paid order history.
 * Paid status matches campaign segments (not pending/cancelled).
 */

import { isPaidOrderStatus, SEGMENT_WINDOW_DAYS } from '@/services/campaign-segments';

export const CHURN_HORIZON_DAYS = SEGMENT_WINDOW_DAYS;
export const NEXT_PURCHASE_HORIZON_DAYS = 60;
export const RFM_LOOKBACK_DAYS = SEGMENT_WINDOW_DAYS;

export type OrderItemForRfm = {
  product_id: string;
  category: string;
  quantity: number;
  unit_price: number;
};

export type OrderRowForRfm = {
  id: string;
  customer_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: OrderItemForRfm[];
};

export type RfmFeatures = {
  recencyDays: number;
  frequency90d: number;
  monetary90d: number;
  categoryCount90d: number;
};

export type LabeledExample = {
  customerId: string;
  asOf: string;
  features: RfmFeatures;
  label: 0 | 1;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / DAY_MS;
}

export function paidOrdersBefore(orders: OrderRowForRfm[], asOf: Date): OrderRowForRfm[] {
  return orders
    .filter((order) => isPaidOrderStatus(order.status))
    .filter((order) => {
      const created = new Date(order.created_at);
      return !Number.isNaN(created.getTime()) && created.getTime() <= asOf.getTime();
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function buildCustomerOrderTimeline(
  orders: OrderRowForRfm[],
): Map<string, OrderRowForRfm[]> {
  const map = new Map<string, OrderRowForRfm[]>();
  for (const order of orders) {
    if (!isPaidOrderStatus(order.status)) continue;
    const created = new Date(order.created_at);
    if (Number.isNaN(created.getTime())) continue;
    const list = map.get(order.customer_id) ?? [];
    list.push(order);
    map.set(order.customer_id, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
  return map;
}

export function featuresAt(
  customerId: string,
  orders: OrderRowForRfm[],
  asOf: Date,
  lookbackDays: number = RFM_LOOKBACK_DAYS,
): RfmFeatures | null {
  const history = paidOrdersBefore(
    orders.filter((o) => o.customer_id === customerId),
    asOf,
  );
  if (history.length === 0) return null;

  const last = history[history.length - 1];
  const lastAt = new Date(last.created_at);
  const lookbackStart = new Date(asOf.getTime() - lookbackDays * DAY_MS);
  const inWindow = history.filter((o) => new Date(o.created_at).getTime() >= lookbackStart.getTime());
  const categories = new Set<string>();
  let monetary = 0;
  for (const order of inWindow) {
    monetary += Number(order.total_amount) || 0;
    for (const item of order.items ?? []) {
      if (item.category) categories.add(item.category);
    }
  }

  return {
    recencyDays: Math.max(0, daysBetween(lastAt, asOf)),
    frequency90d: inWindow.length,
    monetary90d: monetary,
    categoryCount90d: categories.size,
  };
}

export function labelNextPurchase(
  customerId: string,
  orders: OrderRowForRfm[],
  asOf: Date,
  horizonDays: number = NEXT_PURCHASE_HORIZON_DAYS,
): 0 | 1 {
  const end = new Date(asOf.getTime() + horizonDays * DAY_MS);
  const hit = orders.some((order) => {
    if (order.customer_id !== customerId || !isPaidOrderStatus(order.status)) return false;
    const created = new Date(order.created_at);
    return created.getTime() > asOf.getTime() && created.getTime() <= end.getTime();
  });
  return hit ? 1 : 0;
}

export function labelChurn(
  customerId: string,
  orders: OrderRowForRfm[],
  asOf: Date,
  horizonDays: number = CHURN_HORIZON_DAYS,
): 0 | 1 {
  const end = new Date(asOf.getTime() + horizonDays * DAY_MS);
  const hasOrder = orders.some((order) => {
    if (order.customer_id !== customerId || !isPaidOrderStatus(order.status)) return false;
    const created = new Date(order.created_at);
    return created.getTime() > asOf.getTime() && created.getTime() <= end.getTime();
  });
  return hasOrder ? 0 : 1;
}

export function buildLabeledExamples(
  orders: OrderRowForRfm[],
  asOf: Date,
  task: 'churn' | 'next_purchase',
): LabeledExample[] {
  const timelines = buildCustomerOrderTimeline(orders);
  const examples: LabeledExample[] = [];
  for (const customerId of timelines.keys()) {
    const feats = featuresAt(customerId, orders, asOf);
    if (!feats) continue;
    const label =
      task === 'churn' ? labelChurn(customerId, orders, asOf) : labelNextPurchase(customerId, orders, asOf);
    examples.push({
      customerId,
      asOf: asOf.toISOString(),
      features: feats,
      label,
    });
  }
  return examples;
}

export function featuresToVector(features: RfmFeatures): number[] {
  return [
    features.recencyDays,
    features.frequency90d,
    features.monetary90d,
    features.categoryCount90d,
  ];
}
