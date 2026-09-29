import { createAdminClient } from '@/lib/supabase/admin';
import { getWallet } from '@/services/wallet-service';
import { getFavorites } from '@/services/favorites-service';
import type { Json } from '@/types/database.types';

export interface UserBehavioralProfile {
  userId: string;
  totalTimeSpentMinutes: number;
  totalSessionsEstimate: number;
  topCategories: Array<{ category: string; count: number; percentage: number }>;
  priceProfile: {
    averageOrderValueINR: number;
    priceElasticity: number;
    budgetBracket: 'budget' | 'mid-tier' | 'premium';
  };
  inAppWalletBalanceINR: number;
  wishlistItems: Array<{ id: string; title: string; price: number; category: string }>;
  recentOrders: Array<{ id: string; status: string; totalAmount: number; placedBy: string; createdAt: string; itemCount: number }>;
  frequentPages: Array<{ path: string; visits: number }>;
  learnedMemories: string[];
}

/**
 * Aggregates user behavioral events, app dwell time, category affinities,
 * order history, favorites, and cross-session AI memories.
 */
export async function getUserBehavioralProfile(userId: string): Promise<UserBehavioralProfile> {
  const adminDb = createAdminClient();

  // 1. Fetch user features if precomputed
  const { data: featureRow } = await adminDb
    .from('user_features')
    .select('features')
    .eq('user_id', userId)
    .maybeSingle();

  const features = (featureRow?.features as any) || {};

  // 2. Fetch behavior events (last 14 days)
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await adminDb
    .from('user_behavior_events')
    .select('event_type, entity_type, metadata, created_at')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1000);

  // Compute dwell time
  let totalDwellMs = 0;
  const pageVisits: Record<string, number> = {};
  const categoryCounts: Record<string, number> = { ...(features.category_affinity || {}) };

  for (const ev of events || []) {
    const meta = (ev.metadata as any) || {};
    if (typeof meta.dwell_time_ms === 'number' && meta.dwell_time_ms > 0) {
      totalDwellMs += Math.min(meta.dwell_time_ms, 30 * 60 * 1000); // cap single dwell at 30m
    }
    if (meta.path && typeof meta.path === 'string') {
      pageVisits[meta.path] = (pageVisits[meta.path] || 0) + 1;
    }
    if (meta.category && typeof meta.category === 'string') {
      categoryCounts[meta.category] = (categoryCounts[meta.category] || 0) + 1;
    }
  }

  const totalTimeSpentMinutes = Math.max(5, Math.round(totalDwellMs / (1000 * 60)));
  const totalSessionsEstimate = Math.max(1, Math.round((events?.length || 10) / 15));

  // Compute category percentages
  const totalCatVisits = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
  const topCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalCatVisits > 0 ? Math.round((count / totalCatVisits) * 100) : 0,
    }));

  // 3. Fetch Wallet Balance
  let inAppWalletBalanceINR = 5000;
  try {
    const wallet = await getWallet(userId);
    inAppWalletBalanceINR = wallet.balance;
  } catch {
    // fallback balance
  }

  // 4. Fetch User Favorites (Wishlist)
  let wishlistItems: Array<{ id: string; title: string; price: number; category: string }> = [];
  try {
    const favItems = await getFavorites(userId);
    wishlistItems = favItems.map((f) => ({
      id: f.product.id,
      title: f.product.title,
      price: Number(f.product.price),
      category: f.product.category,
    }));
  } catch {
    // fallback wishlist
  }

  // 5. Fetch Orders
  const { data: orderRows } = await adminDb
    .from('orders')
    .select('id, status, total_amount, placed_by, created_at, order_items(id)')
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  const recentOrders = (orderRows || []).map((o: any) => ({
    id: o.id,
    status: o.status,
    totalAmount: Number(o.total_amount),
    placedBy: o.placed_by || 'customer',
    createdAt: o.created_at,
    itemCount: Array.isArray(o.order_items) ? o.order_items.length : 1,
  }));

  const totalSpent = recentOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgOrderVal = recentOrders.length > 0 ? Math.round(totalSpent / recentOrders.length) : 2500;
  const elasticity = typeof features.price_elasticity === 'number' ? features.price_elasticity : 0.5;

  let budgetBracket: 'budget' | 'mid-tier' | 'premium' = 'mid-tier';
  if (avgOrderVal > 25000) budgetBracket = 'premium';
  else if (avgOrderVal < 2000) budgetBracket = 'budget';

  // 6. Fetch AI Agent Memories
  const { data: memRows } = await adminDb
    .from('ai_agent_memory')
    .select('content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(6);

  const learnedMemories = (memRows || []).map((m) => m.content).filter(Boolean);

  const frequentPages = Object.entries(pageVisits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([path, visits]) => ({ path, visits }));

  return {
    userId,
    totalTimeSpentMinutes,
    totalSessionsEstimate,
    topCategories,
    priceProfile: {
      averageOrderValueINR: avgOrderVal,
      priceElasticity: elasticity,
      budgetBracket,
    },
    inAppWalletBalanceINR,
    wishlistItems,
    recentOrders,
    frequentPages,
    learnedMemories,
  };
}

/**
 * Saves a new episodic memory or learned preference for the user
 */
export async function recordAgentMemory(userId: string, content: string, metadata?: Json): Promise<void> {
  const adminDb = createAdminClient();
  await adminDb.from('ai_agent_memory').insert({
    user_id: userId,
    session_id: `mem_${Date.now()}`,
    content,
    metadata: metadata || { source: 'agent_learning' },
  });
}

/**
 * Synthesizes the behavioral intelligence profile into a concise system prompt block
 */
export function formatBehavioralMemoryPrompt(profile: UserBehavioralProfile): string {
  const cats = profile.topCategories.length > 0
    ? profile.topCategories.map((c) => `${c.category} (${c.percentage}%)`).join(', ')
    : 'Electronics, Fashion, Home & Kitchen';

  const wish = profile.wishlistItems.length > 0
    ? profile.wishlistItems.map((w) => `"${w.title}" (₹${w.price.toLocaleString('en-IN')})`).slice(0, 3).join(', ')
    : 'None currently';

  const orders = profile.recentOrders.length > 0
    ? profile.recentOrders.map((o) => `#SS-${o.id.slice(0, 6).toUpperCase()} (₹${o.totalAmount.toLocaleString('en-IN')}, ${o.status}${o.placedBy === 'agent' ? ', by Agent' : ''})`).join('; ')
    : 'No recent orders';

  const mems = profile.learnedMemories.length > 0
    ? profile.learnedMemories.map((m) => `- ${m}`).join('\n')
    : '- Customer values quality and fast fulfillment';

  return `
CUSTOMER BEHAVIORAL PROFILE & APP USAGE INTELLIGENCE:
- Time Spent in App: ~${profile.totalTimeSpentMinutes} minutes across ~${profile.totalSessionsEstimate} active browsing sessions.
- Top Category Affinities: ${cats}
- Financial & Price Profile: Average purchase ~₹${profile.priceProfile.averageOrderValueINR.toLocaleString('en-IN')} (${profile.priceProfile.budgetBracket} tier). Price elasticity: ${profile.priceProfile.priceElasticity}.
- In-App Digital Wallet: Current available balance is ₹${profile.inAppWalletBalanceINR.toLocaleString('en-IN')}.
- Active Wishlist / Favorites: ${wish}
- Recent Order History: ${orders}
- Cross-Session Memories & Preferences:
${mems}

AGENT BEHAVIOR DIRECTIVE BASED ON MEMORY:
1. Always align recommendations with the customer's known category affinities and budget tier unless they ask for another category.
2. If the user mentions "buy", "order", or "checkout", remember what product was discussed in recent turns and verify their wallet balance (₹${profile.inAppWalletBalanceINR.toLocaleString('en-IN')}).
3. Never recommend random products outside their requested category or exceeding their specified price limit.
`.trim();
}
