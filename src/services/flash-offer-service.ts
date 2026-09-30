import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export interface FlashOffer {
  id?: string;
  userId: string;
  couponCode: string;
  discountPercent: number;
  productId: string;
  productTitle: string;
  validUntil: string;
  isExpired: boolean;
  createdAt: string;
}

export interface AbandonedCartRecoveryResult {
  evaluatedEvents: number;
  offersGenerated: number;
  skippedCooldown: number;
  offers: FlashOffer[];
  executedAt: string;
}

/**
 * Scans recent cart additions and product views that were abandoned (>2 hours old)
 * and generates a dynamic time-limited flash offer (5-10% off, 4 hours duration).
 */
export async function evaluateAbandonedCartRecovery(
  supabase: SupabaseClient<Database>
): Promise<AbandonedCartRecoveryResult> {
  const executedAt = new Date().toISOString();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Find cart additions in the 2h - 24h window
  const { data: cartEvents, error: eventErr } = await supabase
    .from('user_behavior_events')
    .select('id, user_id, entity_id, event_type, metadata, created_at')
    .eq('event_type', 'add_to_cart')
    .gte('created_at', twentyFourHoursAgo)
    .lte('created_at', twoHoursAgo)
    .limit(100);

  if (eventErr || !cartEvents || cartEvents.length === 0) {
    return {
      evaluatedEvents: 0,
      offersGenerated: 0,
      skippedCooldown: 0,
      offers: [],
      executedAt,
    };
  }

  // 2. Fetch existing recent flash offers in past 7 days to enforce cooldown
  const userIds = Array.from(new Set(cartEvents.map((e) => e.user_id)));
  const { data: existingOffers } = await supabase
    .from('user_behavior_events')
    .select('user_id, created_at')
    .eq('event_type', 'flash_offer_generated')
    .in('user_id', userIds)
    .gte('created_at', sevenDaysAgo);

  const cooldownUsers = new Set((existingOffers || []).map((o) => o.user_id));

  // 3. Fetch checkouts by these users since 24h ago
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('customer_id, created_at')
    .in('customer_id', userIds)
    .gte('created_at', twentyFourHoursAgo);

  const purchasedUsers = new Set((recentOrders || []).map((o) => o.customer_id));

  const generatedOffers: FlashOffer[] = [];
  let skippedCooldown = 0;

  for (const event of cartEvents) {
    const userId = event.user_id;

    // Skip if already purchased or currently on 7-day cooldown
    if (purchasedUsers.has(userId)) continue;
    if (cooldownUsers.has(userId)) {
      skippedCooldown++;
      continue;
    }

    // Determine target product details
    const productId = event.entity_id;
    const meta = (event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata))
      ? (event.metadata as Record<string, any>)
      : {};

    const productTitle = meta.title || meta.name || 'Your Cart Item';

    // Generate unique code & 4-hour validity
    const discountPercent = 10;
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const couponCode = `FLASH-${discountPercent}-${randomSuffix}`;
    const validUntil = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

    const offer: FlashOffer = {
      userId,
      couponCode,
      discountPercent,
      productId,
      productTitle,
      validUntil,
      isExpired: false,
      createdAt: executedAt,
    };

    // Store in user_behavior_events as an active flash offer record
    const { error: insErr } = await supabase.from('user_behavior_events').insert({
      user_id: userId,
      session_id: 'system_abandoned_cart_engine',
      event_type: 'flash_offer_generated',
      entity_type: 'product',
      entity_id: productId,
      metadata: {
        coupon_code: couponCode,
        discount_percent: discountPercent,
        product_title: productTitle,
        valid_until: validUntil,
        status: 'active',
      },
    });

    if (!insErr) {
      cooldownUsers.add(userId);
      generatedOffers.push(offer);
    }
  }

  return {
    evaluatedEvents: cartEvents.length,
    offersGenerated: generatedOffers.length,
    skippedCooldown,
    offers: generatedOffers,
    executedAt,
  };
}

/**
 * Returns any unexpired active flash offer available for the given user.
 */
export async function getActiveFlashOffer(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<FlashOffer | null> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('user_behavior_events')
    .select('id, entity_id, metadata, created_at')
    .eq('user_id', userId)
    .eq('event_type', 'flash_offer_generated')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const meta = (data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata))
    ? (data.metadata as Record<string, any>)
    : {};

  if (!meta.valid_until || new Date(meta.valid_until).toISOString() <= now) {
    return null; // Expired
  }

  return {
    id: data.id,
    userId,
    couponCode: meta.coupon_code || 'FLASH10',
    discountPercent: meta.discount_percent || 10,
    productId: data.entity_id,
    productTitle: meta.product_title || 'Featured Product',
    validUntil: meta.valid_until,
    isExpired: false,
    createdAt: data.created_at,
  };
}
