/**
 * Order-based campaign segments.
 * Paid = status NOT IN ('pending','cancelled'). Exclusive: lapsed > repeat > new.
 */

export const CAMPAIGN_SEGMENTS = ['new', 'repeat', 'lapsed'] as const;
export type CampaignSegment = (typeof CAMPAIGN_SEGMENTS)[number];

export const SEGMENT_WINDOW_DAYS = 90;

export type OrderRowForSegment = {
  customer_id: string;
  status: string;
  created_at: string;
};

export type UserRowForSegment = {
  id: string;
  email: string;
  full_name: string | null;
};

export type SegmentMember = {
  userId: string;
  email: string;
  customerName: string;
  segment: CampaignSegment;
};

export type SegmentCounts = Record<CampaignSegment, number>;

const UNPAID = new Set(['pending', 'cancelled']);

export function isPaidOrderStatus(status: string): boolean {
  return !UNPAID.has(status);
}

export function isCampaignSegment(value: unknown): value is CampaignSegment {
  return typeof value === 'string' && (CAMPAIGN_SEGMENTS as readonly string[]).includes(value);
}

type CustomerAgg = {
  lifetimePaid: number;
  paidInWindow: number;
  lastPaidAt: Date;
};

export function classifyCustomer(
  agg: CustomerAgg,
  now: Date = new Date(),
  windowDays: number = SEGMENT_WINDOW_DAYS,
): CampaignSegment | null {
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - windowMs);
  if (agg.lastPaidAt.getTime() < cutoff.getTime()) {
    return 'lapsed';
  }
  if (agg.paidInWindow >= 2) {
    return 'repeat';
  }
  if (agg.lifetimePaid === 1) {
    return 'new';
  }
  return null;
}

export function aggregatePaidOrders(
  orders: OrderRowForSegment[],
  now: Date = new Date(),
  windowDays: number = SEGMENT_WINDOW_DAYS,
): Map<string, CustomerAgg> {
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - windowMs);
  const byCustomer = new Map<string, CustomerAgg>();

  for (const order of orders) {
    if (!isPaidOrderStatus(order.status)) continue;
    const created = new Date(order.created_at);
    if (Number.isNaN(created.getTime())) continue;
    const existing = byCustomer.get(order.customer_id);
    if (!existing) {
      byCustomer.set(order.customer_id, {
        lifetimePaid: 1,
        paidInWindow: created.getTime() >= cutoff.getTime() ? 1 : 0,
        lastPaidAt: created,
      });
      continue;
    }
    existing.lifetimePaid += 1;
    if (created.getTime() >= cutoff.getTime()) {
      existing.paidInWindow += 1;
    }
    if (created.getTime() > existing.lastPaidAt.getTime()) {
      existing.lastPaidAt = created;
    }
  }
  return byCustomer;
}

export function buildSegmentMembers(
  orders: OrderRowForSegment[],
  users: UserRowForSegment[],
  now: Date = new Date(),
  windowDays: number = SEGMENT_WINDOW_DAYS,
): SegmentMember[] {
  const aggs = aggregatePaidOrders(orders, now, windowDays);
  const usersById = new Map(users.map((u) => [u.id, u]));
  const members: SegmentMember[] = [];

  for (const [userId, agg] of aggs) {
    const segment = classifyCustomer(agg, now, windowDays);
    if (!segment) continue;
    const user = usersById.get(userId);
    if (!user) continue;
    const email = user.email.trim().toLowerCase();
    if (!email) continue;
    members.push({
      userId,
      email,
      customerName: (user.full_name ?? '').trim() || 'there',
      segment,
    });
  }
  return members;
}

export function countSegments(members: SegmentMember[]): SegmentCounts {
  const counts: SegmentCounts = { new: 0, repeat: 0, lapsed: 0 };
  for (const m of members) {
    counts[m.segment] += 1;
  }
  return counts;
}

export function listSegmentMembers(
  members: SegmentMember[],
  segment: CampaignSegment,
): SegmentMember[] {
  return members.filter((m) => m.segment === segment);
}

export type OrderUserLoader = {
  loadOrders: () => Promise<OrderRowForSegment[]>;
  loadUsers: (ids: string[]) => Promise<UserRowForSegment[]>;
};

export async function loadSegmentSnapshot(
  loader: OrderUserLoader,
  now: Date = new Date(),
): Promise<{ members: SegmentMember[]; counts: SegmentCounts }> {
  const orders = await loader.loadOrders();
  const customerIds = [...new Set(orders.filter((o) => isPaidOrderStatus(o.status)).map((o) => o.customer_id))];
  const users = customerIds.length === 0 ? [] : await loader.loadUsers(customerIds);
  const members = buildSegmentMembers(orders, users, now);
  return { members, counts: countSegments(members) };
}
